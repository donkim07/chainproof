package hashutil

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
)

func CanonicalHash(payload map[string]interface{}) (string, error) {
	canonical, err := canonicalJSON(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:]), nil
}

func RecordHash(entityType, entityID, payloadHash, previousHash string) string {
	data := entityType + "|" + entityID + "|" + payloadHash
	if previousHash != "" {
		data += "|" + previousHash
	}
	sum := sha256.Sum256([]byte(data))
	return hex.EncodeToString(sum[:])
}

func canonicalJSON(v map[string]interface{}) (string, error) {
	normalized := normalizeMap(v)
	b, err := json.Marshal(normalized)
	return string(b), err
}

func normalizeMap(m map[string]interface{}) map[string]interface{} {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make(map[string]interface{}, len(m))
	for _, k := range keys {
		out[k] = normalizeValue(m[k])
	}
	return out
}

func normalizeValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		return normalizeMap(val)
	case []interface{}:
		norm := make([]interface{}, len(val))
		for i, item := range val {
			norm[i] = normalizeValue(item)
		}
		return norm
	default:
		return val
	}
}
