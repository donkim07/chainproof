package services

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// API route wordlist — probed only when passive discovery finds nothing.
var apiWordlist = []string{
	"/health", "/healthz", "/ready", "/live", "/status", "/version", "/metrics",
	"/api/health", "/api/healthz", "/api/status", "/api/version",
	"/api/v1", "/api/v2", "/api/v3",
	"/api/users", "/api/user", "/api/auth", "/api/auth/login", "/api/auth/register",
	"/api/login", "/api/register", "/api/logout", "/api/me", "/api/profile",
	"/api/ask", "/ask", "/api/chat", "/chat", "/api/messages",
	"/api/records", "/api/data", "/api/transactions", "/api/orders", "/api/products",
	"/api/employees", "/api/sites", "/api/webhooks",
	"/graphql", "/api/graphql",
	"/auth/login", "/auth/register", "/login", "/register",
	"/admin", "/admin/api", "/internal", "/webhook", "/webhooks", "/hooks",
}

// OpenAPI / Swagger spec paths (JSON/YAML) — checked relative to base and /api prefix.
var openAPISpecPaths = []string{
	"/openapi.json", "/openapi.yaml", "/openapi.yml",
	"/swagger.json", "/swagger.yaml", "/swagger.yml",
	"/api/openapi.json", "/api/swagger.json",
	"/api/v1/openapi.json", "/api/v2/openapi.json", "/api/v3/openapi.json",
	"/api/v1/swagger.json", "/api/v2/swagger.json", "/api/v3/swagger.json",
	"/v1/swagger.json", "/v2/swagger.json", "/v3/swagger.json",
	"/v2/api-docs", "/v3/api-docs", "/api-docs",
	"/api/v2/api-docs", "/api/v3/api-docs",
	"/swagger/v1/swagger.json", "/swagger/v2/swagger.json", "/swagger/v3/swagger.json",
	"/swagger-resources", "/swagger-resources/configuration/ui",
	"/api/swagger-resources", "/api/swagger-resources/configuration/ui",
}

// Swagger UI / ReDoc HTML pages — used to locate linked spec files.
var swaggerUIPaths = []string{
	"/docs", "/api/docs", "/redoc", "/api/redoc",
	"/swagger", "/swagger-ui", "/swagger-ui.html", "/swagger-ui/index.html",
	"/api/swagger", "/api/swagger-ui", "/api/swagger-ui.html", "/api/swagger-ui/index.html",
	"/documentation", "/api/documentation",
}

var jsRoutePatterns = []*regexp.Regexp{
	regexp.MustCompile(`["'](\/api\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`["'](\/v[0-9]+\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`["'](\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`path:\s*["']([^"']+)["']`),
	regexp.MustCompile(`url:\s*["']([^"']+)["']`),
}

var specURLPatterns = []*regexp.Regexp{
	regexp.MustCompile(`url:\s*["']([^"']+\.(?:json|yaml|yml))["']`),
	regexp.MustCompile(`"url"\s*:\s*["']([^"']+)["']`),
	regexp.MustCompile(`spec-url=["']([^"']+)["']`),
	regexp.MustCompile(`href=["']([^"']*(?:openapi|swagger|api-docs)[^"']*)["']`),
}

func (s *SiteService) discoverFromRobots(ctx context.Context, base *url.URL) []string {
	robotsURL := base.Scheme + "://" + base.Host + "/robots.txt"
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, robotsURL, nil)
	resp, err := s.client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if resp != nil {
			resp.Body.Close()
		}
		return nil
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	var paths []string
	for _, line := range strings.Split(string(body), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToLower(line), "allow:") || strings.HasPrefix(strings.ToLower(line), "disallow:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				if p := normalizePath(base, parts[1]); p != "" {
					paths = append(paths, p)
				}
			}
		}
		if strings.HasPrefix(strings.ToLower(line), "sitemap:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				if sm := s.fetchSitemapPaths(ctx, parts[1]); len(sm) > 0 {
					paths = append(paths, sm...)
				}
			}
		}
	}
	return paths
}

func (s *SiteService) fetchSitemapPaths(ctx context.Context, sitemapURL string) []string {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, sitemapURL, nil)
	resp, err := s.client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if resp != nil {
			resp.Body.Close()
		}
		return nil
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	re := regexp.MustCompile(`<loc>([^<]+)</loc>`)
	matches := re.FindAllStringSubmatch(string(body), -1)
	var paths []string
	u, _ := url.Parse(sitemapURL)
	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		if loc, err := url.Parse(m[1]); err == nil {
			if p := normalizePath(u, loc.Path); p != "" {
				paths = append(paths, p)
			}
		}
	}
	return paths
}

func apiPathPrefixes(base *url.URL) []string {
	prefixes := []string{""}
	path := strings.TrimRight(base.Path, "/")
	if path != "" && path != "/" {
		prefixes = append(prefixes, path)
	}
	for _, p := range []string{"/api", "/api/v1", "/api/v2"} {
		found := false
		for _, existing := range prefixes {
			if existing == p || strings.HasSuffix(existing, p) {
				found = true
				break
			}
		}
		if !found {
			prefixes = append(prefixes, p)
		}
	}
	return prefixes
}

