package blockchain

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	apiKey  string
	devMock bool
	client  *http.Client
}

type AnchorPayload struct {
	EntityType         string `json:"entityType"`
	EntityUID          string `json:"entityUid"`
	Action             string `json:"action"`
	ActorUID           string `json:"actorUid,omitempty"`
	PayloadHash        string `json:"payloadHash"`
	RecordHash         string `json:"recordHash"`
	PreviousRecordHash string `json:"previousRecordHash,omitempty"`
	TenantID           string `json:"tenantId,omitempty"`
}

type AnchorResult struct {
	Success bool   `json:"success"`
	TxID    string `json:"txId"`
	Error   string `json:"error,omitempty"`
	Mock    bool   `json:"mock,omitempty"`
}

func NewClient(baseURL, apiKey string, devMock bool) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		devMock: devMock,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) Anchor(ctx context.Context, payload AnchorPayload) (*AnchorResult, error) {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/anchors/integrity", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		if c.devMock {
			return c.mockAnchor(payload), nil
		}
		return nil, fmt.Errorf("fabric gateway unreachable: %w", err)
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var result AnchorResult
	if err := json.Unmarshal(data, &result); err != nil {
		if c.devMock {
			return c.mockAnchor(payload), nil
		}
		return nil, err
	}
	if !result.Success {
		if c.devMock {
			return c.mockAnchor(payload), nil
		}
		if result.Error == "" {
			result.Error = strings.TrimSpace(string(data))
		}
		return &result, fmt.Errorf("anchor failed: %s", result.Error)
	}
	return &result, nil
}

func (c *Client) mockAnchor(payload AnchorPayload) *AnchorResult {
	sum := sha256.Sum256([]byte(payload.RecordHash + payload.TenantID))
	txID := "dev-mock-" + hex.EncodeToString(sum[:8])
	return &AnchorResult{Success: true, TxID: txID, Mock: true}
}

func (c *Client) Verify(ctx context.Context, tenantID, entityType, entityUID, recordHash string) (bool, string, error) {
	base := fmt.Sprintf("%s/api/v1/anchors/integrity/verify", c.baseURL)
	q := url.Values{}
	if tenantID != "" {
		q.Set("tenantId", tenantID)
	}
	q.Set("entityType", entityType)
	q.Set("entityUid", entityUID)
	q.Set("recordHash", recordHash)
	url := base + "?" + q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, "", err
	}
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		if c.devMock {
			return true, "dev-mock-verify", nil
		}
		return false, "", err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var result struct {
		Found bool   `json:"found"`
		TxID  string `json:"txId"`
	}
	_ = json.Unmarshal(data, &result)
	return result.Found, result.TxID, nil
}

func (c *Client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/health", nil)
	if err != nil {
		return err
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("gateway health check failed: %d", resp.StatusCode)
	}
	return nil
}

func (c *Client) DevMockEnabled() bool { return c.devMock }
