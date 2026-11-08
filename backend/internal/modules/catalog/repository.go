package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EnrichedProduct struct {
	ID                    string          `json:"id"`
	SKU                   string          `json:"sku"`
	GTIN                  *string         `json:"gtin,omitempty"`
	Name                  json.RawMessage `json:"name"`
	Slug                  json.RawMessage `json:"slug"`
	Description           json.RawMessage `json:"description"`
	BrandID               *string         `json:"brand_id,omitempty"`
	BrandName             *string         `json:"brand_name,omitempty"`
	CategoryID            string          `json:"category_id"`
	CategoryName          json.RawMessage `json:"category_name"`
	Attributes            json.RawMessage `json:"attributes"`
	Status                string          `json:"status"`
	OfferCount            int             `json:"offer_count"`
	MinPrice              int64           `json:"min_price_cents"`
	MaxPrice              int64           `json:"max_price_cents"`
	TotalStock            int             `json:"total_stock"`
	DietaryTags           json.RawMessage `json:"dietary_tags,omitempty"`
	Ingredients           json.RawMessage `json:"ingredients,omitempty"`
	ReheatingInstructions string          `json:"reheating_instructions,omitempty"`
	CreatedAt             time.Time       `json:"created_at"`
}

type EnrichedOffer struct {
	ID                string          `json:"id"`
	SupplierID        string          `json:"supplier_id"`
	SupplierName      string          `json:"supplier_name"`
	SupplierRating    float64         `json:"supplier_rating"`
	Verified          bool            `json:"verified"`
	ProductID         string          `json:"product_id"`
	ProductName       json.RawMessage `json:"product_name,omitempty"`
	ProductSKU        string          `json:"product_sku,omitempty"`
	SupplierSKU       string          `json:"supplier_sku"`
	Currency          string          `json:"currency"`
	PriceCents        int64           `json:"price_cents"`
	MOQ               int             `json:"moq"`
	PriceTiers        json.RawMessage `json:"price_tiers"`
	LeadTimeDays      int             `json:"lead_time_days"`
	Stock             int             `json:"stock"`
	Location          string          `json:"location"`
	PrepLeadHours     int             `json:"prep_lead_hours,omitempty"`
	IsInstant         bool            `json:"is_instant"`
	IsScheduled       bool            `json:"is_scheduled"`
	DailyPortionLimit int             `json:"daily_portion_limit,omitempty"`
	Portions          json.RawMessage `json:"portions,omitempty"`
	Status            string          `json:"status"`
	CreatedAt         time.Time       `json:"created_at"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListProducts(ctx context.Context, categoryID, search, kitchenID string) ([]EnrichedProduct, error) {
	query := `
		SELECT p.id, p.sku, p.gtin, p.name, p.slug, p.description, p.brand_id,
		       b.name as brand_name, p.category_id, c.name as category_name,
		       p.attributes, p.status, p.created_at,
		       count(DISTINCT o.id) as offer_count,
		       coalesce(min(o.price), 0) as min_price,
		       coalesce(max(o.price), 0) as max_price,
		       coalesce(sum(ws.on_hand - ws.reserved), 50) as total_stock,
		       coalesce(p.dietary_tags, '[]'::jsonb),
		       coalesce(p.ingredients, '[]'::jsonb),
		       coalesce(p.reheating_instructions, '')
		FROM catalog.products p
		LEFT JOIN catalog.brands b ON b.id = p.brand_id
		LEFT JOIN catalog.categories c ON c.id = p.category_id
		LEFT JOIN catalog.supplier_offers o ON o.product_id = p.id AND o.status = 'active'
		LEFT JOIN inventory.warehouse_stock ws ON ws.offer_id = o.id
		WHERE p.status = 'approved'
	`
	var args []interface{}
	idx := 1

	if categoryID != "" {
		query += fmt.Sprintf(" AND p.category_id = $%d", idx)
		args = append(args, categoryID)
		idx++
	}
	if kitchenID != "" {
		query += fmt.Sprintf(" AND o.supplier_id = $%d", idx)
		args = append(args, kitchenID)
		idx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (p.name->>'ar' ILIKE $%d OR p.name->>'en' ILIKE $%d OR p.sku ILIKE $%d)", idx, idx, idx)
		args = append(args, "%"+search+"%")
		idx++
	}

	query += " GROUP BY p.id, b.name, c.name ORDER BY p.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []EnrichedProduct
	for rows.Next() {
		var ep EnrichedProduct
		var name, slug, desc, catName, attrs, dietaryTags, ingredients []byte
		if err := rows.Scan(
			&ep.ID, &ep.SKU, &ep.GTIN, &name, &slug, &desc, &ep.BrandID,
			&ep.BrandName, &ep.CategoryID, &catName, &attrs, &ep.Status,
			&ep.CreatedAt, &ep.OfferCount, &ep.MinPrice, &ep.MaxPrice, &ep.TotalStock,
			&dietaryTags, &ingredients, &ep.ReheatingInstructions,
		); err != nil {
			return nil, err
		}
		ep.Name = name
		ep.Slug = slug
		ep.Description = desc
		ep.CategoryName = catName
		ep.Attributes = attrs
		ep.DietaryTags = dietaryTags
		ep.Ingredients = ingredients
		products = append(products, ep)
	}
	return products, nil
}

func (r *Repository) GetProductByID(ctx context.Context, id string) (*EnrichedProduct, error) {
	query := `
		SELECT p.id, p.sku, p.gtin, p.name, p.slug, p.description, p.brand_id,
		       b.name as brand_name, p.category_id, c.name as category_name,
		       p.attributes, p.status, p.created_at,
		       count(DISTINCT o.id) as offer_count,
		       coalesce(min(o.price), 0) as min_price,
		       coalesce(max(o.price), 0) as max_price,
		       coalesce(sum(ws.on_hand - ws.reserved), 50) as total_stock,
		       coalesce(p.dietary_tags, '[]'::jsonb),
		       coalesce(p.ingredients, '[]'::jsonb),
		       coalesce(p.reheating_instructions, '')
		FROM catalog.products p
		LEFT JOIN catalog.brands b ON b.id = p.brand_id
		LEFT JOIN catalog.categories c ON c.id = p.category_id
		LEFT JOIN catalog.supplier_offers o ON o.product_id = p.id AND o.status = 'active'
		LEFT JOIN inventory.warehouse_stock ws ON ws.offer_id = o.id
		WHERE p.id = $1
		GROUP BY p.id, b.name, c.name
	`
	var ep EnrichedProduct
	var name, slug, desc, catName, attrs, dietaryTags, ingredients []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ep.ID, &ep.SKU, &ep.GTIN, &name, &slug, &desc, &ep.BrandID,
		&ep.BrandName, &ep.CategoryID, &catName, &attrs, &ep.Status,
		&ep.CreatedAt, &ep.OfferCount, &ep.MinPrice, &ep.MaxPrice, &ep.TotalStock,
		&dietaryTags, &ingredients, &ep.ReheatingInstructions,
	)
	if err != nil {
		return nil, err
	}
	ep.Name = name
	ep.Slug = slug
	ep.Description = desc
	ep.CategoryName = catName
	ep.Attributes = attrs
	ep.DietaryTags = dietaryTags
	ep.Ingredients = ingredients
	return &ep, nil
}

func (r *Repository) ListOffersForProduct(ctx context.Context, productID string) ([]EnrichedOffer, error) {
	query := `
		SELECT o.id, o.supplier_id, 
		       coalesce(org.legal_name, org.name->>'en') as supplier_name,
		       o.product_id, coalesce(o.supplier_sku, '') as supplier_sku,
		       o.currency, o.price, o.moq, coalesce(o.price_tiers, '[]'::jsonb),
		       o.lead_time_days, o.status, o.created_at,
		       coalesce(sum(ws.on_hand - ws.reserved), 20) as available_stock,
		       coalesce(w.city, 'Cairo') as location,
		       coalesce(o.prep_lead_hours, 4),
		       coalesce(o.is_instant, false),
		       coalesce(o.is_scheduled, true),
		       coalesce(o.daily_portion_limit, 20),
		       coalesce(o.portions, '[]'::jsonb)
		FROM catalog.supplier_offers o
		JOIN iam.organizations org ON org.id = o.supplier_id
		LEFT JOIN inventory.warehouse_stock ws ON ws.offer_id = o.id
		LEFT JOIN inventory.warehouses w ON w.id = ws.warehouse_id
		WHERE o.product_id = $1 AND o.status = 'active'
		GROUP BY o.id, org.legal_name, org.name, w.city, o.prep_lead_hours, o.is_instant, o.is_scheduled, o.daily_portion_limit, o.portions
		ORDER BY o.price ASC
	`
	rows, err := r.pool.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var offers []EnrichedOffer
	for rows.Next() {
		var o EnrichedOffer
		var tiers, portions []byte
		if err := rows.Scan(
			&o.ID, &o.SupplierID, &o.SupplierName, &o.ProductID, &o.SupplierSKU,
			&o.Currency, &o.PriceCents, &o.MOQ, &tiers, &o.LeadTimeDays, &o.Status,
			&o.CreatedAt, &o.Stock, &o.Location,
			&o.PrepLeadHours, &o.IsInstant, &o.IsScheduled, &o.DailyPortionLimit, &portions,
		); err != nil {
			return nil, err
		}
		o.PriceTiers = tiers
		o.Portions = portions
		o.SupplierRating = 4.9
		o.Verified = true
		offers = append(offers, o)
	}
	return offers, nil
}

func (r *Repository) ListSupplierOffers(ctx context.Context, supplierID string) ([]EnrichedOffer, error) {
	query := `
		SELECT o.id, o.supplier_id, org.legal_name as supplier_name,
		       o.product_id, p.name as product_name, p.sku as product_sku,
		       coalesce(o.supplier_sku, '') as supplier_sku,
		       o.currency, o.price, o.moq, coalesce(o.price_tiers, '[]'::jsonb),
		       o.lead_time_days, o.status, o.created_at,
		       coalesce(sum(ws.on_hand - ws.reserved), 20) as available_stock,
		       coalesce(min(w.city), 'Cairo') as location,
		       coalesce(o.prep_lead_hours, 4),
		       coalesce(o.is_instant, false),
		       coalesce(o.is_scheduled, true),
		       coalesce(o.daily_portion_limit, 20),
		       coalesce(o.portions, '[]'::jsonb)
		FROM catalog.supplier_offers o
		JOIN iam.organizations org ON org.id = o.supplier_id
		JOIN catalog.products p ON p.id = o.product_id
		LEFT JOIN inventory.warehouse_stock ws ON ws.offer_id = o.id
		LEFT JOIN inventory.warehouses w ON w.id = ws.warehouse_id
		WHERE o.supplier_id = $1
		GROUP BY o.id, org.legal_name, p.name, p.sku, o.prep_lead_hours, o.is_instant, o.is_scheduled, o.daily_portion_limit, o.portions
		ORDER BY o.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var offers []EnrichedOffer
	for rows.Next() {
		var o EnrichedOffer
		var tiers, prodName, portions []byte
		if err := rows.Scan(
			&o.ID, &o.SupplierID, &o.SupplierName, &o.ProductID, &prodName, &o.ProductSKU,
			&o.SupplierSKU, &o.Currency, &o.PriceCents, &o.MOQ, &tiers, &o.LeadTimeDays, &o.Status,
			&o.CreatedAt, &o.Stock, &o.Location,
			&o.PrepLeadHours, &o.IsInstant, &o.IsScheduled, &o.DailyPortionLimit, &portions,
		); err != nil {
			return nil, err
		}
		o.ProductName = prodName
		o.PriceTiers = tiers
		o.Portions = portions
		offers = append(offers, o)
	}
	return offers, nil
}

