package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/chainproof/baas/internal/hashutil"
)

// BuildIntegrityPayload is the canonical hash input for protected endpoint captures.
// Only the request sent to the client API and the response body are included so
// re-polling the same route with the same body produces a comparable hash.
func BuildIntegrityPayload(reqBody, respBody string) map[string]interface{} {
	return map[string]interface{}{
		"request":  jsonRaw(reqBody),
		"response": jsonRaw(respBody),
	}
}

func EndpointEntityType(path string) string {
	t := strings.TrimPrefix(strings.TrimSpace(path), "/")
	if t == "" {
		return "root"
	}
	return t
}

// PollEntityID returns a stable identity for a protected endpoint invocation.
// Prefer an id from the request body (record_id_field, session_id, id, …);
// otherwise derive a deterministic id from method + path + request body.
func PollEntityID(method, path, reqBody, recordIDField string) string {
	method = strings.ToUpper(strings.TrimSpace(method))
	if recordIDField == "" {
		recordIDField = "id"
	}
	for _, key := range []string{recordIDField, "session_id", "id", "uid", "record_id", "entity_id", "uuid"} {
		if key == "" {
			continue
		}
		if v := jsonStringField(reqBody, key); v != "" {
			return v
		}
	}
	return hashutil.StableID(method, path, reqBody)
}

func jsonStringField(raw, key string) string {
	if raw == "" {
		return ""
	}
	var m map[string]interface{}
	if json.Unmarshal([]byte(raw), &m) != nil {
		return ""
	}
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%v", v))
}

func pollSampleBody(auth SiteAuthSettings, path string) string {
	if body := auth.SampleBodies[path]; body != "" {
		return body
	}
	trimmed := strings.TrimPrefix(path, "/")
	candidates := []string{
		"/api/" + trimmed,
		"/api" + path,
		"/" + strings.TrimPrefix(trimmed, "api/"),
		strings.TrimPrefix(path, "/api"),
	}
	seen := map[string]bool{path: true}
	for _, c := range candidates {
		if c == "" || seen[c] {
			continue
		}
		seen[c] = true
		if body := auth.SampleBodies[c]; body != "" {
			return body
		}
	}
	return ""
}
