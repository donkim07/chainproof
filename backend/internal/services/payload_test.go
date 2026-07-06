package services

import (
	"testing"

	"github.com/chainproof/baas/internal/hashutil"
)

func TestBuildIntegrityPayloadStable(t *testing.T) {
	p1 := BuildIntegrityPayload(`{"session_id":"abc"}`, `{"answer":"hi"}`)
	p2 := BuildIntegrityPayload(`{"session_id":"abc"}`, `{"answer":"hi"}`)
	h1, err := hashutil.CanonicalHash(p1)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := hashutil.CanonicalHash(p2)
	if err != nil {
		t.Fatal(err)
	}
	if h1 != h2 {
		t.Fatalf("expected stable hash, got %s vs %s", h1, h2)
	}
}

func TestBuildIntegrityPayloadDetectsResponseChange(t *testing.T) {
	before := BuildIntegrityPayload(`{"session_id":"abc"}`, `{"answer":"hi"}`)
	after := BuildIntegrityPayload(`{"session_id":"abc"}`, `{"answer":"hey hi you"}`)
	h1, _ := hashutil.CanonicalHash(before)
	h2, _ := hashutil.CanonicalHash(after)
	if h1 == h2 {
		t.Fatal("expected different hash when response changes")
	}
}

func TestPollEntityIDStable(t *testing.T) {
	id1 := PollEntityID("POST", "/ask", `{}`, "id")
	id2 := PollEntityID("POST", "/ask", `{}`, "id")
	if id1 != id2 {
		t.Fatalf("entity id should be stable: %s vs %s", id1, id2)
	}
}

func TestPollEntityIDFromSession(t *testing.T) {
	body := `{"session_id":"test-session-001","question":"hi"}`
	id := PollEntityID("POST", "/ask", body, "id")
	if id != "test-session-001" {
		t.Fatalf("expected session_id, got %q", id)
	}
}

func TestPollSampleBodyAliases(t *testing.T) {
	auth := SiteAuthSettings{
		SampleBodies: map[string]string{
			"/api/ask": `{"question":"hi"}`,
		},
	}
	if got := pollSampleBody(auth, "/ask"); got == "" {
		t.Fatal("expected sample body via /api alias")
	}
}
