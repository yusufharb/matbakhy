package payment

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
)

type Handler struct {
	repo    *Repository
	gateway PaymentGateway
}

func NewHandler(repo *Repository, gateway PaymentGateway) *Handler {
	return &Handler{
		repo:    repo,
		gateway: gateway,
	}
}

// HandleWebhook processes incoming asynchronous notifications from Stripe, Moyasar, or MockGateway
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "failed to read request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	event, err := h.gateway.VerifyWebhook(r, body)
	if err != nil {
		log.Printf("[Payment Webhook] Signature verification failed: %v\n", err)
		http.Error(w, `{"error": "signature verification failed"}`, http.StatusUnauthorized)
		return
	}

	log.Printf("[Payment Webhook] Verified event %s (%s) for order %s\n", event.ID, event.EventType, event.OrderID)

	switch {
	case strings.Contains(event.EventType, "succeeded") || strings.Contains(event.EventType, "success"):
		if err := h.repo.SettlePaymentWebhook(r.Context(), *event); err != nil {
			log.Printf("[Payment Webhook] Error settling order %s: %v\n", event.OrderID, err)
			http.Error(w, `{"error": "failed to settle payment"}`, http.StatusInternalServerError)
			return
		}
	case strings.Contains(event.EventType, "failed"):
		if err := h.repo.FailPaymentWebhook(r.Context(), *event); err != nil {
			log.Printf("[Payment Webhook] Error failing order %s: %v\n", event.OrderID, err)
			http.Error(w, `{"error": "failed to record payment failure"}`, http.StatusInternalServerError)
			return
		}
	default:
		log.Printf("[Payment Webhook] Unhandled event type: %s\n", event.EventType)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "received",
		"event_id": event.ID,
	})
}

// GetPaymentStatus handles GET /api/v1/payments/{order_id}
func (h *Handler) GetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("order_id")
	if orderID == "" {
		http.Error(w, `{"error": "missing order_id"}`, http.StatusBadRequest)
		return
	}

	payment, err := h.repo.GetPaymentByOrderID(r.Context(), orderID)
	if err != nil {
		http.Error(w, `{"error": "payment record not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payment)
}
