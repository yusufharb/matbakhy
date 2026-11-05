import type {
  B2BReceivingWarehouse,
  B2BTeamMember,
  B2BKYCDocument,
  B2BCorporateProfile,
  B2CCustomerAddress,
  WalletAccount,
  LedgerTransaction,
  ContextOption,
} from "../types"

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1"

export interface BilingualText {
  en: string

  ar: string
}

export interface PriceTier {
  minQty: number

  maxQty: number | string

  price: number
}

export interface APIProduct {
  id: string

  sku: string

  gtin?: string

  name: BilingualText

  slug: BilingualText

  description: BilingualText

  brand_id?: string

  brand_name?: string

  category_id: string

  category_name: BilingualText

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

  product_name?: BilingualText

  product_sku?: string

  supplier_sku: string

  currency: string

  price_cents: number

  moq: number

  price_tiers: PriceTier[]

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

  name: BilingualText

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

    entry_type: "debit" | "credit"

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

  product_name: BilingualText

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

const isDev = Boolean(import.meta.env.DEV)

interface PersonaCredential {
  email: string

  password: string
}

// Demo Persona Credentials for Development Portal Switching (stripped from production builds)

const PERSONA_CREDENTIALS: Record<string, PersonaCredential> = isDev
  ? {
      admin: { email: "amal@nexus.market", password: "NexusPassword2026!" },

      supplier: {
        email: "supplier@nourafoods.com",

        password: "NexusPassword2026!",
      },

      merchant: {
        email: "buyer@meridian.com",

        password: "NexusPassword2026!",
      },
    }
  : {}

class AuthTokenManager {
  private activePortal: "admin" | "supplier" | "merchant" = "admin"

  private tokenCache: Record<string, string> = {}

  constructor() {
    // Restore tokens from storage if present

    try {
      const stored = localStorage.getItem("nexus_persona_tokens")

      if (stored) {
        this.tokenCache = JSON.parse(stored)
      }
    } catch {
      this.tokenCache = {}
    }
  }

  setPortal(portal: "admin" | "supplier" | "merchant") {
    this.activePortal = portal
  }

  getPortal(): "admin" | "supplier" | "merchant" {
    return this.activePortal
  }

  setToken(portal: string, token: string | null) {
    if (token) {
      this.tokenCache[portal] = token
    } else {
      delete this.tokenCache[portal]
    }

    try {
      localStorage.setItem(
        "nexus_persona_tokens",

        JSON.stringify(this.tokenCache),
      )
    } catch {
      // storage unavailable
    }
  }

  getToken(portal: string = this.activePortal): string | null {
    return this.tokenCache[portal] || null
  }

  async acquireTokenForPortal(
    portal: "admin" | "supplier" | "merchant",
  ): Promise<string> {
    if (!isDev) {
      throw new Error(
        "Auto-login persona credentials are restricted to development builds. Please log in explicitly.",
      )
    }

    const existing = this.getToken(portal)

    if (existing) return existing

    const creds = PERSONA_CREDENTIALS[portal]

    if (!creds) throw new Error(`Unknown persona portal: ${portal}`)

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },

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

