package kitchen

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marketplace/core/internal/modules/auth"
)

type Kitchen struct {
	ID               string          `json:"id"`
	OrganizationID   string          `json:"organization_id"`
	KitchenName      json.RawMessage `json:"kitchen_name"`
	ChefName         string          `json:"chef_name"`
	Bio              string          `json:"bio"`
	Governorate      string          `json:"governorate"`
	District         string          `json:"district"`
	AddressLine      string          `json:"address_line"`
	Latitude         *float64        `json:"latitude,omitempty"`
	Longitude        *float64        `json:"longitude,omitempty"`
	DeliveryRadiusKm int             `json:"delivery_radius_km"`
	IsOpen           bool            `json:"is_open"`
	HygieneRating    float64         `json:"hygiene_rating"`
	HygieneBadge     string          `json:"hygiene_badge"`
	DishesCount      int             `json:"dishes_count"`
	CreatedAt        time.Time       `json:"created_at"`
}

type OperatingHour struct {
	ID        string `json:"id"`
	KitchenID string `json:"kitchen_id"`
	DayOfWeek int    `json:"day_of_week"`
	OpenTime  string `json:"open_time"`
	CloseTime string `json:"close_time"`
	IsClosed  bool   `json:"is_closed"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListKitchens(ctx context.Context, district string) ([]Kitchen, error) {
	query := `
		SELECT kp.id, kp.organization_id, o.name as kitchen_name, kp.chef_name,
		       coalesce(kp.bio, ''), kp.governorate, kp.district, kp.address_line,
		       kp.latitude, kp.longitude, kp.delivery_radius_km, kp.is_open,
		       coalesce(kp.hygiene_rating, 4.90), coalesce(kp.hygiene_badge, 'certified_home_kitchen'),
		       kp.created_at,
		       count(DISTINCT so.id) as dishes_count
		FROM kitchen.kitchen_profiles kp
		JOIN iam.organizations o ON o.id = kp.organization_id
		LEFT JOIN catalog.supplier_offers so ON so.supplier_id = o.id AND so.status = 'active'
		WHERE kp.is_open = TRUE
	`
	args := []interface{}{}
	if district != "" {
		args = append(args, "%"+district+"%")
		query += fmt.Sprintf(" AND kp.district ILIKE $%d", len(args))
	}
	query += " GROUP BY kp.id, o.name ORDER BY kp.hygiene_rating DESC, kp.created_at ASC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var kitchens []Kitchen
	for rows.Next() {
		var k Kitchen
		var name []byte
		if err := rows.Scan(
			&k.ID, &k.OrganizationID, &name, &k.ChefName,
			&k.Bio, &k.Governorate, &k.District, &k.AddressLine,
			&k.Latitude, &k.Longitude, &k.DeliveryRadiusKm, &k.IsOpen,
			&k.HygieneRating, &k.HygieneBadge, &k.CreatedAt, &k.DishesCount,
		); err != nil {
			return nil, err
		}
		k.KitchenName = name
		kitchens = append(kitchens, k)
	}
	return kitchens, nil
}

func (r *Repository) GetKitchenByID(ctx context.Context, id string) (*Kitchen, []OperatingHour, error) {
	query := `
		SELECT kp.id, kp.organization_id, o.name as kitchen_name, kp.chef_name,
		       coalesce(kp.bio, ''), kp.governorate, kp.district, kp.address_line,
		       kp.latitude, kp.longitude, kp.delivery_radius_km, kp.is_open,
		       coalesce(kp.hygiene_rating, 4.90), coalesce(kp.hygiene_badge, 'certified_home_kitchen'),
		       kp.created_at,
		       count(DISTINCT so.id) as dishes_count
		FROM kitchen.kitchen_profiles kp
		JOIN iam.organizations o ON o.id = kp.organization_id
		LEFT JOIN catalog.supplier_offers so ON so.supplier_id = o.id AND so.status = 'active'
		WHERE kp.id = $1 OR kp.organization_id = $1
		GROUP BY kp.id, o.name
	`
	var k Kitchen
	var name []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&k.ID, &k.OrganizationID, &name, &k.ChefName,
		&k.Bio, &k.Governorate, &k.District, &k.AddressLine,
		&k.Latitude, &k.Longitude, &k.DeliveryRadiusKm, &k.IsOpen,
		&k.HygieneRating, &k.HygieneBadge, &k.CreatedAt, &k.DishesCount,
	)
	if err != nil {
		return nil, nil, err
	}
	k.KitchenName = name

	// Fetch operating hours
	hRows, err := r.pool.Query(ctx, `
		SELECT id, kitchen_id, day_of_week, to_char(open_time, 'HH24:MI'), to_char(close_time, 'HH24:MI'), is_closed
		FROM kitchen.operating_hours
		WHERE kitchen_id = $1
		ORDER BY day_of_week ASC
	`, k.ID)
	var hours []OperatingHour
	if err == nil {
		defer hRows.Close()
		for hRows.Next() {
			var h OperatingHour
			if err := hRows.Scan(&h.ID, &h.KitchenID, &h.DayOfWeek, &h.OpenTime, &h.CloseTime, &h.IsClosed); err == nil {
				hours = append(hours, h)
			}
		}
	}

	return &k, hours, nil
}

func (r *Repository) SetKitchenStatus(ctx context.Context, orgID string, isOpen bool) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kitchen.kitchen_profiles
		SET is_open = $1, updated_at = NOW()
		WHERE organization_id = $2
	`, isOpen, orgID)
	return err
}

func (r *Repository) UpdateSuborderPrepStatus(ctx context.Context, suborderID, supplierID, status, notes string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE commerce.suborders
		SET prep_status = $1, cook_notes = coalesce($2, cook_notes), updated_at = NOW()
		WHERE id = $3 AND supplier_id = $4
	`, status, notes, suborderID, supplierID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("suborder not found or unauthorized")
	}
	return nil
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListKitchens(w http.ResponseWriter, r *http.Request) {
	district := r.URL.Query().Get("district")
	kitchens, err := h.repo.ListKitchens(r.Context(), district)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"kitchens": kitchens,
		"count":    len(kitchens),
	})
}

func (h *Handler) GetKitchen(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	k, hours, err := h.repo.GetKitchenByID(r.Context(), id)
	if err != nil {
		http.Error(w, `{"error": "kitchen not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"kitchen":         k,
		"operating_hours": hours,
	})
}

func (h *Handler) SetKitchenStatus(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}
	var req struct {
		IsOpen bool `json:"is_open"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid json"}`, http.StatusBadRequest)
		return
	}
	if err := h.repo.SetKitchenStatus(r.Context(), claims.OrgID, req.IsOpen); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"is_open": req.IsOpen,
	})
}

func (h *Handler) UpdateSuborderPrepStatus(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil || claims.OrgID == "" {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}
	suborderID := r.PathValue("id")
	var req struct {
		PrepStatus string `json:"prep_status"`
		CookNotes  string `json:"cook_notes,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid json"}`, http.StatusBadRequest)
		return
	}

	validPrepStatuses := map[string]bool{
		"new":              true,
		"accepted":         true,
		"cooking":          true,
		"ready_for_pickup": true,
		"dispatched":       true,
		"rejected":         true,
	}
	if !validPrepStatuses[req.PrepStatus] {
		http.Error(w, `{"error": "invalid prep_status: must be one of new, accepted, cooking, ready_for_pickup, dispatched, rejected"}`, http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateSuborderPrepStatus(r.Context(), suborderID, claims.OrgID, req.PrepStatus, req.CookNotes); err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "success",
		"prep_status": req.PrepStatus,
	})
}