func (s *SiteService) discoverFromOpenAPI(ctx context.Context, base *url.URL) []string {
	seenSpecs := map[string]bool{}
	var paths []string

	trySpec := func(specPath string) {
		if seenSpecs[specPath] {
			return
		}
		seenSpecs[specPath] = true
		specURL := base.Scheme + "://" + base.Host + specPath
		body, ok := s.fetchSpecBody(ctx, specURL)
		if !ok {
			return
		}
		paths = append(paths, parseOpenAPIPaths(body)...)
	}

	for _, prefix := range apiPathPrefixes(base) {
		for _, docPath := range openAPISpecPaths {
			trySpec(prefix + docPath)
		}
	}

	for _, prefix := range apiPathPrefixes(base) {
		for _, uiPath := range swaggerUIPaths {
			uiURL := base.Scheme + "://" + base.Host + prefix + uiPath
			for _, specRef := range s.extractSpecRefsFromUI(ctx, uiURL) {
				if strings.HasPrefix(specRef, "http") {
					if u, err := url.Parse(specRef); err == nil && strings.EqualFold(u.Host, base.Host) {
						trySpec(u.Path)
					}
					continue
				}
				trySpec(prefix + specRef)
				if strings.HasPrefix(specRef, "/") {
					trySpec(specRef)
				}
			}
		}
	}

	return uniquePaths(paths)
}

func (s *SiteService) fetchSpecBody(ctx context.Context, specURL string) ([]byte, bool) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, specURL, nil)
	req.Header.Set("Accept", "application/json, application/yaml, text/yaml, */*")
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, false
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if len(body) == 0 {
		return nil, false
	}
	trim := strings.TrimSpace(string(body))
	if strings.HasPrefix(trim, "<") {
		return nil, false
	}
	return body, true
}

func (s *SiteService) extractSpecRefsFromUI(ctx context.Context, uiURL string) []string {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, uiURL, nil)
	req.Header.Set("Accept", "text/html, application/json, */*")
	resp, err := s.client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	text := string(body)

	// Spring swagger-resources returns JSON array of {location: "..."}
	if strings.HasPrefix(strings.TrimSpace(text), "[") || strings.HasPrefix(strings.TrimSpace(text), "{") {
		var resources []map[string]interface{}
		if err := json.Unmarshal(body, &resources); err == nil {
			var refs []string
			for _, r := range resources {
				if loc, ok := r["location"].(string); ok && loc != "" {
					refs = append(refs, loc)
				}
				if urlVal, ok := r["url"].(string); ok && urlVal != "" {
					refs = append(refs, urlVal)
				}
			}
			if len(refs) > 0 {
				return refs
			}
		}
		var cfg map[string]interface{}
		if err := json.Unmarshal(body, &cfg); err == nil {
			if urlVal, ok := cfg["url"].(string); ok {
				return []string{urlVal}
			}
		}
	}

	var refs []string
	seen := map[string]bool{}
	for _, re := range specURLPatterns {
		for _, m := range re.FindAllStringSubmatch(text, -1) {
			if len(m) < 2 || seen[m[1]] {
				continue
			}
			ref := m[1]
			if strings.Contains(ref, "openapi") || strings.Contains(ref, "swagger") ||
				strings.Contains(ref, "api-docs") || strings.HasSuffix(ref, ".json") ||
				strings.HasSuffix(ref, ".yaml") || strings.HasSuffix(ref, ".yml") {
				seen[ref] = true
				refs = append(refs, ref)
			}
		}
	}
	return refs
}

func parseOpenAPIPaths(body []byte) []string {
	var doc map[string]interface{}
	if err := json.Unmarshal(body, &doc); err != nil {
		return nil
	}
	pathsObj, ok := doc["paths"].(map[string]interface{})
	if !ok {
		return nil
	}
	out := make([]string, 0, len(pathsObj))
	for p := range pathsObj {
		if strings.HasPrefix(p, "/") {
			out = append(out, p)
		}
	}
	return out
}

func (s *SiteService) discoverFromJSBundles(ctx context.Context, base *url.URL) []string {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base.String(), nil)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	resp.Body.Close()

	scriptRe := regexp.MustCompile(`<script[^>]+src=["']([^"']+\.js[^"']*)["']`)
	srcs := scriptRe.FindAllStringSubmatch(string(body), -1)
	var paths []string
	seenScripts := map[string]bool{}
	for _, m := range srcs {
		if len(m) < 2 || seenScripts[m[1]] {
			continue
		}
		seenScripts[m[1]] = true
		jsURL := m[1]
		if strings.HasPrefix(jsURL, "/") {
			jsURL = base.Scheme + "://" + base.Host + jsURL
		} else if !strings.HasPrefix(jsURL, "http") {
			continue
		}
		jreq, _ := http.NewRequestWithContext(ctx, http.MethodGet, jsURL, nil)
		jresp, err := s.client.Do(jreq)
		if err != nil || jresp.StatusCode >= 400 {
			if jresp != nil {
				jresp.Body.Close()
			}
			continue
		}
		jsBody, _ := io.ReadAll(io.LimitReader(jresp.Body, 512*1024))
		jresp.Body.Close()
		for _, re := range jsRoutePatterns {
			for _, match := range re.FindAllStringSubmatch(string(jsBody), -1) {
				if len(match) >= 2 {
					if p := normalizePath(base, match[1]); p != "" {
						paths = append(paths, p)
					}
				}
			}
		}
	}
	return uniquePaths(paths)
}

func uniquePaths(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, p := range in {
		if !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	return out
}
