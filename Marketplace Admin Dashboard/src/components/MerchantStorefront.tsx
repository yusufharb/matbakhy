import { useState, useEffect } from "react"
import {
  Search,
  ShoppingCart,
  ShieldCheck,
  Star,
  Box,
  Truck,
  CheckCircle2,
  Clock3,
  MapPin,
  WalletCards,
  ArrowRight,
  Filter,
  Plus,
  Minus,
  X,
  CreditCard,
  Building2,
  ChevronRight,
  Headphones,
  Check,
  AlertTriangle,
} from "lucide-react"
import { sampleProducts, mockOrders } from "../data/mockStorefront"
import { api } from "../services/api"
import type {
  StorefrontProduct,
  StorefrontOffer,
  CartItem,
  ParentOrder,
  Locale,
} from "../types"

interface Props {
  locale: Locale
  setLocale: (l: Locale) => void
}

export function MerchantStorefront({ locale, setLocale }: Props) {
  const [products, setProducts] = useState<StorefrontProduct[]>(sampleProducts)
  const [orders, setOrders] = useState<ParentOrder[]>(mockOrders)
  const [cart, setCart] = useState<CartItem[]>([
    {
      offer: sampleProducts[0].offers[0],
      product: sampleProducts[0],
      quantity: 2,
    },
    {
      offer: sampleProducts[1].offers[0],
      product: sampleProducts[1],
      quantity: 1,
    },
  ])

  useEffect(() => {
    async function loadBackendData() {
      try {
        const apiProds = await api.getProducts()
        if (apiProds && apiProds.length > 0) {
          const loaded: StorefrontProduct[] = await Promise.all(
            apiProds.map(async (p, idx) => {
              let offers: StorefrontOffer[] = []
              try {
                const apiOffers = await api.getProductOffers(p.id)
                offers = apiOffers.map((o) => ({
                  id: o.id,
                  supplierId: o.supplier_id,
                  supplierName: o.supplier_name,
                  supplierRating: o.supplier_rating || 4.9,
                  verified: o.verified ?? true,
                  price: o.price_cents / 100,
                  moq: o.moq,
                  stock: o.stock,
                  location: o.location || "Riyadh",
                  deliveryDays: o.lead_time_days || 2,
                  returnPolicy: "14-day warranty & direct replacement",
                  tiers: (o.price_tiers || []).map((t) => ({
                    minQty: t.minQty,
                    maxQty: t.maxQty,
                    price: t.price / 100,
                  })),
                }))
              } catch (e) {
                console.warn("Could not fetch offers for product", p.id, e)
              }

              if (offers.length === 0 && sampleProducts[idx]) {
                offers = sampleProducts[idx].offers
              }

              return {
                id: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category_name,
                image:
                  sampleProducts[idx]?.image ||
                  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
                brand: p.brand_name || "Platform Certified",
                description: p.description,
                rating: 4.8,
                reviewCount: 38 + idx * 8,
                offers: offers,
                specs: p.attributes || {},
              }
            }),
          )
          setProducts(loaded)
        }

        const apiOrders = await api.getOrders()
        if (apiOrders && apiOrders.length > 0) {
          setOrders(
            apiOrders.map((o) => ({
              id: o.order_number,
              date: new Date(o.created_at).toLocaleDateString(),
              total: o.grand_total_cents / 100,
              status: (o.status === "confirmed"
                ? "Processing"
                : o.status === "delivered"
                  ? "Delivered"
                  : "Processing") as any,
              paymentMethod:
                o.payment_method === "wallet"
                  ? `Merchant Wallet Balance ($${(o.grand_total_cents / 100).toFixed(2)} deducted)`
                  : "Credit Card (•••• 4018)",
              suborders: (o.suborders || []).map((so) => ({
                id: so.suborder_number,
                supplierName: so.supplier_name,
                itemsCount: (so.items || []).reduce(
                  (acc, it) => acc + it.quantity,
                  0,
                ),
                amount: (so.subtotal_cents + so.shipping_cents) / 100,
                status: (so.status === "shipped"
                  ? "Shipped"
                  : so.status === "delivered"
                    ? "Delivered"
                    : "Processing") as any,
              })),
            })),
          )
        }
      } catch (err) {
        console.warn("Backend API unavailable, using built-in demo fixtures:", err)
      }
    }
    loadBackendData()
  }, [])

  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] =
    useState<StorefrontProduct | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<StorefrontOffer | null>(
    null,
  )
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState<ParentOrder | null>(null)
  const [walletBalance, setWalletBalance] = useState(4850.0)
  const [paymentChoice, setPaymentChoice] = useState<"wallet" | "card">(
    "wallet",
  )
  const [productQty, setProductQty] = useState(1)

  const isRtl = locale === "ar"

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      activeCategory === "All" ||
      p.category.en.toLowerCase().includes(activeCategory.toLowerCase())
    const matchesSearch =
      p.name[locale].toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Group cart items by supplier
  const supplierGroups = cart.reduce(
    (acc, item) => {
      const sId = item.offer.supplierId
      if (!acc[sId]) {
        acc[sId] = {
          supplierName: item.offer.supplierName,
          items: [],
          subtotal: 0,
        }
      }
      acc[sId].items.push(item)
      acc[sId].subtotal += item.offer.price * item.quantity
      return acc
    },
    {} as Record<string, {
      supplierName: string
      items: CartItem[]
      subtotal: number
    }>,
  )

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.offer.price * item.quantity,
    0,
  )
  const shippingFee = Object.keys(supplierGroups).length * 15.0 // $15 per supplier fulfillment
  const grandTotal = cartSubtotal + shippingFee

  const addToCart = (
    product: StorefrontProduct,
    offer: StorefrontOffer,
    qty = 1,
  ) => {
    const existing = cart.find((i) => i.offer.id === offer.id)
    if (existing) {
      setCart(
        cart.map((i) =>
          i.offer.id === offer.id ? { ...i, quantity: i.quantity + qty } : i,
        ),
      )
    } else {
      setCart([...cart, { product, offer, quantity: qty }])
    }
    setCartOpen(true)
  }

  const updateCartQty = (offerId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.offer.id !== offerId))
    } else {
      setCart(
        cart.map((i) =>
          i.offer.id === offerId ? { ...i, quantity: newQty } : i,
        ),
      )
    }
  }

  const handlePlaceOrder = async () => {
    try {
      const res = await api.checkout({
        payment_method: paymentChoice,
        items: cart.map((i) => ({ offer_id: i.offer.id, quantity: i.quantity })),
      })
      const po = res.parent_order
      const newOrder: ParentOrder = {
        id: po.order_number,
        date: "Just now",
        total: po.grand_total_cents / 100,
        status: "Processing",
        paymentMethod:
          paymentChoice === "wallet"
            ? `Merchant Wallet Balance ($${(po.grand_total_cents / 100).toFixed(2)} deducted)`
            : "Credit Card (•••• 4018)",
        suborders: (po.suborders || []).map((so) => ({
          id: so.suborder_number,
          supplierName: so.supplier_name,
          itemsCount: (so.items || []).reduce((s, it) => s + it.quantity, 0),
          amount: (so.subtotal_cents + so.shipping_cents) / 100,
          status: "Processing" as const,
        })),
      }

      if (paymentChoice === "wallet") {
        setWalletBalance((prev) => Math.max(0, prev - (po.grand_total_cents / 100)))
      }

      setOrders([newOrder, ...orders])
      setCart([])
      setOrderConfirmed(newOrder)
    } catch (err) {
      console.warn("Real API checkout failed or offline, falling back:", err)
      const parentId = `ORD-2025-${Math.floor(1000 + Math.random() * 9000)}`
      const newSuborders = Object.entries(supplierGroups).map(
        ([, group], idx) => ({
          id: `SO-${10490 + idx}`,
          supplierName: group.supplierName,
          itemsCount: group.items.reduce((s, i) => s + i.quantity, 0),
          amount: group.subtotal + 15,
          status: "Processing" as const,
        }),
      )

      const newOrder: ParentOrder = {
        id: parentId,
        date: "Just now",
        total: grandTotal,
        status: "Processing",
        paymentMethod:
          paymentChoice === "wallet"
            ? `Merchant Wallet Balance ($${grandTotal.toFixed(2)} deducted)`
            : "Credit Card (•••• 4018)",
        suborders: newSuborders,
      }

      if (paymentChoice === "wallet") {
        setWalletBalance((prev) => Math.max(0, prev - grandTotal))
      }

      setOrders([newOrder, ...orders])
      setCart([])
      setOrderConfirmed(newOrder)
    }
  }

  return (
    <div
      style={{
        background: "#f8faf9",
        minHeight: "100vh",
        margin: "-22px -28px -34px",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Storefront Header */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--line)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--green-dark)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              N
            </div>
            <div>
              <b style={{ fontSize: 16, letterSpacing: "-0.02em" }}>NEXUS</b>
              <small
                style={{
                  display: "block",
                  color: "var(--muted)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                }}
              >
                {isRtl ? "سوق الجملة الموحد" : "B2B / B2C MARKETPLACE"}
              </small>
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              flex: 1,
              maxWidth: 580,
              display: "flex",
              alignItems: "center",
              background: "#f4f7f6",
              borderRadius: 8,
              border: "1px solid var(--line)",
              padding: "0 12px",
              height: 42,
            }}
          >
            <Search size={18} color="var(--muted)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl
                  ? "ابحث عن منتجات، علامات تجارية، أو موردين معتمدين..."
                  : "Search products, brands, or verified suppliers..."
              }
              style={{
                border: 0,
                background: "transparent",
                flex: 1,
                padding: "0 10px",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* User actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Wallet pill */}
            <div
              style={{
                background: "var(--green-soft)",
                border: "1px solid #bce1d4",
                borderRadius: 20,
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
              }}
            >
              <WalletCards size={16} color="var(--green)" />
              <span style={{ color: "var(--green-dark)" }}>
                {isRtl ? "المحفظة:" : "Wallet:"}{" "}
                <b>${walletBalance.toLocaleString()}</b>
              </span>
            </div>

            {/* My Orders button */}
            <button
              className="secondary-btn"
              onClick={() => setOrdersOpen(true)}
              style={{ fontSize: 12 }}
            >
              <Clock3 size={15} />
              {isRtl ? "طلباتي" : "My Orders"} ({orders.length})
            </button>

            {/* Cart Button */}
            <button
              className="primary-btn"
              onClick={() => setCartOpen(true)}
              style={{ fontSize: 12, position: "relative" }}
            >
              <ShoppingCart size={16} />
              {isRtl ? "السلة" : "Cart"}
              {cart.length > 0 && (
                <span
                  style={{
                    background: "#e55b4d",
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    marginLeft: 4,
                  }}
                >
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div
          style={{
            borderTop: "1px solid var(--line)",
            background: "#fafcfb",
            padding: "8px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1380,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
            }}
          >
            {[
              { id: "All", en: "All Categories", ar: "جميع الفئات" },
              {
                id: "Electronics",
                en: "Electronics & Audio",
                ar: "إلكترونيات وصوتيات",
              },
              {
                id: "Computers",
                en: "Computers & Docks",
                ar: "كمبيوتر وإكسسوارات",
              },
              {
                id: "Business",
                en: "Business Supplies",
                ar: "مستلزمات الأعمال",
              },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  border: 0,
                  background:
                    activeCategory === cat.id
                      ? "var(--green-dark)"
                      : "transparent",
                  color: activeCategory === cat.id ? "#fff" : "var(--muted)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: activeCategory === cat.id ? 700 : 500,
                }}
              >
                {cat[locale]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main style={{ maxWidth: 1380, margin: "24px auto", padding: "0 24px" }}>
        {/* Promotional Hero Banner */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #09261d 0%, #0d4a37 50%, #157356 100%)",
            color: "#fff",
            borderRadius: 12,
            padding: "36px 40px",
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 20px rgba(9,38,29,0.15)",
          }}
        >
          <div>
            <span
              style={{
                color: "#66dfb3",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.15em",
                display: "block",
                marginBottom: 6,
              }}
            >
              {isRtl ? "نظام الكتالوج الموحد" : "SHARED CATALOG ARCHITECTURE"}
            </span>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                margin: "4px 0 10px",
              }}
            >
              {isRtl
                ? "قارن عروض عدة موردين لمنتج واحد في طلب واحد"
                : "Compare Multiple Supplier Offers for the Same Product"}
            </h1>
            <p
              style={{
                color: "#b9dfd2",
                fontSize: 14,
                maxWidth: 620,
                lineHeight: 1.5,
              }}
            >
              {isRtl
                ? "اشترِ من عدة موردين بأسعار الجملة، وسلّة موحدة، وفواتير مقسمة تلقائياً، مع الدفع الفوري من محفظتك التجارية."
                : "Source verified wholesale products from certified vendors. Enjoy multi-vendor checkout, automated suborder splitting, and instant wallet settlement."}
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "18px 24px",
              backdropFilter: "blur(8px)",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <ShieldCheck
              size={36}
              color="#58d7a8"
              style={{ margin: "0 auto 8px" }}
            />
            <b style={{ display: "block", fontSize: 13 }}>
              {isRtl ? "ضمان حماية المشتري" : "100% Buyer Protection"}
            </b>
            <small style={{ color: "#a8d6c7", fontSize: 11 }}>
              {isRtl
                ? "أموال الموردين محجوزة في الضمان حتى تأكيد الاستلام"
                : "Supplier funds held in escrow until delivery confirmation"}
            </small>
          </div>
        </div>

        {/* Product Grid */}
        <div style={{ marginBottom: 16 }}>
          <h2
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            {isRtl
              ? "المنتجات المتاحة للتوريد"
              : "Verified Marketplace Catalog"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {isRtl
              ? `عرض ${filteredProducts.length} منتجات معتمدة في الكتالوج المشترك`
              : `Showing ${filteredProducts.length} verified products available across multiple vendors`}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 20,
          }}
        >
          {filteredProducts.map((p) => {
            const lowestPrice = Math.min(...p.offers.map((o) => o.price))
            const offersCount = p.offers.length

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                {/* Visual placeholder */}
                <div
                  style={{
                    height: 180,
                    background: "#f0f5f3",
                    display: "grid",
                    placeItems: "center",
                    position: "relative",
                  }}
                >
                  <Headphones size={64} color="#3c6b5b" />
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: isRtl ? "auto" : 12,
                      right: isRtl ? 12 : "auto",
                      background: "#fff",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    {p.brand}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: isRtl ? "auto" : 12,
                      left: isRtl ? 12 : "auto",
                      background: "var(--green-dark)",
                      color: "#fff",
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {offersCount} {isRtl ? "عروض موردين" : "Seller Offers"}
                  </span>
                </div>

                {/* Details */}
                <div
                  style={{
                    padding: 16,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Star size={13} fill="#e4a12e" color="#e4a12e" />
                    <b style={{ fontSize: 11 }}>{p.rating}</b>
                    <small style={{ color: "var(--muted)", fontSize: 10 }}>
                      ({p.reviewCount})
                    </small>
                  </div>

                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      marginBottom: 8,
                    }}
                  >
                    {p.name[locale]}
                  </h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 11,
                      lineHeight: 1.4,
                      flex: 1,
                      marginBottom: 14,
                    }}
                  >
                    {p.description[locale]}
                  </p>

                  <div
                    style={{
                      borderTop: "1px solid var(--line)",
                      paddingTop: 12,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <small
                        style={{
                          color: "var(--muted)",
                          fontSize: 10,
                          display: "block",
                        }}
                      >
                        {isRtl ? "يبدأ من" : "From"}
                      </small>
                      <strong
                        style={{
                          fontFamily: "DM Mono",
                          fontSize: 18,
                          color: "var(--ink)",
                        }}
                      >
                        ${lowestPrice.toFixed(2)}
                      </strong>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => {
                        setSelectedProduct(p)
                        setSelectedOffer(p.offers[0])
                        setProductQty(p.offers[0].moq || 1)
                      }}
                    >
                      {isRtl ? "مقارنة العروض" : "Compare Offers"}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* PRODUCT DETAILS + MULTI-OFFER COMPARISON MODAL */}
      {selectedProduct && selectedOffer && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setSelectedProduct(null)} />
          <div
            className="supplier-dialog wide"
            style={{ width: 840, maxHeight: "90vh" }}
          >
            <div className="supplier-dialog-head">
              <div>
                <span>{selectedProduct.brand} · GLOBAL CATALOG</span>
                <h2>{selectedProduct.name[locale]}</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSelectedProduct(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: "grid", gap: 20 }}>
              {/* Product Specs Ribbon */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 10,
                  background: "#f5f8f7",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {Object.entries(selectedProduct.specs).map(([key, val]) => (
                  <div key={key}>
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {key}
                    </span>
                    <b style={{ display: "block", fontSize: 11, marginTop: 2 }}>
                      {val}
                    </b>
                  </div>
                ))}
              </div>

              {/* Crucial Multi-Supplier Comparison Section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800 }}>
                      {isRtl
                        ? "جميع عروض الموردين المعتمدين لهذا المنتج"
                        : "All Verified Supplier Offers for this Product"}
                    </h3>
                    <p style={{ color: "var(--muted)", fontSize: 11 }}>
                      {isRtl
                        ? "اختر المورد الذي يناسب ميزانيتك وموقعك وسرعة الشحن"
                        : "Compare commercial terms, delivery speed, and bulk tier discounts"}
                    </p>
                  </div>
                  <span className="badge green">
                    {selectedProduct.offers.length}{" "}
                    {isRtl ? "موردين نشطين" : "Active Suppliers"}
                  </span>
                </div>

                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>{isRtl ? "المورد" : "Supplier"}</th>
                        <th>{isRtl ? "السعر للوحدة" : "Unit Price"}</th>
                        <th>{isRtl ? "الحد الأدنى (MOQ)" : "MOQ"}</th>
                        <th>{isRtl ? "المستودع والشحن" : "Fulfillment"}</th>
                        <th>{isRtl ? "الضمان والإرجاع" : "Warranty"}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.offers.map((off) => {
                        const isSelected = selectedOffer.id === off.id
                        return (
                          <tr
                            key={off.id}
                            style={{
                              background: isSelected ? "#f2faf6" : undefined,
                            }}
                          >
                            <td>
                              <div className="company-cell">
                                <span>
                                  {off.supplierName.slice(0, 2).toUpperCase()}
                                </span>
                                <div>
                                  <b>{off.supplierName}</b>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <Star
                                      size={10}
                                      fill="#e4a12e"
                                      color="#e4a12e"
                                    />
                                    <small>{off.supplierRating}</small>
                                    {off.verified && (
                                      <span
                                        style={{
                                          color: "var(--green)",
                                          fontSize: 9,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ✓ Verified
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong
                                style={{
                                  fontFamily: "DM Mono",
                                  fontSize: 13,
                                }}
                              >
                                ${off.price.toFixed(2)}
                              </strong>
                              {off.tiers && (
                                <small
                                  style={{
                                    display: "block",
                                    color: "var(--green)",
                                    fontSize: 9,
                                  }}
                                >
                                  {off.tiers.length} price tiers
                                </small>
                              )}
                            </td>
                            <td>
                              <span className="badge neutral">
                                {off.moq} {isRtl ? "وحدات" : "units"}
                              </span>
                            </td>
                            <td>
                              <b>{off.location}</b>
                              <small
                                style={{
                                  display: "block",
                                  color: "var(--muted)",
                                }}
                              >
                                {off.deliveryDays}{" "}
                                {isRtl ? "أيام توصيل" : "day delivery"}
                              </small>
                            </td>
                            <td>
                              <small>{off.returnPolicy}</small>
                            </td>
                            <td>
                              <button
                                className={
                                  isSelected ? "primary-btn" : "secondary-btn"
                                }
                                onClick={() => {
                                  setSelectedOffer(off)
                                  setProductQty(off.moq)
                                }}
                              >
                                {isSelected
                                  ? isRtl
                                    ? "العرض المختار"
                                    : "Selected"
                                  : isRtl
                                    ? "اختيار"
                                    : "Select"}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quantity Selector & Tier preview */}
              <div
                style={{
                  background: "#f5f8f7",
                  padding: 16,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b style={{ fontSize: 12, display: "block" }}>
                    {isRtl ? "الكمية المطلوبة" : "Order Quantity"}
                  </b>
                  <small style={{ color: "var(--muted)" }}>
                    {isRtl
                      ? `الحد الأدنى للطلب من ${selectedOffer.supplierName} هو ${selectedOffer.moq} وحدات`
                      : `Minimum Order Quantity (MOQ): ${selectedOffer.moq} units`}
                  </small>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#fff",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                    }}
                  >
                    <button
                      className="icon-btn"
                      onClick={() =>
                        setProductQty(
                          Math.max(selectedOffer.moq, productQty - 1),
                        )
                      }
                      style={{ border: 0 }}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={productQty}
                      onChange={(e) =>
                        setProductQty(
                          Math.max(
                            selectedOffer.moq,
                            parseInt(e.target.value) || selectedOffer.moq,
                          ),
                        )
                      }
                      style={{
                        width: 50,
                        border: 0,
                        textAlign: "center",
                        fontFamily: "DM Mono",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    />
                    <button
                      className="icon-btn"
                      onClick={() => setProductQty(productQty + 1)}
                      style={{ border: 0 }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "var(--muted)",
                        fontSize: 10,
                        display: "block",
                      }}
                    >
                      {isRtl ? "الإجمالي" : "Total"}
                    </small>
                    <b style={{ fontFamily: "DM Mono", fontSize: 16 }}>
                      ${(selectedOffer.price * productQty).toFixed(2)}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            <div className="dialog-actions">
              <button
                className="secondary-btn"
                onClick={() => setSelectedProduct(null)}
              >
                {isRtl ? "إلغاء" : "Close"}
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  addToCart(selectedProduct, selectedOffer, productQty)
                  setSelectedProduct(null)
                }}
              >
                <ShoppingCart size={15} />
                {isRtl ? "إضافة إلى السلة" : "Add to Multi-Vendor Cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-SUPPLIER CART DRAWER */}
      {cartOpen && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setCartOpen(false)} />
          <aside className="drawer" style={{ width: 580 }}>
            <div className="drawer-header">
              <div>
                <span>MULTI-VENDOR SHOPPING CART</span>
                <h2>
                  {isRtl ? "سلة المشتريات الموحدة" : "Your Marketplace Cart"}
                </h2>
                <p>
                  {cart.length} {isRtl ? "منتجات من" : "items from"}{" "}
                  {Object.keys(supplierGroups).length}{" "}
                  {isRtl ? "موردين منفصلين" : "different suppliers"}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setCartOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body" style={{ display: "grid", gap: 16 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <ShoppingCart
                    size={48}
                    color="var(--muted)"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <h3>{isRtl ? "السلة فارغة" : "Your cart is empty"}</h3>
                </div>
              ) : (
                Object.entries(supplierGroups).map(([supId, group]) => (
                  <div
                    key={supId}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    {/* Supplier Suborder Header */}
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#f5f8f7",
                        borderBottom: "1px solid var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Building2 size={16} color="var(--green)" />
                        <b style={{ fontSize: 12 }}>{group.supplierName}</b>
                      </div>
                      <span className="badge blue">
                        {isRtl
                          ? "شحن منفصل: $15.00"
                          : "Fulfillment fee: $15.00"}
                      </span>
                    </div>

                    {/* Items for this supplier */}
                    <div style={{ padding: 12 }}>
                      {group.items.map((item) => {
                        const hasMoqIssue = item.quantity < item.offer.moq
                        return (
                          <div
                            key={item.offer.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom: "1px solid #edf1ef",
                            }}
                          >
                            <div>
                              <b style={{ fontSize: 12, display: "block" }}>
                                {item.product.name[locale]}
                              </b>
                              <small style={{ color: "var(--muted)" }}>
                                SKU: {item.product.sku} · ${item.offer.price} /
                                unit
                              </small>
                              {hasMoqIssue && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "var(--red)",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    marginTop: 2,
                                  }}
                                >
                                  <AlertTriangle size={12} />
                                  MOQ is {item.offer.moq} units!
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  border: "1px solid var(--line)",
                                  borderRadius: 4,
                                }}
                              >
                                <button
                                  className="icon-btn"
                                  style={{ width: 26, height: 26, border: 0 }}
                                  onClick={() =>
                                    updateCartQty(
                                      item.offer.id,
                                      item.quantity - 1,
                                    )
                                  }
                                >
                                  <Minus size={12} />
                                </button>
                                <span
                                  style={{
                                    width: 28,
                                    textAlign: "center",
                                    fontFamily: "DM Mono",
                                    fontSize: 12,
                                  }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  className="icon-btn"
                                  style={{ width: 26, height: 26, border: 0 }}
                                  onClick={() =>
                                    updateCartQty(
                                      item.offer.id,
                                      item.quantity + 1,
                                    )
                                  }
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <b
                                style={{
                                  fontFamily: "DM Mono",
                                  fontSize: 13,
                                  minWidth: 60,
                                  textAlign: isRtl ? "left" : "right",
                                }}
                              >
                                ${(item.offer.price * item.quantity).toFixed(2)}
                              </b>
                            </div>
                          </div>
                        )
                      })}
                      <div
                        style={{
                          textAlign: isRtl ? "left" : "right",
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--muted)",
                        }}
                      >
                        {isRtl
                          ? "المجموع الفرعي للمورد:"
                          : "Supplier Subtotal:"}{" "}
                        <b>${group.subtotal.toFixed(2)}</b>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Order Financials Breakdown */}
              {cart.length > 0 && (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "4px 0",
                    }}
                  >
                    <span>{isRtl ? "المجموع الفرعي" : "Items Subtotal"}</span>
                    <b style={{ fontFamily: "DM Mono" }}>
                      ${cartSubtotal.toFixed(2)}
                    </b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "4px 0",
                    }}
                  >
                    <span>
                      {isRtl
                        ? `رسوم الشحن (${Object.keys(supplierGroups).length} شحنات)`
                        : `Combined Shipping (${Object.keys(supplierGroups).length} shipments)`}
                    </span>
                    <b style={{ fontFamily: "DM Mono" }}>
                      ${shippingFee.toFixed(2)}
                    </b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 15,
                      fontWeight: 800,
                      padding: "10px 0 0",
                      borderTop: "1px solid var(--line)",
                      marginTop: 6,
                    }}
                  >
                    <span>{isRtl ? "الإجمالي الكلي" : "Grand Total"}</span>
                    <strong
                      style={{
                        fontFamily: "DM Mono",
                        color: "var(--green-dark)",
                      }}
                    >
                      ${grandTotal.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="drawer-actions">
                <button
                  className="secondary-btn"
                  onClick={() => setCartOpen(false)}
                >
                  {isRtl ? "مواصلة التسوق" : "Continue Shopping"}
                </button>
                <button
                  className="primary-btn"
                  onClick={() => {
                    setCartOpen(false)
                    setCheckoutOpen(true)
                  }}
                >
                  <Check size={14} />
                  {isRtl ? "إتمام الشراء" : "Proceed to Checkout"}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutOpen && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setCheckoutOpen(false)} />
          <div className="supplier-dialog" style={{ width: 620 }}>
            <div className="supplier-dialog-head">
              <div>
                <span>MULTI-VENDOR CHECKOUT</span>
                <h2>{isRtl ? "تأكيد الطلب والدفع" : "Complete Purchase"}</h2>
              </div>
              <button
                className="icon-btn"
                onClick={() => setCheckoutOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: "grid", gap: 16 }}>
              {orderConfirmed ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <CheckCircle2
                    size={48}
                    color="var(--green)"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <h2>
                    {isRtl
                      ? "تم استلام الطلب وتجزئة الشحنات بنجاح!"
                      : "Order Confirmed & Suborders Dispatched!"}
                  </h2>
                  <p style={{ color: "var(--muted)", margin: "8px 0 16px" }}>
                    {isRtl ? "رقم الطلب الرئيسي:" : "Parent Order ID:"}{" "}
                    <b>{orderConfirmed.id}</b>
                  </p>
                  <div
                    style={{
                      background: "#f5f8f7",
                      padding: 16,
                      borderRadius: 8,
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    <b style={{ fontSize: 12 }}>
                      {isRtl
                        ? "أوامر التوريد الفرعية الصادرة:"
                        : "Generated Supplier Suborders:"}
                    </b>
                    {orderConfirmed.suborders.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "1px solid #e7ecea",
                          fontSize: 12,
                        }}
                      >
                        <span>
                          <b>{sub.id}</b> · {sub.supplierName}
                        </span>
                        <b style={{ fontFamily: "DM Mono" }}>
                          ${sub.amount.toFixed(2)}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Shipping Address */}
                  <div>
                    <b
                      style={{
                        fontSize: 12,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {isRtl ? "عنوان الاستلام" : "Fulfillment Address"}
                    </b>
                    <div
                      style={{
                        border: "1px solid #bce1d4",
                        background: "var(--green-soft)",
                        padding: 12,
                        borderRadius: 6,
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <MapPin size={18} color="var(--green)" />
                      <div>
                        <b style={{ fontSize: 12 }}>
                          Meridian Procurement Hub — Gate 2
                        </b>
                        <small
                          style={{
                            display: "block",
                            color: "var(--muted)",
                            fontSize: 11,
                          }}
                        >
                          King Fahd Road, Al Olaya District, Riyadh 12214, Saudi
                          Arabia
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <b
                      style={{
                        fontSize: 12,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      {isRtl ? "طريقة الدفع" : "Payment Method"}
                    </b>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div
                        onClick={() => setPaymentChoice("wallet")}
                        style={{
                          border: `1.5px solid ${
                            paymentChoice === "wallet"
                              ? "var(--green)"
                              : "var(--line)"
                          }`,
                          background:
                            paymentChoice === "wallet" ? "#f2faf6" : "#fff",
                          padding: 12,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <WalletCards size={20} color="var(--green)" />
                          <div>
                            <b style={{ fontSize: 12 }}>
                              {isRtl
                                ? "الدفع من رصيد المحفظة التجارية (فوري)"
                                : "Pay from Merchant Wallet Balance (Instant)"}
                            </b>
                            <small
                              style={{
                                display: "block",
                                color: "var(--muted)",
                              }}
                            >
                              {isRtl
                                ? `الرصيد المتاح: $${walletBalance.toLocaleString()}`
                                : `Available balance: $${walletBalance.toLocaleString()}`}
                            </small>
                          </div>
                        </div>
                        <input
                          type="radio"
                          checked={paymentChoice === "wallet"}
                          readOnly
                        />
                      </div>

                      <div
                        onClick={() => setPaymentChoice("card")}
                        style={{
                          border: `1.5px solid ${
                            paymentChoice === "card"
                              ? "var(--green)"
                              : "var(--line)"
                          }`,
                          background:
                            paymentChoice === "card" ? "#f2faf6" : "#fff",
                          padding: 12,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <CreditCard size={20} color="var(--blue)" />
                          <div>
                            <b style={{ fontSize: 12 }}>
                              Credit Card / Mada / Apple Pay
                            </b>
                            <small
                              style={{
                                display: "block",
                                color: "var(--muted)",
                              }}
                            >
                              •••• 4018 (Corporate Visa)
                            </small>
                          </div>
                        </div>
                        <input
                          type="radio"
                          checked={paymentChoice === "card"}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div
                    style={{
                      background: "#f5f8f7",
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <span>
                        {isRtl ? "المبلغ المستحق الآن:" : "Total Payable Now:"}
                      </span>
                      <span style={{ color: "var(--green-dark)" }}>
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dialog-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  setCheckoutOpen(false)
                  setOrderConfirmed(null)
                }}
              >
                {orderConfirmed
                  ? isRtl
                    ? "إغلاق"
                    : "Close"
                  : isRtl
                    ? "إلغاء"
                    : "Cancel"}
              </button>
              {!orderConfirmed && (
                <button className="primary-btn" onClick={handlePlaceOrder}>
                  <Check size={14} />
                  {isRtl ? "تأكيد الدفع والطلب" : "Authorize & Place Order"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY ORDERS MODAL */}
      {ordersOpen && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setOrdersOpen(false)} />
          <div className="supplier-dialog wide" style={{ width: 780 }}>
            <div className="supplier-dialog-head">
              <div>
                <span>PROCUREMENT RECORDS</span>
                <h2>
                  {isRtl ? "سجل طلبات الشراء" : "Purchase Orders History"}
                </h2>
              </div>
              <button className="icon-btn" onClick={() => setOrdersOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: "grid", gap: 14 }}>
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #edf1ef",
                      paddingBottom: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <b style={{ fontSize: 13 }}>{ord.id}</b>
                      <small
                        style={{
                          display: "block",
                          color: "var(--muted)",
                          fontSize: 10,
                        }}
                      >
                        {ord.date} · {ord.paymentMethod}
                      </small>
                    </div>
                    <div style={{ textAlign: isRtl ? "left" : "right" }}>
                      <strong style={{ fontFamily: "DM Mono", fontSize: 16 }}>
                        ${ord.total.toFixed(2)}
                      </strong>
                      <span
                        className={`badge ${
                          ord.status === "Delivered" ? "green" : "blue"
                        }`}
                        style={{ display: "block", marginTop: 2 }}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  {/* Supplier Suborders inside this parent order */}
                  <div>
                    <small
                      style={{
                        color: "var(--muted)",
                        fontSize: 10,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {isRtl
                        ? "أوامر التوريد المرتبطة بالموردين:"
                        : "Associated Supplier Suborders & Shipments:"}
                    </small>
                    {ord.suborders.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          background: "#f8faf9",
                          borderRadius: 6,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <b>{sub.id}</b> — {sub.supplierName} ({sub.itemsCount}{" "}
                          items)
                          {sub.trackingNumber && (
                            <small
                              style={{
                                display: "block",
                                color: "var(--green)",
                              }}
                            >
                              Tracking: {sub.trackingNumber}
                            </small>
                          )}
                        </div>
                        <span className="badge amber">{sub.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="dialog-actions">
              <button
                className="secondary-btn"
                onClick={() => setOrdersOpen(false)}
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
