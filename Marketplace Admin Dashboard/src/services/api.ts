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
  suborders: APISuborder[]
}

export interface APISupplierOrg {
  id: string
  type: string
  name: { en: string; ar: string }
  legal_name?: string
  commercial_reg_no?: string
  country_code: string
  status: string
  created_at: string
}

export interface APILedgerAccount {
  id: string
  owner_type: string
  owner_id: string
  currency: string
  account_code: string
  name: string
  is_active: boolean
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
  idempotency_key: string
  posted_at: string
  lines: {
    id: string
    account_id: string
    account_code: string
    account_name: string
    entry_type: 'debit' | 'credit'
    amount: number
  }[]
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

export interface AuthSession {
  token: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    status: string
    locale: string
  }
  role: string
  memberships: {
    id: string
    org_id: string
    org_name: string
    role_name: string
  }[]
}

// Demo Persona Credentials for Development Portal Switching
const PERSONA_CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: 'amal@nexus.market', password: 'NexusPassword2026!' },
  supplier: { email: 'supplier@nourafoods.com', password: 'NexusPassword2026!' },
  merchant: { email: 'buyer@meridian.com', password: 'NexusPassword2026!' },
}

class AuthTokenManager {
  private activePortal: 'admin' | 'supplier' | 'merchant' = 'admin'
  private tokenCache: Record<string, string> = {}

  constructor() {
    // Restore tokens from storage if present
    try {
      const stored = localStorage.getItem('nexus_persona_tokens')
      if (stored) {
        this.tokenCache = JSON.parse(stored)
      }
    } catch {
      this.tokenCache = {}
    }
  }

  setPortal(portal: 'admin' | 'supplier' | 'merchant') {
    this.activePortal = portal
  }

  getPortal(): 'admin' | 'supplier' | 'merchant' {
    return this.activePortal
  }

  setToken(portal: string, token: string | null) {
    if (token) {
      this.tokenCache[portal] = token
    } else {
      delete this.tokenCache[portal]
    }
    try {
      localStorage.setItem('nexus_persona_tokens', JSON.stringify(this.tokenCache))
    } catch {
      // storage unavailable
    }
  }

  getToken(portal: string = this.activePortal): string | null {
    return this.tokenCache[portal] || null
  }

  async acquireTokenForPortal(portal: 'admin' | 'supplier' | 'merchant'): Promise<string> {
    const existing = this.getToken(portal)
    if (existing) return existing

    const creds = PERSONA_CREDENTIALS[portal]
    if (!creds) throw new Error(`Unknown persona portal: ${portal}`)

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })

    if (!res.ok) {
      throw new Error(`Failed to authenticate ${portal} persona`)
    }

    const data: AuthSession = await res.json()
    this.setToken(portal, data.token)
    return data.token
  }
}

export const authManager = new AuthTokenManager()

/**
 * fetchWithAuth wraps standard fetch, attaching Authorization Bearer tokens
 * and handling 401/403 with automatic token refresh for the active persona.
 */
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Ensure token is attached
  let token = authManager.getToken()
  if (!token) {
    try {
      token = await authManager.acquireTokenForPortal(authManager.getPortal())
    } catch (e) {
      console.warn('Could not auto-acquire token:', e)
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, { ...options, headers })

  // Handle Unauthorized (401)
  if (response.status === 401 && retry) {
    // Invalidate cached token and try acquiring a fresh one
    authManager.setToken(authManager.getPortal(), null)
    try {
      await authManager.acquireTokenForPortal(authManager.getPortal())
      return fetchWithAuth(endpoint, options, false)
    } catch {
      throw new Error('Unauthorized (401): Session expired or invalid credentials')
    }
  }

  // Handle Forbidden (403)
  if (response.status === 403) {
    const errBody = await response.json().catch(() => ({ error: 'Forbidden' }))
    throw new Error(errBody.error || 'Forbidden (403): Insufficient permissions')
  }

  return response
}

