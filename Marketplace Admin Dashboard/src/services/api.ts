const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export interface APIProduct {
  id: string
  sku: string
  gtin?: string
  name: { en: string; ar: string }
  slug: { en: string; ar: string }
  description: { en: string; ar: string }
  brand_id?: string
  brand_name?: string
  category_id: string
  category_name: { en: string; ar: string }
  attributes: Record<string, string>
  status: string
  offer_count: number
  min_price_cents: number
  max_price_cents: number
  total_stock: number
}

export interface APIOffer {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_rating: number
  verified: boolean
  product_id: string
  product_name?: { en: string; ar: string }
  product_sku?: string
  supplier_sku: string
  currency: string
  price_cents: number
  moq: number
  price_tiers: { minQty: number; maxQty: number | string; price: number }[]
  lead_time_days: number
  stock: number
  location: string
  status: string
}

export interface APISuborder {
  id: string
  suborder_number: string
  parent_order_id: string
  supplier_id: string
  supplier_name: string
  subtotal_cents: number
  shipping_cents: number
  commission_rate: number
  commission_cents: number
  supplier_payable: number
  status: string
  items?: {
    id: string
    offer_id: string
    quantity: number
    unit_price_cents: number
    total_price_cents: number
  }[]
}

export interface APIOrder {
  id: string
  order_number: string
  merchant_id: string
  currency: string
  subtotal_cents: number
  shipping_cents: number
  grand_total_cents: number
  status: string
  payment_method: string
  created_at: string
  suborders?: APISuborder[]
}

export interface APISupplierOrg {
  id: string
  type: string
  name: { en: string; ar: string }
  legal_name: string
  commercial_reg_no: string
  country_code: string
  status: string
  created_at: string
}

export interface APILedgerEntry {
  id: string
  entry_number: string
  reference_type: string
  reference_id: string
  action: string
  description: string
  currency: string
  status: string
  posted_at: string
  lines: {
    id: string
    account_id: string
    entry_type: 'debit' | 'credit'
    amount: number
  }[]
}

export interface APILedgerAccount {
  id: string
  owner_type: string
  owner_id: string
  account_code: string
  name: string
  currency: string
  balance_cents: number
}

export interface APIStockItem {
  id: string
  warehouse_id: string
  warehouse_code: string
  warehouse_name: string
  city: string
  offer_id: string
  supplier_sku: string
  product_name: { en: string; ar: string }
  product_sku: string
  on_hand: number
  reserved: number
  available: number
  reorder_threshold: number
}

export interface APICMSSection {
  id: string
  name: string
  section_type: string
  sort_order: number
  is_active: boolean
  content_en: any
  content_ar: any
}

export interface APIAuditLog {
  id: string
  actor_name: string
  actor_role: string
  action: string
  target_resource: string
  origin_ip: string
  proof_hash: string
  created_at: string
}

export const api = {
  // Products & Offers
  async getProducts(): Promise<APIProduct[]> {
    const res = await fetch(`${API_BASE_URL}/products`)
    if (!res.ok) throw new Error('Failed to fetch products')
    const data = await res.json()
    return data.products || []
  },

  async getProductOffers(productId: string): Promise<APIOffer[]> {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/offers`)
    if (!res.ok) throw new Error('Failed to fetch offers')
    const data = await res.json()
    return data.offers || []
  },

  // Checkout & Orders
  async checkout(payload: {
    merchant_id?: string
    payment_method: string
    items: { offer_id: string; quantity: number }[]
  }): Promise<{ message: string; parent_order: APIOrder }> {
    const res = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Checkout failed' }))
      throw new Error(err.error || 'Checkout failed')
    }
    return res.json()
  },

  async getOrders(merchantId?: string): Promise<APIOrder[]> {
    const url = merchantId ? `${API_BASE_URL}/orders?merchant_id=${merchantId}` : `${API_BASE_URL}/orders`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch orders')
    const data = await res.json()
    return data.orders || []
  },

  // Supplier Portal APIs
  async getSupplierOffers(supplierId = 'b0000000-0000-0000-0000-000000000002'): Promise<APIOffer[]> {
    const res = await fetch(`${API_BASE_URL}/supplier/offers?supplier_id=${supplierId}`)
    if (!res.ok) throw new Error('Failed to fetch supplier offers')
    const data = await res.json()
    return data.offers || []
  },

  async getSupplierStock(supplierId = 'b0000000-0000-0000-0000-000000000002'): Promise<APIStockItem[]> {
    const res = await fetch(`${API_BASE_URL}/inventory/stock?supplier_id=${supplierId}`)
    if (!res.ok) throw new Error('Failed to fetch stock')
    const data = await res.json()
    return data.stock || []
  },

  async adjustStock(payload: { warehouse_id: string; offer_id: string; adjustment: number; reason: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to adjust stock')
    return res.json()
  },

  async getSupplierSuborders(supplierId = 'b0000000-0000-0000-0000-000000000002'): Promise<APISuborder[]> {
    const res = await fetch(`${API_BASE_URL}/supplier/suborders?supplier_id=${supplierId}`)
    if (!res.ok) throw new Error('Failed to fetch suborders')
    const data = await res.json()
    return data.suborders || []
  },

  async updateSuborderStatus(suborderId: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/supplier/suborders/${suborderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error('Failed to update status')
    return res.json()
  },

  async getSupplierWallet(supplierId = 'b0000000-0000-0000-0000-000000000002'): Promise<{
    escrow_pending_cents: number
    available_cents: number
    lifetime_gross_cents: number
    currency: string
  }> {
    const res = await fetch(`${API_BASE_URL}/supplier/wallet?supplier_id=${supplierId}`)
    if (!res.ok) throw new Error('Failed to fetch wallet')
    return res.json()
  },

  async requestPayout(payload: { supplier_id?: string; amount_cents: number; bank_name: string; iban: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/supplier/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to request payout')
    return res.json()
  },

  // Admin APIs
  async getAdminSuppliers(status?: string): Promise<APISupplierOrg[]> {
    const url = status ? `${API_BASE_URL}/admin/suppliers?status=${status}` : `${API_BASE_URL}/admin/suppliers`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch suppliers')
    const data = await res.json()
    return data.suppliers || []
  },

  async approveSupplier(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/suppliers/${id}/approve`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to approve supplier')
    return res.json()
  },

  async rejectSupplier(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/suppliers/${id}/reject`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to reject supplier')
    return res.json()
  },

  async getLedgerEntries(): Promise<{ journal_entries: APILedgerEntry[]; integrity_verified: boolean; invariant: string }> {
    const res = await fetch(`${API_BASE_URL}/ledger/entries`)
    if (!res.ok) throw new Error('Failed to fetch ledger entries')
    return res.json()
  },

  async getLedgerAccounts(): Promise<APILedgerAccount[]> {
    const res = await fetch(`${API_BASE_URL}/ledger/accounts`)
    if (!res.ok) throw new Error('Failed to fetch ledger accounts')
    const data = await res.json()
    return data.accounts || []
  },

  async getCMSSections(): Promise<APICMSSection[]> {
    const res = await fetch(`${API_BASE_URL}/cms/sections`)
    if (!res.ok) throw new Error('Failed to fetch CMS sections')
    const data = await res.json()
    return data.sections || []
  },

  async getAuditLogs(): Promise<APIAuditLog[]> {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs`)
    if (!res.ok) throw new Error('Failed to fetch audit logs')
    const data = await res.json()
    return data.audit_logs || []
  },
}
