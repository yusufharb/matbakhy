export type PortalMode = "admin" | "supplier" | "merchant"

export type AdminPage = "overview" | "kyc" | "catalog" | "finance" | "cms" | "team" | "audit" | "settings"

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
  price: number // USD
  moq: number
  stock: number
  location: string
  deliveryDays: number
  returnPolicy: string
  tiers?: { minQty: number maxQty: number | string price: number }[]
}

export interface CartItem {
  offer: StorefrontOffer
  product: StorefrontProduct
  quantity: number
}

export interface ParentOrder {
  id: string
  date: string
  total: number
  status: "Confirmed" | "Processing" | "Delivered"
  paymentMethod: string
  suborders: {
    id: string
    supplierName: string
    itemsCount: number
    amount: number
    status: "Processing" | "Ready for pickup" | "Shipped" | "Delivered"
    trackingNumber?: string
  }[]
}
