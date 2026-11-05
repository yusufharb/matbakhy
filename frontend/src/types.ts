export type PortalMode = "admin" | "supplier" | "b2b" | "b2c" | "merchant"

export type AdminPage = "overview" | "kyc" | "catalog" | "finance" | "cms" | "team" | "audit" | "settings"

export type B2BPage = "overview" | "catalog" | "product" | "cart" | "checkout" | "orders" | "warehouses" | "team" | "wallet" | "onboarding" | "profile"

export type B2CPage = "home" | "catalog" | "product" | "cart" | "checkout" | "orders" | "addresses" | "wallet" | "profile"

export type Locale = "en" | "ar"

export interface BilingualText {
  en: string
  ar: string
}

export interface StorefrontProduct {
  id: string
  sku: string
  name: BilingualText
  category: BilingualText
  image: string
  brand: string
  description: BilingualText
  rating: number
  reviewCount: number
  offers: StorefrontOffer[]
  specs: Record<string, string>
}

export interface StorefrontOffer {
  id: string
  supplierId: string
  supplierName: string
  supplierRating: number
  verified: boolean
  price: number // in minor units or decimal depending on context
  moq: number
  stock: number
  location: string
  deliveryDays: number
  returnPolicy: string
  tiers?: { minQty: number maxQty: number | string price: number }[]
  b2bEnabled?: boolean
  b2cEnabled?: boolean
  retailPrice?: number
}

export interface CartItem {
  offer: StorefrontOffer
  product: StorefrontProduct
  quantity: number
}

export interface ParentOrder {
  id: string
  orderNumber?: string
  date: string
  total: number
  status: "Confirmed" | "Processing" | "Delivered" | "Pending" | "Cancelled"
  paymentMethod: string
  orderType?: "b2b" | "b2c"
  poReference?: string
  destinationWarehouse?: string
  destinationAddress?: string
  suborders: {
    id: string
    suborderNumber?: string
    supplierName: string
    itemsCount: number
    amount: number
    status: "Processing" | "Ready for pickup" | "Shipped" | "Delivered" | "Confirmed"
    trackingNumber?: string
  }[]
}

// B2B Receiving Warehouse (Delivery destination with commercial dock specs)
export interface B2BReceivingWarehouse {
  id: string
  name: string
  code: string
  countryCode: string
  city: string
  addressLine: string
  dockType: "standard_bay" | "ground_level" | "tail_lift"
  hasForklift: boolean
  receivingHours: string
  contactName: string
  contactPhone: string
  isDefault: boolean
  isActive: boolean
}

// B2B Team Member & Organizational Roles
export interface B2BTeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "owner" | "admin" | "procurement_manager" | "warehouse_manager" | "finance_viewer"
  status: "active" | "invited" | "suspended"
  spendingLimitCents?: number
  invitedAt?: string
}

// B2B Corporate KYC Document
export interface B2BKYCDocument {
  id: string
  docType: "commercial_registration" | "tax_certificate" | "proof_of_address" | "bank_letter"
  title: BilingualText
  fileName?: string
  fileSize?: string
  status: "pending" | "submitted" | "approved" | "rejected"
  rejectionReason?: string
  uploadedAt?: string
}

// B2B Corporate Profile
export interface B2BCorporateProfile {
  legalName: string
  crNumber: string
  vatNumber: string
  countryCode: string
  currency: string
  billingAddress: string
  contactEmail: string
  contactPhone: string
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "suspended"
}

// B2C Customer Personal Address
export interface B2CCustomerAddress {
  id: string
  label: "Home" | "Office" | "Other"
  recipientName: string
  recipientPhone: string
  city: string
  district?: string
  streetAddress: string
  buildingNumber?: string
  floorNumber?: string
  apartmentNumber?: string
  deliveryInstructions?: string
  isDefault: boolean
}

// B2C Customer Profile
export interface B2CCustomerProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  locale: Locale
  currency: string
}

// Double-Entry Wallet Information
export interface WalletAccount {
  accountCode: "2010" | "2050"
  currency: string
  availableBalanceCents: number
  heldBalanceCents: number
  totalBalanceCents: number
}

// Ledger Transaction Line
export interface LedgerTransaction {
  id: string
  entryNumber: string
  date: string
  type: "topup" | "purchase" | "refund" | "hold" | "escrow_release"
  description: BilingualText
  amountCents: number
  isDebit: boolean
  status: "posted" | "pending" | "reversed"
  referenceId: string
}

// Shared Identity Context Options
export interface ContextOption {
  type: "merchant" | "b2c_customer"
  orgId?: string
  orgName?: string
  orgStatus?: string
  role: string
  isCurrent: boolean
}
