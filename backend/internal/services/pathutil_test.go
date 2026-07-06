package services

import "testing"

func TestResolvePathTemplate(t *testing.T) {
	got := ResolvePathTemplate("/api/users/{user_id}/orders/{order_id}", map[string]string{
		"user_id":  "u1",
		"order_id": "o9",
	})
	want := "/api/users/u1/orders/o9"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolvePathParamRefs(t *testing.T) {
	params := ResolvePathParamRefs(map[string]string{
		"session_id": "$entity_id",
		"tenant":   "$payload.org_slug",
	}, "sess-abc", map[string]interface{}{"org_slug": "acme"})
	if params["session_id"] != "sess-abc" || params["tenant"] != "acme" {
		t.Fatalf("unexpected params: %#v", params)
	}
}
