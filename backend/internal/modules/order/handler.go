package order

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/marketplace/core/internal/modules/auth"
	"github.com/marketplace/core/internal/modules/platform"
)

type Handler struct {
	repo             *Repository
	idempotencyStore *platform.IdempotencyStore
}

func NewHandler(repo *Repository, idempotencyStore ...*platform.IdempotencyStore) *Handler {
	var store *platform.IdempotencyStore
	if len(idempotencyStore) > 0 {
		store = idempotencyStore[0]
	}
	return &Handler{
		repo:             repo,
		idempotencyStore: store,
	}
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Idempotency-Key header is required for checkout", "code": 400}`))
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "Failed to read request body"}`, http.StatusBadRequest)
		return
	}
	requestHash := platform.HashPayload(bodyBytes)

	// Check idempotency cache
	if h.idempotencyStore != nil {
		rec, err := h.idempotencyStore.Get(r.Context(), idempotencyKey, requestHash)
		if err == platform.ErrIdempotencyConflict {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte(`{"error": "Idempotency-Key already used with a different request payload", "code": 409}`))
			return
		}
		if err == nil && rec != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Idempotent-Replay", "true")
			w.WriteHeader(rec.StatusCode)
			w.Write(rec.ResponseBody)
			return
		}
	}

	var req CheckoutRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	// Object-level isolation: Non-admin users can only place orders for their own organization
	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: user does not belong to an active organization"}`, http.StatusForbidden)
			return
		}
		if req.MerchantID != "" && req.MerchantID != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot check out on behalf of another merchant organization"}`, http.StatusForbidden)
			return
		}
		req.MerchantID = claims.OrgID
	} else if req.MerchantID == "" {
		req.MerchantID = claims.OrgID
	}

	order, err := h.repo.ProcessCheckout(r.Context(), req, claims.UserID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	respPayload, _ := json.Marshal(map[string]interface{}{
		"message":      "Order placed successfully with balanced double-entry ledger settlement",
		"parent_order": order,
	})

	if h.idempotencyStore != nil {
		_ = h.idempotencyStore.Save(r.Context(), idempotencyKey, "checkout", claims.UserID, requestHash, http.StatusCreated, respPayload)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(respPayload)
}

func (h *Handler) ListOrders(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	merchantID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		merchantID = r.URL.Query().Get("merchant_id")
	} else {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("merchant_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot view orders of another organization"}`, http.StatusForbidden)
			return
		}
		merchantID = claims.OrgID
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
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	supplierID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		supplierID = r.URL.Query().Get("supplier_id")
	} else if claims.Role == "supplier" || claims.Role == "supplier_admin" || claims.Role == "supplier_staff" {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("supplier_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot access another supplier's suborders"}`, http.StatusForbidden)
			return
		}
		supplierID = claims.OrgID
	} else {
		http.Error(w, `{"error": "Forbidden: insufficient role privileges"}`, http.StatusForbidden)
		return
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
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	id := r.PathValue("id")

	// Object-level authorization: Suppliers can only update their own suborders
	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		so, err := h.repo.GetSuborderByID(r.Context(), id)
		if err != nil {
			http.Error(w, `{"error": "Suborder not found"}`, http.StatusNotFound)
			return
		}
		if so.SupplierID != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot update another supplier's suborder"}`, http.StatusForbidden)
			return
		}
	}

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
