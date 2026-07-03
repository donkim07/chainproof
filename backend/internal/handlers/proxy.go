package handlers

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/chainproof/baas/internal/database"
	"github.com/chainproof/baas/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProxyHandler struct {
	sites    *services.SiteService
	platform *database.PlatformDB
}

func NewProxyHandler(sites *services.SiteService, platform *database.PlatformDB) *ProxyHandler {
	return &ProxyHandler{sites: sites, platform: platform}
}

func (h *ProxyHandler) Forward(c *gin.Context) {
	slug, ok := requireOrgSlug(c, h.platform)
	if !ok {
		return
	}
	siteID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site id"})
		return
	}
	site, err := h.sites.Get(c.Request.Context(), slug, siteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "site not found"})
		return
	}
	targetURL, err := url.Parse(site.BaseURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid site target url"})
		return
	}

	path := c.Param("path")
	if path == "" {
		path = "/"
	}
	reqBody := readBody(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewReader(reqBody))

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(targetURL)
			pr.Out.URL.Path = path
			pr.Out.URL.RawQuery = c.Request.URL.RawQuery
			pr.Out.Host = targetURL.Host
			pr.Out.Header.Set("X-ChainProof-Proxy", "true")
		},
		ModifyResponse: func(resp *http.Response) error {
			respBody := readBody(resp.Body)
			resp.Body = io.NopCloser(bytes.NewReader(respBody))
			_ = h.sites.CaptureProxyLog(
				c.Request.Context(),
				slug,
				siteID,
				c.Request.Method,
				path,
				c.Request.URL.RawQuery,
				resp.StatusCode,
				c.Request.Header,
				resp.Header,
				safeText(reqBody),
				safeText(respBody),
				clientIP(c),
			)
			return nil
		},
		ErrorHandler: func(rw http.ResponseWriter, req *http.Request, e error) {
			rw.Header().Set("Content-Type", "application/json")
			rw.WriteHeader(http.StatusBadGateway)
			_, _ = rw.Write([]byte(`{"error":"proxy target unavailable"}`))
		},
	}
	proxy.ServeHTTP(c.Writer, c.Request)
}

func readBody(r io.ReadCloser) []byte {
	if r == nil {
		return nil
	}
	b, _ := io.ReadAll(io.LimitReader(r, 4096))
	_ = r.Close()
	return b
}

func safeText(b []byte) string {
	if len(b) > 2048 {
		return string(b[:2048]) + "...(truncated)"
	}
	return string(b)
}

func clientIP(c *gin.Context) string {
	ip := c.ClientIP()
	if strings.Contains(ip, ",") {
		return strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	return ip
}
