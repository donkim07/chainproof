package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ScannerService runs optional external discovery tools (ffuf, gobuster, kiterunner).
type ScannerService struct {
	wordlistPath string
	timeout      time.Duration
	maxPaths     int
}

type ScannerToolStatus struct {
	Name      string `json:"name"`
	Available bool   `json:"available"`
	Path      string `json:"path,omitempty"`
	Version   string `json:"version,omitempty"`
}

type ScannerStatus struct {
	Tools        []ScannerToolStatus `json:"tools"`
	WordlistPath string              `json:"wordlist_path"`
	WordlistOK   bool                `json:"wordlist_ok"`
}

func NewScannerService() *ScannerService {
	wl := resolveWordlistPath()
	return &ScannerService{
		wordlistPath: wl,
		timeout:      45 * time.Second,
		maxPaths:     200,
	}
}

func resolveWordlistPath() string {
	candidates := []string{
		"data/wordlists/api-common.txt",
		filepath.Join("backend", "data", "wordlists", "api-common.txt"),
	}
	if _, file, _, ok := runtime.Caller(0); ok {
		root := filepath.Join(filepath.Dir(file), "..", "..", "data", "wordlists", "api-common.txt")
		candidates = append([]string{root}, candidates...)
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return candidates[0]
}

func (sc *ScannerService) Status() ScannerStatus {
	tools := []ScannerToolStatus{
		sc.toolStatus("ffuf"),
		sc.toolStatus("gobuster"),
		sc.toolStatus("kiterunner"),
	}
	_, err := os.Stat(sc.wordlistPath)
	return ScannerStatus{
		Tools:        tools,
		WordlistPath: sc.wordlistPath,
		WordlistOK:   err == nil,
	}
}

func (sc *ScannerService) toolStatus(name string) ScannerToolStatus {
	path, err := exec.LookPath(name)
	if err != nil {
		return ScannerToolStatus{Name: name, Available: false}
	}
	st := ScannerToolStatus{Name: name, Available: true, Path: path}
	out, err := exec.Command(path, "--version").CombinedOutput()
	if err == nil {
		st.Version = strings.TrimSpace(strings.Split(string(out), "\n")[0])
	}
	return st
}

// DiscoverPaths runs available external scanners against baseURL and returns normalized paths.
func (sc *ScannerService) DiscoverPaths(ctx context.Context, base *url.URL) []string {
	if base == nil {
		return nil
	}
	baseURL := strings.TrimRight(base.String(), "/")
	seen := map[string]bool{}
	var paths []string
	add := func(p string) {
		if p = normalizePath(base, p); p != "" && !seen[p] {
			seen[p] = true
			paths = append(paths, p)
		}
	}

	runCtx, cancel := context.WithTimeout(ctx, sc.timeout)
	defer cancel()

	if st := sc.toolStatus("ffuf"); st.Available {
		for _, p := range sc.runFFuf(runCtx, baseURL) {
			add(p)
		}
	}
	if st := sc.toolStatus("gobuster"); st.Available && len(paths) < sc.maxPaths {
		for _, p := range sc.runGobuster(runCtx, baseURL) {
			add(p)
		}
	}
	if st := sc.toolStatus("kiterunner"); st.Available && len(paths) < sc.maxPaths {
		for _, p := range sc.runKiterunner(runCtx, baseURL) {
			add(p)
		}
	}
	if len(paths) > sc.maxPaths {
		paths = paths[:sc.maxPaths]
	}
	return paths
}

func (sc *ScannerService) runFFuf(ctx context.Context, baseURL string) []string {
	// ffuf -u URL/FUZZ -w wordlist -mc 200,401,403 -s -of json
	outFile, err := os.CreateTemp("", "cp-ffuf-*.json")
	if err != nil {
		return nil
	}
	defer os.Remove(outFile.Name())
	outFile.Close()

	cmd := exec.CommandContext(ctx, "ffuf",
		"-u", baseURL+"/FUZZ",
		"-w", sc.wordlistPath,
		"-mc", "200,401,403",
		"-t", "20",
		"-timeout", "8",
		"-s",
		"-of", "json",
		"-o", outFile.Name(),
	)
	_ = cmd.Run()

	data, err := os.ReadFile(outFile.Name())
	if err != nil || len(data) == 0 {
		return sc.parseFFufStdout(ctx, baseURL)
	}
	return parseFFufJSON(data)
}

func (sc *ScannerService) parseFFufStdout(ctx context.Context, baseURL string) []string {
	cmd := exec.CommandContext(ctx, "ffuf",
		"-u", baseURL+"/FUZZ",
		"-w", sc.wordlistPath,
		"-mc", "200,401,403",
		"-t", "15",
		"-s",
	)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var paths []string
	for _, line := range strings.Split(string(out), "\n") {
		if idx := strings.Index(line, baseURL+"/"); idx >= 0 {
			rest := strings.TrimSpace(line[idx+len(baseURL):])
			if p := strings.Fields(rest); len(p) > 0 {
				paths = append(paths, "/"+strings.TrimPrefix(p[0], "/"))
			}
		}
	}
	return paths
}

func parseFFufJSON(data []byte) []string {
	var result struct {
		Results []struct {
			Input map[string]string `json:"input"`
			URL   string            `json:"url"`
		} `json:"results"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}
	var paths []string
	for _, r := range result.Results {
		if fuzz, ok := r.Input["FUZZ"]; ok && fuzz != "" {
			paths = append(paths, "/"+strings.TrimPrefix(fuzz, "/"))
			continue
		}
		if u, err := url.Parse(r.URL); err == nil && u.Path != "" {
			paths = append(paths, u.Path)
		}
	}
	return paths
}

func (sc *ScannerService) runGobuster(ctx context.Context, baseURL string) []string {
	cmd := exec.CommandContext(ctx, "gobuster", "dir",
		"-u", baseURL,
		"-w", sc.wordlistPath,
		"-s", "200,401,403",
		"-q",
		"--no-error",
		"-t", "20",
	)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var paths []string
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) > 0 {
			p := parts[0]
			if !strings.HasPrefix(p, "/") {
				p = "/" + p
			}
			paths = append(paths, p)
		}
	}
	return paths
}

func (sc *ScannerService) runKiterunner(ctx context.Context, baseURL string) []string {
	// kiterunner scan <url> -w routes.kite (if wordlist kite format missing, use brute mode)
	cmd := exec.CommandContext(ctx, "kr", "scan", baseURL,
		"-w", sc.wordlistPath,
		"--fail-status-codes", "404,500,502,503",
		"-x", "20",
	)
	out, err := cmd.CombinedOutput()
	if err != nil && len(out) == 0 {
		cmd = exec.CommandContext(ctx, "kiterunner", "scan", baseURL, "-w", sc.wordlistPath)
		out, _ = cmd.CombinedOutput()
	}
	var paths []string
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "GET") || strings.Contains(line, "POST") {
			parts := strings.Fields(line)
			for _, p := range parts {
				if strings.HasPrefix(p, "/") {
					paths = append(paths, p)
					break
				}
			}
		}
	}
	return paths
}

func (sc *ScannerService) AnyToolAvailable() bool {
	for _, t := range sc.Status().Tools {
		if t.Available {
			return true
		}
	}
	return false
}

func formatScannerNote(tools []ScannerToolStatus) string {
	var names []string
	for _, t := range tools {
		if t.Available {
			names = append(names, t.Name)
		}
	}
	if len(names) == 0 {
		return "no external scanners installed"
	}
	return fmt.Sprintf("scanners: %s", strings.Join(names, ", "))
}
