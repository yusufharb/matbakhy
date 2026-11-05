package invoice

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	gen *Generator
}

func NewHandler(gen *Generator) *Handler {
	return &Handler{gen: gen}
}

// GetInvoiceByOrderID handles GET /api/v1/invoices/order/{order_id}
func (h *Handler) GetInvoiceByOrderID(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("order_id")
	if orderID == "" {
		http.Error(w, `{"error": "missing order_id"}`, http.StatusBadRequest)
		return
	}

	inv, err := h.gen.GetInvoiceByOrderID(r.Context(), orderID)
	if err != nil {
		http.Error(w, `{"error": "invoice not found for order"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(inv)
}

// GenerateInvoice handles POST /api/v1/invoices/order/{order_id}/generate
func (h *Handler) GenerateInvoice(w http.ResponseWriter, r *http.Request) {
	orderID := r.PathValue("order_id")
	if orderID == "" {
		http.Error(w, `{"error": "missing order_id"}`, http.StatusBadRequest)
		return
	}

	inv, err := h.gen.GenerateInvoice(r.Context(), orderID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(inv)
}