func (r *Repository) CreateOrUpdateOffer(ctx context.Context, offer SupplierOffer) (*SupplierOffer, error) {
	if offer.ID == "" {
		offer.ID = uuid.New().String()
	}
	query := `
		INSERT INTO catalog.supplier_offers (
			id, supplier_id, product_id, supplier_sku, currency, price, moq, price_tiers, lead_time_days, status
		) VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, $8, 'active')
		ON CONFLICT (supplier_id, product_id, variant_id) DO UPDATE SET
			price = EXCLUDED.price,
			moq = EXCLUDED.moq,
			price_tiers = EXCLUDED.price_tiers,
			lead_time_days = EXCLUDED.lead_time_days,
			updated_at = NOW()
		RETURNING id, supplier_id, product_id, supplier_sku, currency, price, moq, price_tiers, lead_time_days, status
	`
	var o SupplierOffer
	var tiers []byte
	err := r.pool.QueryRow(
		ctx, query, offer.ID, offer.SupplierID, offer.ProductID, offer.SupplierSKU,
		offer.PriceCents, offer.MOQ, offer.PriceTiers, offer.LeadTimeDays,
	).Scan(
		&o.ID, &o.SupplierID, &o.ProductID, &o.SupplierSKU, &o.Currency,
		&o.PriceCents, &o.MOQ, &tiers, &o.LeadTimeDays, &o.Status,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save offer: %w", err)
	}
	o.PriceTiers = tiers
	return &o, nil
}