export const api = {
  // Session & Persona Management
  setPortal(portal: 'admin' | 'supplier' | 'merchant') {
    authManager.setPortal(portal)
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(err.error || 'Login failed')
    }
    const data: AuthSession = await res.json()
    authManager.setToken(authManager.getPortal(), data.token)
    return data
  },

  async register(payload: {
    email: string
    password: string
    first_name: string
    last_name: string
    org_name: string
    org_type: string
  }): Promise<AuthSession> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }))
      throw new Error(err.error || 'Registration failed')
    }
    return res.json()
  },

  async getMe(): Promise<any> {
    const res = await fetchWithAuth('/auth/me')
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json()
  },

  // Products & Offers (Public)
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

  // Checkout & Orders (Protected)
  async checkout(payload: {
    merchant_id?: string
    payment_method: string
    items: { offer_id: string; quantity: number }[]
  }): Promise<{ message: string; parent_order: APIOrder }> {
    const res = await fetchWithAuth('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Checkout failed' }))
      throw new Error(err.error || 'Checkout failed')
    }
    return res.json()
  },

  async getOrders(merchantId?: string): Promise<APIOrder[]> {
    const query = merchantId ? `?merchant_id=${encodeURIComponent(merchantId)}` : ''
    const res = await fetchWithAuth(`/orders${query}`)
    if (!res.ok) throw new Error('Failed to fetch orders')
    const data = await res.json()
    return data.orders || []
  },

  // Supplier Portal APIs (Protected, Role-Scoped)
  async getSupplierOffers(): Promise<APIOffer[]> {
    const res = await fetchWithAuth('/supplier/offers')
    if (!res.ok) throw new Error('Failed to fetch supplier offers')
    const data = await res.json()
    return data.offers || []
  },

  async saveOffer(offer: Partial<APIOffer>): Promise<APIOffer> {
    const res = await fetchWithAuth('/supplier/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    })
    if (!res.ok) throw new Error('Failed to save offer')
    return res.json()
  },

  async getSupplierStock(): Promise<APIStockItem[]> {
    const res = await fetchWithAuth('/inventory/stock')
    if (!res.ok) throw new Error('Failed to fetch stock')
    const data = await res.json()
    return data.stock || []
  },

  async adjustStock(payload: { warehouse_id: string; offer_id: string; adjustment: number; reason: string }): Promise<any> {
    const res = await fetchWithAuth('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to adjust stock')
    return res.json()
  },

  async getSupplierSuborders(): Promise<APISuborder[]> {
    const res = await fetchWithAuth('/supplier/suborders')
    if (!res.ok) throw new Error('Failed to fetch suborders')
    const data = await res.json()
    return data.suborders || []
  },

  async updateSuborderStatus(suborderId: string, status: string): Promise<any> {
    const res = await fetchWithAuth(`/supplier/suborders/${suborderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error('Failed to update status')
    return res.json()
  },

  async getSupplierWallet(): Promise<{
    escrow_pending_cents: number
    available_cents: number
    lifetime_gross_cents: number
    currency: string
  }> {
    const res = await fetchWithAuth('/supplier/wallet')
    if (!res.ok) throw new Error('Failed to fetch wallet')
    return res.json()
  },

  async requestPayout(payload: { amount_cents: number; bank_name: string; iban: string; supplier_id?: string }): Promise<any> {
    const res = await fetchWithAuth('/supplier/payouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to request payout')
    return res.json()
  },

  // Admin APIs (Protected, Super Admin / Platform Admin only)
  async getAdminSuppliers(status?: string): Promise<APISupplierOrg[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await fetchWithAuth(`/admin/suppliers${query}`)
    if (!res.ok) throw new Error('Failed to fetch suppliers')
    const data = await res.json()
    return data.suppliers || []
  },

  async approveSupplier(id: string): Promise<any> {
    const res = await fetchWithAuth(`/admin/suppliers/${id}/approve`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to approve supplier')
    return res.json()
  },

  async rejectSupplier(id: string): Promise<any> {
    const res = await fetchWithAuth(`/admin/suppliers/${id}/reject`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to reject supplier')
    return res.json()
  },

  async getLedgerEntries(): Promise<{ journal_entries: APILedgerEntry[]; integrity_verified: boolean; invariant: string }> {
    const res = await fetchWithAuth('/ledger/entries')
    if (!res.ok) throw new Error('Failed to fetch ledger entries')
    return res.json()
  },

  async getLedgerAccounts(): Promise<APILedgerAccount[]> {
    const res = await fetchWithAuth('/ledger/accounts')
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
    const res = await fetchWithAuth('/admin/audit-logs')
    if (!res.ok) throw new Error('Failed to fetch audit logs')
    const data = await res.json()
    return data.audit_logs || []
  },
}
