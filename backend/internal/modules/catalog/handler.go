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

	products, err := h.repo.ListProducts(r.Context(), categoryID, search)
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
	supplierID := ""
	if claims != nil && claims.OrgID != "" {
		supplierID = claims.OrgID
	}
	if supplierID == "" {
		supplierID = r.URL.Query().Get("supplier_id")
	}
	if supplierID == "" {
		// Default to Noura Foods demo supplier
		supplierID = "b0000000-0000-0000-0000-000000000002"
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
	var offer SupplierOffer
	if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
		http.Error(w, `{"error": "Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if claims != nil && claims.OrgID != "" {
		offer.SupplierID = claims.OrgID
	}
	if offer.SupplierID == "" {
		offer.SupplierID = "b0000000-0000-0000-0000-000000000002" // default demo supplier
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
