package services

import (
	"fmt"
	"strings"
)

// ResolvePathTemplate substitutes {param} placeholders in a path template.
func ResolvePathTemplate(template string, params map[string]string) string {
	out := template
	for k, v := range params {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}
	return out
}

// ResolvePathParamRefs expands $entity_id and $payload.field references in path_params.
func ResolvePathParamRefs(params map[string]string, entityID string, payload map[string]interface{}) map[string]string {
	if len(params) == 0 {
		return params
	}
	out := make(map[string]string, len(params))
	for k, v := range params {
		out[k] = resolveParamRef(v, entityID, payload)
	}
	return out
}

func resolveParamRef(ref, entityID string, payload map[string]interface{}) string {
	ref = strings.TrimSpace(ref)
	if ref == "$entity_id" || ref == "${entity_id}" {
		return entityID
	}
	if strings.HasPrefix(ref, "$payload.") {
		key := strings.TrimPrefix(ref, "$payload.")
		if val, ok := payload[key]; ok && val != nil {
			return fmt.Sprintf("%v", val)
		}
	}
	return ref
}

func pathHasTemplate(path string) bool {
	return strings.Contains(path, "{") && strings.Contains(path, "}")
}
