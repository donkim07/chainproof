package services

import (
	"net"
	"net/url"
	"strings"
)

// isSafeExternalURL validates that raw is a well-formed http(s) URL.
// When allowLocal is false, it additionally rejects localhost and
// private/loopback/link-local IPs to prevent tenants from using the
// scanner to make the server issue requests into its own internal
// network (SSRF). allowLocal should only be true outside production,
// e.g. so developers can register a site running on their own machine.
func isSafeExternalURL(raw string, allowLocal bool) bool {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return false
	}
	if allowLocal {
		return true
	}
	host := strings.ToLower(u.Hostname())
	if host == "localhost" || host == "127.0.0.1" || host == "::1" || strings.HasSuffix(host, ".local") {
		return false
	}
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return false
		}
	}
	return true
}
