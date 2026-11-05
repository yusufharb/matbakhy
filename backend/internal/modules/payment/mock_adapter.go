package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type MockGateway struct {
	webhookSecret string
	baseURL       string
}

func NewMockGateway(webhookSecret, baseURL string) *MockGateway {
	if webhookSecret == "" {
		webhookSecret = "mock_webhook_secret_for_testing_only_2026"
	}
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	return &MockGateway{
		webhookSecret: webhookSecret,
		baseURL:       baseURL,
	}
}

func (m *MockGateway) Name() string {
	return "mock"
}

func (m *MockGateway) CreateSession(ctx context.Context, req PaymentSessionRequest) (*PaymentSessionResponse, error) {
	sessionID := "cs_mock_" + uuid.New().String()
	clientSecret := "pi_mock_secret_" + uuid.New().String()
	checkoutURL := fmt.Sprintf("%s/mock-checkout?session_id=%s&order_id=%s&amount=%d", m.baseURL, sessionID, req.OrderID, req.AmountCents)

	return &PaymentSessionResponse{
		SessionID:    sessionID,
		ClientSecret: clientSecret,
		CheckoutURL:  checkoutURL,
		Gateway:      m.Name(),
		Status:       "pending",
	}, nil
}

func (m *MockGateway) VerifyWebhook(r *http.Request, rawBody []byte) (*WebhookEvent, error) {
	sigHeader := r.Header.Get("X-Mock-Signature")
	if sigHeader == "" {
		sigHeader = r.Header.Get("X-Signature")
	}
	if sigHeader == "" {
		return nil, errors.New("missing signature header")
	}

	expectedSig := SignPayload(m.webhookSecret, rawBody)
	if !hmac.Equal([]byte(sigHeader), []byte(expectedSig)) {
		return nil, errors.New("invalid webhook signature")
	}

	type mockWebhookPayload struct {
		ID        string `json:"id"`
		Event     string `json:"event"` // e.g. "payment.succeeded"
		OrderID   string `json:"order_id"`
		Reference string `json:"reference"`
		Amount    int64  `json:"amount"`
		Currency  string `json:"currency"`
	}

	var payload mockWebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse mock webhook payload: %w", err)
	}

	if payload.ID == "" {
		payload.ID = "evt_" + uuid.New().String()
	}
	if payload.Event == "" {
		payload.Event = "payment.succeeded"
	}

	return &WebhookEvent{
		ID:               payload.ID,
		EventType:        payload.Event,
		Gateway:          m.Name(),
		GatewayReference: payload.Reference,
		OrderID:          payload.OrderID,
		AmountCents:      payload.Amount,
		Currency:         payload.Currency,
		OccurredAt:       time.Now().UTC(),
		RawPayload:       rawBody,
	}, nil
}

func (m *MockGateway) Refund(ctx context.Context, gatewayRef string, amountCents int64, reason string) error {
	return nil
}

// SignPayload computes hex-encoded HMAC-SHA256 signature
func SignPayload(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}
