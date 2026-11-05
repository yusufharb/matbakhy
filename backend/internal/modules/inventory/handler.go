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
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	orgID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		orgID = r.URL.Query().Get("org_id")
	} else {
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
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	orgID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		orgID = r.URL.Query().Get("supplier_id")
	} else if claims.Role == "supplier" || claims.Role == "supplier_admin" || claims.Role == "supplier_staff" {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("supplier_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot access another supplier's inventory"}`, http.StatusForbidden)
			return
		}
		orgID = claims.OrgID
	} else {
		http.Error(w, `{"error": "Forbidden: insufficient role privileges"}`, http.StatusForbidden)
		return
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
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	if claims.Role != "platform_admin" && claims.Role != "super_admin" &&
		claims.Role != "supplier_admin" && claims.Role != "supplier" && claims.Role != "supplier_staff" {
		http.Error(w, `{"error": "Forbidden: only suppliers or platform admins can adjust inventory"}`, http.StatusForbidden)
		return
	}

	var req StockAdjustmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	supplierOrgID := ""
	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		supplierOrgID = claims.OrgID
	}

	item, err := h.repo.AdjustStockWithOrgCheck(r.Context(), req, claims.UserID, supplierOrgID)
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
