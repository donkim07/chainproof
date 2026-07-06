package hashutil

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// StableID hashes arbitrary parts into a fixed hex id (full sha256).
func StableID(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:])
}
