package catalog

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

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	categoryID := r.URL.Query().Get("category_id")
	search := r.URL.Query().Get("search")
	kitchenID := r.URL.Query().Get("kitchen_id")

	products, err := h.repo.ListProducts(r.Context(), categoryID, search, kitchenID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"products": products,
		"count":    len(products),
	})
}

func (h *Handler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	product, err := h.repo.GetProductByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error": "Product not found"}`, http.StatusNotFound)
		return
	}

	offers, _ := h.repo.ListOffersForProduct(r.Context(), id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"product": product,
		"offers":  offers,
	})
}

func (h *Handler) ListProductOffers(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("id")
	offers, err := h.repo.ListOffersForProduct(r.Context(), productID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"product_id": productID,
		"offers":     offers,
		"count":      len(offers),
	})
}

func (h *Handler) ListSupplierOffers(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	supplierID := ""
	if claims.Role == "platform_admin" || claims.Role == "super_admin" {
		supplierID = r.URL.Query().Get("supplier_id")
		if supplierID == "" {
			http.Error(w, `{"error": "supplier_id query parameter is required for administrator"}`, http.StatusBadRequest)
			return
		}
	} else if claims.Role == "supplier" || claims.Role == "supplier_admin" || claims.Role == "supplier_staff" {
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		requested := r.URL.Query().Get("supplier_id")
		if requested != "" && requested != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot access another supplier's offers"}`, http.StatusForbidden)
			return
		}
		supplierID = claims.OrgID
	} else {
		http.Error(w, `{"error": "Forbidden: insufficient role privileges"}`, http.StatusForbidden)
		return
	}

	offers, err := h.repo.ListSupplierOffers(r.Context(), supplierID)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"supplier_id": supplierID,
		"offers":      offers,
		"count":       len(offers),
	})
}

func (h *Handler) SaveOffer(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.UserID == "" {
		http.Error(w, `{"error": "Unauthorized: authentication required"}`, http.StatusUnauthorized)
		return
	}

	var offer SupplierOffer
	if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if claims.Role != "platform_admin" && claims.Role != "super_admin" {
		if claims.Role != "supplier" && claims.Role != "supplier_admin" && claims.Role != "supplier_staff" {
			http.Error(w, `{"error": "Forbidden: only suppliers can create or modify offers"}`, http.StatusForbidden)
			return
		}
		if claims.OrgID == "" {
			http.Error(w, `{"error": "Forbidden: supplier organization required"}`, http.StatusForbidden)
			return
		}
		if offer.SupplierID != "" && offer.SupplierID != claims.OrgID {
			http.Error(w, `{"error": "Forbidden: cannot create offers for another supplier"}`, http.StatusForbidden)
			return
		}
		offer.SupplierID = claims.OrgID
	} else if offer.SupplierID == "" {
		http.Error(w, `{"error": "supplier_id is required"}`, http.StatusBadRequest)
		return
	}

	saved, err := h.repo.CreateOrUpdateOffer(r.Context(), offer)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saved)
}
