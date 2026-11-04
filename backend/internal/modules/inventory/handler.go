package inventory

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

func (h *Handler) ListWarehouses(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	orgID := ""
	if claims != nil && claims.Role != "platform_admin" && claims.Role != "super_admin" {
		orgID = claims.OrgID
	}

	warehouses, err := h.repo.ListWarehouses(r.Context(), orgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"warehouses": warehouses,
		"count":      len(warehouses),
	})
}

func (h *Handler) ListStock(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	orgID := ""
	if claims != nil && claims.Role != "platform_admin" && claims.Role != "super_admin" {
		orgID = claims.OrgID
	}
	if orgID == "" {
		orgID = r.URL.Query().Get("supplier_id")
	}

	stock, err := h.repo.ListStock(r.Context(), orgID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stock": stock,
		"count": len(stock),
	})
}

func (h *Handler) AdjustStock(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	var req StockAdjustmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	userID := ""
	if claims != nil {
		userID = claims.UserID
	}

	item, err := h.repo.AdjustStock(r.Context(), req, userID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Stock adjusted successfully",
		"item":    item,
	})
}
