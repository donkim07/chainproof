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

var apiWordlist = []string{
	"/", "/health", "/healthz", "/ready", "/live", "/status", "/version", "/metrics",
	"/api", "/api/", "/api/health", "/api/healthz", "/api/status", "/api/version",
	"/api/v1", "/api/v2", "/api/v3",
	"/api/users", "/api/user", "/api/auth", "/api/auth/login", "/api/auth/register",
	"/api/login", "/api/register", "/api/logout", "/api/me", "/api/profile",
	"/api/ask", "/ask", "/api/chat", "/chat", "/api/messages",
	"/api/records", "/api/data", "/api/transactions", "/api/orders", "/api/products",
	"/api/employees", "/api/sites", "/api/webhooks", "/api/integrity/anchor", "/api/integrity/verify",
	"/graphql", "/api/graphql",
	"/swagger", "/swagger-ui", "/swagger-ui.html", "/swagger/index.html",
	"/docs", "/api-docs", "/redoc", "/openapi.json", "/openapi.yaml", "/swagger.json",
	"/v1/swagger.json", "/v2/swagger.json", "/api/swagger.json", "/api/openapi.json",
	"/.well-known/openid-configuration", "/.well-known/security.txt",
	"/robots.txt", "/sitemap.xml",
	"/admin", "/admin/api", "/internal", "/webhook", "/webhooks", "/hooks",
	"/auth/login", "/auth/register", "/login", "/register",
}

var docPaths = []string{
	"/openapi.json", "/openapi.yaml", "/swagger.json", "/api/openapi.json",
	"/v1/swagger.json", "/v2/swagger.json", "/api/swagger.json", "/api-docs",
	"/swagger/v1/swagger.json", "/docs/swagger.json",
}

var jsRoutePatterns = []*regexp.Regexp{
	regexp.MustCompile(`["'](\/api\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`["'](\/v[0-9]+\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`["'](\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\/\{\}]+)["']`),
	regexp.MustCompile(`path:\s*["']([^"']+)["']`),
	regexp.MustCompile(`url:\s*["']([^"']+)["']`),
}

func (s *SiteService) collectDiscoveryCandidates(ctx context.Context, base *url.URL) map[string]string {
	candidates := map[string]string{} // path -> source

	for _, p := range apiWordlist {
		if !shouldSkipPath(p) {
			candidates[p] = "wordlist"
		}
	}

	for _, p := range s.discoverFromHTML(ctx, base) {
		if !shouldSkipPath(p) {
			candidates[p] = "html"
		}
	}

	for _, p := range s.discoverFromRobots(ctx, base) {
		if !shouldSkipPath(p) {
			candidates[p] = "robots"
		}
	}

	for _, p := range s.discoverFromOpenAPI(ctx, base) {
		if !shouldSkipPath(p) {
			candidates[p] = "openapi"
		}
	}

	for _, p := range s.discoverFromJSBundles(ctx, base) {
		if !shouldSkipPath(p) {
			candidates[p] = "javascript"
		}
	}

	return candidates
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

func (s *SiteService) discoverFromOpenAPI(ctx context.Context, base *url.URL) []string {
	var paths []string
	for _, docPath := range docPaths {
		docURL := base.Scheme + "://" + base.Host + docPath
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, docURL, nil)
		req.Header.Set("Accept", "application/json")
		resp, err := s.client.Do(req)
		if err != nil || resp.StatusCode >= 400 {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
		resp.Body.Close()
		paths = append(paths, parseOpenAPIPaths(body)...)
	}
	return uniquePaths(paths)
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
	// Fetch homepage and extract script src URLs, then scan JS for route patterns.
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