  retry = true,
): Promise<Response> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`

  const headers = new Headers(options.headers || {})

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  // Ensure token is attached

  let token = authManager.getToken()

  if (!token) {
    try {
      token = await authManager.acquireTokenForPortal(authManager.getPortal())
    } catch (e) {
      console.warn("Could not auto-acquire token:", e)
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
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
      throw new Error(
        "Unauthorized (401): Session expired or invalid credentials",
      )
    }
  }

  // Handle Forbidden (403)

  if (response.status === 403) {
    const errBody = await response.json().catch(() => ({ error: "Forbidden" }))

    throw new Error(
      errBody.error || "Forbidden (403): Insufficient permissions",
    )
  }

  return response
}

export interface CheckoutItemInput {
  offer_id: string

  quantity: number
}

export interface CheckoutResult {
  message: string

  parent_order: APIOrder
}

export const api = {
  // Session & Persona Management

  setPortal(portal: "admin" | "supplier" | "merchant") {
    authManager.setPortal(portal)
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }))

      throw new Error(err.error || "Login failed")
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
      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res

        .json()

        .catch(() => ({ error: "Registration failed" }))

      throw new Error(err.error || "Registration failed")
    }

    return res.json()
  },

  async getMe(): Promise<any> {
    const res = await fetchWithAuth("/auth/me")

    if (!res.ok) throw new Error("Failed to fetch profile")

    return res.json()
  },

  // Products & Offers (Public)

  async getProducts(): Promise<APIProduct[]> {
    const res = await fetch(`${API_BASE_URL}/products`)

    if (!res.ok) throw new Error("Failed to fetch products")

    const data = await res.json()

    return data.products || []
  },

  async getProductOffers(productId: string): Promise<APIOffer[]> {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/offers`)

    if (!res.ok) throw new Error("Failed to fetch offers")

    const data = await res.json()

    return data.offers || []
  },

  // Checkout & Orders (Protected)

  async checkout(payload: {
    merchant_id?: string

    payment_method: string

    items: CheckoutItemInput[]
  }): Promise<CheckoutResult> {
    const res = await fetchWithAuth("/checkout", {
      method: "POST",

      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Checkout failed" }))

      throw new Error(err.error || "Checkout failed")
    }

    return res.json()
  },

  async getOrders(merchantId?: string): Promise<APIOrder[]> {
    const query = merchantId
      ? `?merchant_id=${encodeURIComponent(merchantId)}`
      : ""

    const res = await fetchWithAuth(`/orders${query}`)

    if (!res.ok) throw new Error("Failed to fetch orders")

    const data = await res.json()

    return data.orders || []
  },

  // Supplier Portal APIs (Protected, Role-Scoped)

  async getSupplierOffers(): Promise<APIOffer[]> {
    const res = await fetchWithAuth("/supplier/offers")

    if (!res.ok) throw new Error("Failed to fetch supplier offers")

    const data = await res.json()

    return data.offers || []
  },

  async saveOffer(offer: Partial<APIOffer>): Promise<APIOffer> {
    const res = await fetchWithAuth("/supplier/offers", {
      method: "POST",

      body: JSON.stringify(offer),
    })

    if (!res.ok) throw new Error("Failed to save offer")

    return res.json()
  },

  async getSupplierStock(): Promise<APIStockItem[]> {
    const res = await fetchWithAuth("/inventory/stock")

    if (!res.ok) throw new Error("Failed to fetch stock")

    const data = await res.json()

    return data.stock || []
  },

  async adjustStock(payload: {
    warehouse_id: string

    offer_id: string

    adjustment: number

    reason: string
  }): Promise<any> {
    const res = await fetchWithAuth("/inventory/adjust", {
      method: "POST",

      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error("Failed to adjust stock")

    return res.json()
  },

  async getSupplierSuborders(): Promise<APISuborder[]> {
    const res = await fetchWithAuth("/supplier/suborders")

    if (!res.ok) throw new Error("Failed to fetch suborders")

    const data = await res.json()

    return data.suborders || []
  },

  async updateSuborderStatus(suborderId: string, status: string): Promise<any> {
    const res = await fetchWithAuth(
      `/supplier/suborders/${suborderId}/status`,

      {
        method: "PATCH",

        body: JSON.stringify({ status }),
      },
    )

    if (!res.ok) throw new Error("Failed to update status")

    return res.json()
  },

  async getSupplierWallet(): Promise<{
    escrow_pending_cents: number

    available_cents: number

    lifetime_gross_cents: number

    currency: string
  }> {
    const res = await fetchWithAuth("/supplier/wallet")

    if (!res.ok) throw new Error("Failed to fetch wallet")

    return res.json()
  },

  async requestPayout(payload: {
    amount_cents: number

    bank_name: string

    iban: string

    supplier_id?: string
  }): Promise<any> {
    const res = await fetchWithAuth("/supplier/payouts", {
      method: "POST",

      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error("Failed to request payout")

    return res.json()
  },

  // Admin APIs (Protected, Super Admin / Platform Admin only)

  async getAdminSuppliers(status?: string): Promise<APISupplierOrg[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ""

    const res = await fetchWithAuth(`/admin/suppliers${query}`)

    if (!res.ok) throw new Error("Failed to fetch suppliers")

    const data = await res.json()

    return data.suppliers || []
  },

  async approveSupplier(id: string): Promise<any> {
    const res = await fetchWithAuth(`/admin/suppliers/${id}/approve`, {
      method: "POST",
    })

    if (!res.ok) throw new Error("Failed to approve supplier")

    return res.json()
  },

  async rejectSupplier(id: string): Promise<any> {
    const res = await fetchWithAuth(`/admin/suppliers/${id}/reject`, {
      method: "POST",
    })

    if (!res.ok) throw new Error("Failed to reject supplier")

    return res.json()
  },

  async getLedgerEntries(): Promise<{
    journal_entries: APILedgerEntry[]

    integrity_verified: boolean

    invariant: string
  }> {
    const res = await fetchWithAuth("/ledger/entries")

    if (!res.ok) throw new Error("Failed to fetch ledger entries")

    return res.json()
  },

  async getLedgerAccounts(): Promise<APILedgerAccount[]> {
    const res = await fetchWithAuth("/ledger/accounts")

    if (!res.ok) throw new Error("Failed to fetch ledger accounts")

    const data = await res.json()

    return data.accounts || []
  },

  async getCMSSections(): Promise<APICMSSection[]> {
    const res = await fetch(`${API_BASE_URL}/cms/sections`)

    if (!res.ok) throw new Error("Failed to fetch CMS sections")

    const data = await res.json()

    return data.sections || []
  },

  async getAuditLogs(): Promise<APIAuditLog[]> {
    const res = await fetchWithAuth("/admin/audit-logs")

    if (!res.ok) throw new Error("Failed to fetch audit logs")

    const data = await res.json()

    return data.audit_logs || []
  },

  // ==========================================

  // SHARED IDENTITY & CONTEXT SWITCHING (DEP-01)

  // ==========================================

  async switchContext(
    targetContextType: "merchant" | "b2c_customer",
    targetOrgId?: string,
  ): Promise<{
    token: string

    activeContext: ContextOption
  }> {
    try {
      const res = await fetchWithAuth("/auth/switch-context", {
        method: "POST",

        body: JSON.stringify({
          target_context_type: targetContextType,

          target_org_id: targetOrgId,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        if (data.token) {
          localStorage.setItem("token", data.token)
        }

        return data
      }
    } catch {
      // fallback to mock context switch
    }

    const mockContext: ContextOption = {
      type: targetContextType,

      orgId:
        targetOrgId ||
        (targetContextType === "merchant"
          ? "99887766-5544-3322-1100-aabbccddeeff"
          : undefined),

      orgName:
        targetContextType === "merchant" ? "Al-Amal Retail Group" : undefined,

      orgStatus: "approved",

      role:
        targetContextType === "merchant" ? "procurement_manager" : "customer",

      isCurrent: true,
    }

    return { token: "mock-jwt-token", activeContext: mockContext }
  },

  async getAvailableContexts(): Promise<ContextOption[]> {
    try {
      const res = await fetchWithAuth("/auth/me/contexts")

      if (res.ok) {
        const data = await res.json()

        return data.contexts || []
      }
    } catch {
      // fallback
    }

    return [
      {
        type: "b2c_customer",

        role: "customer",

        isCurrent: false,
      },

      {
        type: "merchant",

        orgId: "99887766-5544-3322-1100-aabbccddeeff",

        orgName: "Al-Amal Retail Group (الشركة المعتمدة)",

        orgStatus: "approved",

        role: "procurement_manager",

        isCurrent: true,
      },

      {
        type: "merchant",

        orgId: "88776655-4433-2211-0011-aabbccddeeff",

        orgName: "Gulf Distribution Co. (فرع الشرقية)",

        orgStatus: "under_review",

        role: "warehouse_manager",

        isCurrent: false,
      },
    ]
  },

  // ==========================================

  // B2B RECEIVING WAREHOUSES (DEP-06)

  // ==========================================

  async getMerchantWarehouses(): Promise<B2BReceivingWarehouse[]> {
    try {
      const res = await fetchWithAuth("/merchant/warehouses")

      if (res.ok) {
        const data = await res.json()

        return data.warehouses || []
      }
    } catch {
      // fallback
    }

    const saved = localStorage.getItem("nexus_merchant_warehouses")

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }

    const defaults: B2BReceivingWarehouse[] = [
      {
        id: "wh-01",

        name: "مستودع الدمام الرئيسي — Dammam Eastern Logistics Hub",

        code: "SA-DMM-01",

        countryCode: "SA",

        city: "الدمام / Dammam",

        addressLine: "المدينة الصناعية الثانية، شارع 42",

        dockType: "standard_bay",

        hasForklift: true,

        receivingHours: "08:00 - 17:00",

        contactName: "فهد الحربي / Fahad Al-Harbi",

        contactPhone: "+966551234567",

        isDefault: true,

        isActive: true,
      },

      {
        id: "wh-02",

        name: "رصيف الرياض السريع — Riyadh Central Distribution Dock",

        code: "SA-RUH-02",

        countryCode: "SA",

        city: "الرياض / Riyadh",

        addressLine: "حي السلي، مخرج 18",

        dockType: "tail_lift",

        hasForklift: false,

        receivingHours: "09:00 - 18:00",

        contactName: "سلطان العتيبي / Sultan Al-Otaibi",

        contactPhone: "+966559876543",

        isDefault: false,

        isActive: true,
      },
    ]

    localStorage.setItem("nexus_merchant_warehouses", JSON.stringify(defaults))

    return defaults
  },

  async createMerchantWarehouse(
    warehouse: Omit<B2BReceivingWarehouse, "id" | "isActive">,
  ): Promise<B2BReceivingWarehouse> {
    try {
      const res = await fetchWithAuth("/merchant/warehouses", {
        method: "POST",

        body: JSON.stringify(warehouse),
      })

      if (res.ok) {
        return res.json()
      }
    } catch {
      // fallback
    }

    const current = await this.getMerchantWarehouses()

    const newWh: B2BReceivingWarehouse = {
      ...warehouse,

      id: `wh-${Date.now()}`,

      isActive: true,
    }

    if (newWh.isDefault) {
      current.forEach((w) => (w.isDefault = false))
    }

    const updated = [newWh, ...current]

    localStorage.setItem("nexus_merchant_warehouses", JSON.stringify(updated))

    return newWh
  },

  // ==========================================

  // B2B TEAM & RBAC (DEP-09)

  // ==========================================

  async getB2BTeamMembers(): Promise<B2BTeamMember[]> {
    try {
      const res = await fetchWithAuth("/merchant/team")

      if (res.ok) {
        const data = await res.json()

        return data.members || []
      }
    } catch {
      // fallback
    }

    const saved = localStorage.getItem("nexus_b2b_team")

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }

    const defaults: B2BTeamMember[] = [
      {
        id: "tm-01",

        email: "tariq.owner@al-amal.sa",

        firstName: "طارق / Tariq",

        lastName: "المنصور / Mansoor",

        role: "owner",

        status: "active",
      },

      {
        id: "tm-02",

        email: "fahad.procurement@al-amal.sa",

        firstName: "فهد / Fahad",

        lastName: "الحربي / Al-Harbi",

        role: "procurement_manager",

        status: "active",

        spendingLimitCents: 5000000,
      },

      {
        id: "tm-03",

        email: "mona.finance@al-amal.sa",

        firstName: "منى / Mona",

        lastName: "الصالح / Al-Saleh",

        role: "finance_viewer",

        status: "active",
      },

      {
        id: "tm-04",

        email: "logistics.wh@al-amal.sa",

        firstName: "ناصر / Nasser",

        lastName: "الغامدي / Al-Ghamdi",

        role: "warehouse_manager",

        status: "invited",

        invitedAt: "2026-11-04",
      },
    ]

    localStorage.setItem("nexus_b2b_team", JSON.stringify(defaults))

    return defaults
  },

  async inviteB2BTeamMember(member: {
    email: string
    firstName: string
    lastName: string
    role: B2BTeamMember["role"]
    spendingLimitCents?: number
  }): Promise<B2BTeamMember> {
    try {
      const res = await fetchWithAuth("/merchant/team/invite", {
        method: "POST",

        body: JSON.stringify(member),
      })

      if (res.ok) {
        return res.json()
      }
    } catch {
      // fallback
    }

    const current = await this.getB2BTeamMembers()

    const newMember: B2BTeamMember = {
      ...member,

      id: `tm-${Date.now()}`,

      status: "invited",

      invitedAt: new Date().toISOString().split("T")[0],
    }

    const updated = [newMember, ...current]

    localStorage.setItem("nexus_b2b_team", JSON.stringify(updated))

    return newMember
  },

  // ==========================================

  // B2B KYC & CORPORATE PROFILE (DEP-08)

  // ==========================================

  async getB2BCorporateProfile(): Promise<B2BCorporateProfile> {
    try {
      const res = await fetchWithAuth("/merchant/profile")

      if (res.ok) return res.json()
    } catch {}

    return {
      legalName:
        "مجموعة الأمل للتجزئة والتجارة العامة — Al-Amal Retail Group LLC",

      crNumber: "1010928374",

      vatNumber: "310029384700003",

      countryCode: "SA",

      currency: "USD",

      billingAddress: "الرياض، طريق الملك فهد، برج الفيصلية، الدور 18",

      contactEmail: "procurement@al-amal.sa",

      contactPhone: "+966114889900",

      status: "approved",
    }
  },

  async getB2BKYCDocuments(): Promise<B2BKYCDocument[]> {
    return [
      {
        id: "kyc-01",

        docType: "commercial_registration",

        title: {
          ar: "السجل التجاري الساري",
          en: "Commercial Registration (CR)",
        },

        fileName: "CR-1010928374-2025.pdf",

        fileSize: "1.8 MB",

        status: "approved",

        uploadedAt: "2025-10-15",
      },

      {
        id: "kyc-02",

        docType: "tax_certificate",

        title: {
          ar: "شهادة ضريبة القيمة المضافة (VAT)",
          en: "VAT Certificate",
        },

        fileName: "VAT-3100293847-Certificate.pdf",

        fileSize: "920 KB",

        status: "approved",

        uploadedAt: "2025-10-15",
      },

      {
        id: "kyc-03",

        docType: "bank_letter",

        title: {
          ar: "شهادة الحساب البنكي الرسمي (IBAN)",
          en: "Bank Account Letter",
        },

        fileName: "Corporate-Bank-Letter-RiyadBank.pdf",

        fileSize: "1.2 MB",

        status: "approved",

        uploadedAt: "2025-10-16",
      },
    ]
  },

  // ==========================================

  // B2C CUSTOMER ADDRESSES (DEP-07)

  // ==========================================

  async getCustomerAddresses(): Promise<B2CCustomerAddress[]> {
    try {
      const res = await fetchWithAuth("/customer/addresses")

      if (res.ok) {
        const data = await res.json()

        return data.addresses || []
      }
    } catch {}

    const saved = localStorage.getItem("nexus_b2c_addresses")

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }

    const defaults: B2CCustomerAddress[] = [
      {
        id: "addr-01",

        label: "Home",

        recipientName: "سارة الزهراني / Sara Al-Zahrani",

        recipientPhone: "+966501234567",

        city: "الرياض / Riyadh",

        district: "حي العليا / Olaya District",

        streetAddress: "شارع التحلية، عمارة 42",

        buildingNumber: "42",

        floorNumber: "3",

        apartmentNumber: "12",

        deliveryInstructions: "يرجى ترك الشحنة عند الباب أو الاتصال مسبقاً",

        isDefault: true,
      },

      {
        id: "addr-02",

        label: "Office",

        recipientName: "سارة الزهراني (مكتب العمل)",

        recipientPhone: "+966501234567",

        city: "الرياض / Riyadh",

        district: "حي النخيل / Al-Nakheel",

        streetAddress: "طريق الملك فهد، برج النخيل للشركات",

        buildingNumber: "Tower 2",

        floorNumber: "8",

        apartmentNumber: "Office 804",

        isDefault: false,
      },
    ]

    localStorage.setItem("nexus_b2c_addresses", JSON.stringify(defaults))

    return defaults
  },

  async createCustomerAddress(
    address: Omit<B2CCustomerAddress, "id">,
  ): Promise<B2CCustomerAddress> {
    try {
      const res = await fetchWithAuth("/customer/addresses", {
        method: "POST",

        body: JSON.stringify(address),
      })

      if (res.ok) return res.json()
    } catch {}

    const current = await this.getCustomerAddresses()

    const newAddr: B2CCustomerAddress = {
      ...address,

      id: `addr-${Date.now()}`,
    }

    if (newAddr.isDefault) {
      current.forEach((a) => (a.isDefault = false))
    }

    const updated = [newAddr, ...current]

    localStorage.setItem("nexus_b2c_addresses", JSON.stringify(updated))

    return newAddr
  },

  // ==========================================

  // WALLETS & TOPUP (DEP-04, DEP-10)

  // ==========================================

  async getB2BWallet(): Promise<WalletAccount> {
    try {
      const res = await fetchWithAuth("/merchant/wallet")

      if (res.ok) return res.json()
    } catch {}

    const stored = localStorage.getItem("nexus_b2b_wallet_cents")

    const balance = stored ? parseInt(stored, 10) : 2450000 // $24,500.00

    return {
      accountCode: "2010",

      currency: "USD",

      availableBalanceCents: balance,

      heldBalanceCents: 320000,

      totalBalanceCents: balance + 320000,
    }
  },

  async getB2CWallet(): Promise<WalletAccount> {
    try {
      const res = await fetchWithAuth("/customer/wallet")

      if (res.ok) return res.json()
    } catch {}

    const stored = localStorage.getItem("nexus_b2c_wallet_cents")

    const balance = stored ? parseInt(stored, 10) : 18500 // $185.00

    return {
      accountCode: "2050",

      currency: "USD",

      availableBalanceCents: balance,

      heldBalanceCents: 0,

      totalBalanceCents: balance,
    }
  },

  async topupWallet(accountType: "b2b" | "b2c", amountCents: number): Promise<{
    success: boolean
    newBalanceCents: number
  }> {
    const key =
      accountType === "b2b"
        ? "nexus_b2b_wallet_cents"
        : "nexus_b2c_wallet_cents"

    const current =
      accountType === "b2b"
        ? (await this.getB2BWallet()).availableBalanceCents
        : (await this.getB2CWallet()).availableBalanceCents

    const updated = current + amountCents

    localStorage.setItem(key, updated.toString())

    return { success: true, newBalanceCents: updated }
  },

  async getLedgerTransactions(
    accountType: "b2b" | "b2c",
  ): Promise<LedgerTransaction[]> {
    if (accountType === "b2b") {
      return [
        {
          id: "tx-01",

          entryNumber: "JE-2026-0819",

          date: "2026-11-04 14:22",

          type: "topup",

          description: {
            ar: "شحن رصيد الحساب التجاري عبر تحويل بنكي",
            en: "Corporate Account Wire Top-Up",
          },

          amountCents: 1000000,

          isDebit: false,

          status: "posted",

          referenceId: "REF-WIRE-88912",
        },

        {
          id: "tx-02",

          entryNumber: "JE-2026-0820",

          date: "2026-11-04 16:45",

          type: "purchase",

          description: {
            ar: "سداد أمر شراء جملة #ORD-9912",
            en: "Wholesale Procurement Order #ORD-9912",
          },

          amountCents: 450000,

          isDebit: true,

          status: "posted",

          referenceId: "ORD-9912",
        },

        {
          id: "tx-03",

          entryNumber: "JE-2026-0821",

          date: "2026-11-05 09:10",

          type: "refund",

          description: {
            ar: "استرداد قيمة صنف تالف من المورد Atlas",
            en: "Supplier Refund for Damaged Goods",
          },

          amountCents: 120000,

          isDebit: false,

          status: "posted",

          referenceId: "REF-RET-004",
        },
      ]
    } else {
      return [
        {
          id: "ctx-01",

          entryNumber: "JE-2026-0901",

          date: "2026-11-03 11:20",

          type: "topup",

          description: {
            ar: "شحن رصيد المحفظة عبر Apple Pay",
            en: "Consumer Wallet Top-Up via Apple Pay",
          },

          amountCents: 10000,

          isDebit: false,

          status: "posted",

          referenceId: "PAY-AP-4481",
        },

        {
          id: "ctx-02",

          entryNumber: "JE-2026-0902",

          date: "2026-11-04 19:30",

          type: "purchase",

          description: {
            ar: "شراء تجزئة منتجات منزلية #ORD-7741",
            en: "Retail Purchase #ORD-7741",
          },

          amountCents: 6500,

          isDebit: true,

          status: "posted",

          referenceId: "ORD-7741",
        },
      ]
    }
  },
}
