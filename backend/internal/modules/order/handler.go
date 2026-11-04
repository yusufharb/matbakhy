package order

import (
	"encoding/json"
	"net/http"

	"github.com/marketplace/core/internal/modules/auth"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	userID := ""
	if claims != nil {
		userID = claims.UserID
		if req.MerchantID == "" && claims.OrgID != "" {
			req.MerchantID = claims.OrgID
		}
	}

	order, err := h.repo.ProcessCheckout(r.Context(), req, userID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "Order placed successfully with balanced double-entry ledger settlement",
		"parent_order": order,
	})
}

func (h *Handler) ListOrders(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	merchantID := ""
	if claims != nil && claims.Role != "platform_admin" && claims.Role != "super_admin" {
		merchantID = claims.OrgID
	}
	if merchantID == "" {
		merchantID = r.URL.Query().Get("merchant_id")
	}

	orders, err := h.repo.ListOrders(r.Context(), merchantID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"orders": orders,
		"count":  len(orders),
	})
}

func (h *Handler) ListSupplierSuborders(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	supplierID := ""
	if claims != nil && claims.OrgID != "" {
		supplierID = claims.OrgID
	}
	if supplierID == "" {
		supplierID = r.URL.Query().Get("supplier_id")
	}
	if supplierID == "" {
		supplierID = "b0000000-0000-0000-0000-000000000002" // Noura Foods default
	}

	suborders, err := h.repo.ListSupplierSuborders(r.Context(), supplierID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"supplier_id": supplierID,
		"suborders":   suborders,
		"count":       len(suborders),
	})
}

func (h *Handler) UpdateSuborderStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateSuborderStatus(r.Context(), id, body.Status); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Suborder status updated",
		"id":      id,
		"status":  body.Status,
	})
}
