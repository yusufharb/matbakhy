import { useState, useEffect } from "react"
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  MapPin,
  WalletCards,
  User,
  Package,
  Heart,
  Star,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  CreditCard,
  Building,
  Home,
  Briefcase,
  ExternalLink,
} from "lucide-react"
import { api } from "../../services/api"
import { translations } from "../../data/i18n"
import type {
  Locale,
  B2CPage,
  B2CCustomerAddress,
  WalletAccount,
  StorefrontProduct,
  CartItem,
  ParentOrder,
  LedgerTransaction,
} from "../../types"

interface Props {
  locale: Locale
  setLocale: (l: Locale) => void
  onSwitchPortal?: (portal: "b2b" | "supplier" | "admin") => void
}

export function B2CPortal({ locale, setLocale, onSwitchPortal }: Props) {
  const isRtl = locale === "ar"
  const t = translations[locale]
  const tc = t.b2c

  const [activeTab, setActiveTab] = useState<B2CPage>("home")
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [selectedProduct, setSelectedProduct] =
    useState<StorefrontProduct | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<B2CCustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [wallet, setWallet] = useState<WalletAccount | null>(null)
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [orders, setOrders] = useState<ParentOrder[]>([])

  // UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState("50")
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">(
    "wallet",
  )
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  // New Address Form State
  const [newAddr, setNewAddr] = useState({
    label: "Home" as const,
    recipientName: "سارة الزهراني / Sara",
    recipientPhone: "+966501234567",
    city: "الرياض / Riyadh",
    district: "حي العليا / Olaya",
    streetAddress: "شارع التحلية، عمارة 42",
    buildingNumber: "42",
    floorNumber: "3",
    apartmentNumber: "12",
    deliveryInstructions: "يرجى ترك الشحنة عند الباب",
    isDefault: true,
  })

  useEffect(() => {
    loadB2CData()
  }, [])

  const loadB2CData = async () => {
    try {
      const [addrList, wlt, txList, ordList] = await Promise.all([
        api.getCustomerAddresses(),
        api.getB2CWallet(),
        api.getLedgerTransactions("b2c"),
        api.getOrders(),
      ])
      setAddresses(addrList)
      if (addrList.length > 0) {
        const def = addrList.find((a) => a.isDefault) || addrList[0]
        setSelectedAddressId(def.id)
      }
      setWallet(wlt)
      setTransactions(txList)
      if (ordList && ordList.length > 0) {
        setOrders(
          ordList.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            date: o.created_at ? o.created_at.split("T")[0] : "2026-11-04",
            total: o.grand_total_cents / 100,
            status: "Delivered",
            paymentMethod: o.payment_method || "Consumer Wallet (2050)",
            orderType: "b2c",
            destinationAddress: "Olaya District, Riyadh",
            suborders: (o.suborders || []).map((so) => ({
              id: so.id,
              suborderNumber: so.suborder_number,
              supplierName: so.supplier_name,
              itemsCount: (so.items || []).length || 1,
              amount: so.subtotal_cents / 100,
              status: "Delivered",
              trackingNumber: `SMSA-${so.suborder_number}`,
            })),
          })),
        )
      }
    } catch (e) {
      console.error("Failed to load B2C initial data", e)
    }

    try {
      const prods = await api.getProducts()
      if (prods && prods.length > 0) {
        setProducts(
          prods.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category_name,
            image:
              "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60",
            brand: p.brand_name || "Premium Brand",
            description: p.description,
            rating: 4.8,
            reviewCount: 128,
            specs: p.attributes || {
              Color: "Matte Black",
              Warranty: "2 Years Official",
            },
            offers: [
              {
                id: `ret-off-${p.id}`,
                supplierId: "sup-retail",
                supplierName: "Direct Retail Fulfilled",
                supplierRating: 4.9,
                verified: true,
                price: ((p.min_price_cents || 2400) * 1.25) / 100, // Consumer Retail Unit Price
                moq: 1, // Single-unit consumer purchase
                stock: p.total_stock || 120,
                location: "Central Riyadh Hub",
                deliveryDays: 1,
                returnPolicy: "Hassle-Free Return Policy",
                b2cEnabled: true,
                retailPrice: ((p.min_price_cents || 2400) * 1.25) / 100,
              },
            ],
          })),
        )
      }
    } catch {}
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleAddToCart = (product: StorefrontProduct, qty = 1) => {
    const offer = product.offers[0]
    const existingIndex = cart.findIndex((item) => item.offer.id === offer.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += qty
      setCart(updated)
    } else {
      setCart([...cart, { product, offer, quantity: qty }])
    }
    showToast(
      isRtl
        ? `تمت إضافة ${product.name.ar} إلى السلة`
        : `Added ${product.name.en} to cart`,
    )
  }

  const handleExecuteCheckout = async () => {
    if (cart.length === 0) return
    const selectedAddr =
      addresses.find((a) => a.id === selectedAddressId) || addresses[0]
    const totalAmount = cart.reduce((s, i) => s + i.offer.price * i.quantity, 0)

    try {
      await api.checkout({
        items: cart.map((i) => ({
          offer_id: i.offer.id,
          quantity: i.quantity,
        })),
        payment_method: paymentMethod === "wallet" ? "wallet" : "credit_card",
        idempotency_key: `b2c-checkout-${Date.now()}`,
      })
    } catch {}

    const orderId = `ORD-RET-${Math.floor(10000 + Math.random() * 90000)}`
    const newOrder: ParentOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: orderId,
      date: new Date().toISOString().split("T")[0],
      total: totalAmount,
      status: "Confirmed",
      paymentMethod:
        paymentMethod === "wallet"
          ? "Consumer Wallet (Account 2050)"
          : "Credit Card (Visa/Mastercard)",
      orderType: "b2c",
      destinationAddress: `${selectedAddr?.streetAddress}, ${selectedAddr?.city}`,
      suborders: [
        {
          id: `so-${Date.now()}`,
          suborderNumber: `SUB-${orderId}`,
          supplierName: "Direct Fulfillment Express",
          itemsCount: cart.length,
          amount: totalAmount,
          status: "Processing",
          trackingNumber: `SMSA-${Date.now().toString().slice(-8)}`,
        },
      ],
    }

    setOrders([newOrder, ...orders])
    setCart([])
    setConfirmedOrderId(orderId)
    setActiveTab("orders")
    showToast(
      isRtl
        ? `تم استلام طلبك بنجاح! رقم الطلب: ${orderId}`
        : `Order placed successfully! #${orderId}`,
    )
  }

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount)
    if (isNaN(amount) || amount <= 0) return
    await api.topupWallet("b2c", amount * 100)
    const w = await api.getB2CWallet()
    setWallet(w)
    setShowTopupModal(false)
    showToast(
      isRtl
        ? `تم شحن رصيد المحفظة بمبلغ $${amount}`
        : `Wallet topped up by $${amount}`,
    )
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      searchQuery === "" ||
      p.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.ar.includes(searchQuery)
    const matchCat =
      selectedCategory === "All" || p.category.en === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px)",
        background: "#090d16",
        color: "#f8fafc",
        fontFamily: "'Cairo', sans-serif",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: isRtl ? "auto" : 24,
            left: isRtl ? 24 : "auto",
            zIndex: 100,
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Retail Header Bar */}
      <header
        style={{
          background: "#0d1322",
          borderBottom: "1px solid #1e293b",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            onClick={() => setActiveTab("home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontSize: 18,
              }}
            >
              🛍️
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff" }}>
                {tc.brandTitle}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {tc.brandSub}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", gap: 14 }}>
            {[
              { id: "home" as B2CPage, label: tc.navHome },
              { id: "catalog" as B2CPage, label: tc.navCatalog },
              { id: "orders" as B2CPage, label: tc.navOrders },
              { id: "addresses" as B2CPage, label: tc.navAddresses },
              { id: "wallet" as B2CPage, label: tc.navWallet },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background:
                    activeTab === item.id
                      ? "rgba(16, 185, 129, 0.15)"
                      : "transparent",
                  color: activeTab === item.id ? "#34d399" : "#94a3b8",
                  border: 0,
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: 440, position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              top: 12,
              [isRtl ? "right" : "left"]: 12,
              color: "#64748b",
            }}
          />
          <input
            type="text"
            placeholder={tc.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (activeTab !== "catalog") setActiveTab("catalog")
            }}
            style={{
              width: "100%",
              background: "#111827",
              color: "#ffffff",
              border: "1px solid #334155",
              borderRadius: 20,
              padding: isRtl ? "8px 36px 8px 16px" : "8px 16px 8px 36px",
              fontSize: 13,
            }}
          />
        </div>

        {/* Right Actions: Cart & Switch to B2B */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Cart Icon */}
          <button
            onClick={() => setActiveTab("cart")}
            style={{
              background: "#111827",
              border: "1px solid #334155",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <ShoppingCart size={16} />
            <span>{tc.navCart}</span>
            {cart.length > 0 && (
              <span
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  borderRadius: 12,
                  padding: "1px 7px",
                  fontSize: 11,
                }}
              >
                {cart.length}
              </span>
            )}
          </button>

          {/* Switch Context to B2B */}
          <button
            onClick={() => onSwitchPortal?.("b2b")}
            style={{
              background: "rgba(37, 99, 235, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(37, 99, 235, 0.4)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span>🏢</span>
            <span>
              {isRtl ? "بوابة الشركات (B2B)" : "Switch to B2B Procurement"}
            </span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ padding: "28px 36px", maxWidth: 1300, margin: "0 auto" }}>
        {/* HOME TAB */}
        {activeTab === "home" && (
          <div>
            {/* Hero Marketing Banner */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%)",
                borderRadius: 16,
                padding: "44px 48px",
                marginBottom: 36,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 12px 30px rgba(5, 150, 105, 0.2)",
              }}
            >
              <div style={{ maxWidth: 540 }}>
                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  🌟{" "}
                  {isRtl ? "موسم التخفيضات الكبرى" : "EXCLUSIVE CONSUMER DEALS"}
                </span>
                <h1
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "14px 0 10px 0",
                    lineHeight: 1.2,
                  }}
                >
                  {tc.heroTitle}
                </h1>
                <p
                  style={{
                    color: "#d1fae5",
                    fontSize: 16,
                    margin: "0 0 24px 0",
                  }}
                >
                  {tc.heroSubtitle}
                </p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  style={{
                    background: "#ffffff",
                    color: "#065f46",
                    border: 0,
                    padding: "12px 28px",
                    borderRadius: 24,
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  }}
                >
                  {tc.shopDealsBtn} →
                </button>
              </div>
              <div style={{ fontSize: 90, opacity: 0.9 }}>🎁</div>
            </div>

            {/* Value Propositions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 18,
                marginBottom: 36,
              }}
            >
              <div
                style={{
                  background: "#111827",
                  padding: "18px 24px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Truck size={28} style={{ color: "#10b981" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {isRtl ? "توصيل سريع مجاني" : "Fast Doorstep Delivery"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {isRtl ? "للطلبات فوق 100 ريال" : "On orders over $50"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "#111827",
                  padding: "18px 24px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <ShieldCheck size={28} style={{ color: "#38bdf8" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {isRtl
                      ? "ضمان المنتجات الأصلية 100%"
                      : "100% Verified Quality"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {isRtl
                      ? "من الموردين المعتمدين"
                      : "Direct from audited suppliers"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "#111827",
                  padding: "18px 24px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <WalletCards size={28} style={{ color: "#f59e0b" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {isRtl
                      ? "محفظة كاش باك ومكافآت"
                      : "Instant Wallet & Cashback"}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {isRtl
                      ? "استرداد نقدي فوري"
                      : "Automatic credits to Account 2050"}
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Deals Grid */}
            <div
              style={{
                marginBottom: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                {tc.trendingDeals}
              </h2>
              <button
                onClick={() => setActiveTab("catalog")}
                style={{
                  background: "transparent",
                  color: "#34d399",
                  border: 0,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {isRtl ? "عرض جميع المنتجات" : "View All Products"} →
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {products.slice(0, 4).map((p) => {
                const offer = p.offers[0]
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#111827",
                      borderRadius: 12,
                      border: "1px solid #1f2937",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        height: 180,
                        background: "#1e293b",
                        position: "relative",
                      }}
                    >
                      <img
                        src={p.image}
                        alt={p.name.en}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: isRtl ? "auto" : 10,
                          left: isRtl ? 10 : "auto",
                          background: "rgba(16, 185, 129, 0.9)",
                          color: "#ffffff",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {isRtl ? "متوفر" : "In Stock"}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {p.category.en}
                      </div>
                      <h4
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          margin: "4px 0 8px 0",
                          color: "#ffffff",
                        }}
                      >
                        {isRtl ? p.name.ar : p.name.en}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                          margin: "6px 0 14px 0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 900,
                            color: "#10b981",
                          }}
                        >
                          ${offer.price.toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            textDecoration: "line-through",
                          }}
                        >
                          ${(offer.price * 1.2).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(p, 1)}
                        style={{
                          marginTop: "auto",
                          width: "100%",
                          background:
                            "linear-gradient(135deg, #10b981, #059669)",
                          color: "#ffffff",
                          border: 0,
                          padding: "10px",
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {tc.addToCartBtn}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* RETAIL CATALOG TAB */}
        {activeTab === "catalog" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: "0 0 6px 0",
                }}
              >
                {tc.navCatalog}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Showing {filteredProducts.length} verified products with
                individual unit pricing
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {filteredProducts.map((p) => {
                const offer = p.offers[0]
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#111827",
                      borderRadius: 12,
                      border: "1px solid #1f2937",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        height: 190,
                        background: "#1e293b",
                        position: "relative",
                      }}
                    >
                      <img
                        src={p.image}
                        alt={p.name.en}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        padding: "18px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {p.category.en} • {p.brand}
                      </div>
                      <h4
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          margin: "6px 0 10px 0",
                          color: "#ffffff",
                        }}
                      >
                        {isRtl ? p.name.ar : p.name.en}
                      </h4>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: "#10b981",
                          margin: "6px 0 14px 0",
                        }}
                      >
                        ${offer.price.toFixed(2)}
                      </div>

                      <div
                        style={{ display: "flex", gap: 8, marginTop: "auto" }}
                      >
                        <button
                          onClick={() => handleAddToCart(p, 1)}
                          style={{
                            flex: 1,
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                            color: "#ffffff",
                            border: 0,
                            padding: "10px",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          {tc.addToCartBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CONSUMER CART TAB */}
        {activeTab === "cart" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: "0 0 6px 0",
                }}
              >
                {tc.cartTitle}
              </h1>
            </div>

            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  background: "#111827",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <ShoppingBag
                  size={48}
                  style={{ color: "#64748b", marginBottom: 12 }}
                />
                <h3
                  style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0" }}
                >
                  {tc.emptyCartMsg}
                </h3>
                <button
                  onClick={() => setActiveTab("catalog")}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: 0,
                    color: "#ffffff",
                    padding: "10px 24px",
                    borderRadius: 20,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {isRtl ? "تصفح المنتجات الآن" : "Browse Products"}
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 24,
                }}
              >
                {/* Cart Items List */}
                <div
                  style={{
                    background: "#111827",
                    padding: "24px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: "16px 0",
                        borderBottom: "1px solid #1f2937",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name.en}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            margin: "0 0 4px 0",
                          }}
                        >
                          {isRtl ? item.product.name.ar : item.product.name.en}
                        </h4>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Single-Unit Retail Purchase
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: "#10b981",
                          }}
                        >
                          ${(item.offer.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => {
                            const updated = cart.filter((_, i) => i !== idx)
                            setCart(updated)
                          }}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: "#ef4444",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Summary Card */}
                <div
                  style={{
                    background: "#111827",
                    padding: "24px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    height: "fit-content",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      margin: "0 0 16px 0",
                    }}
                  >
                    {tc.checkoutBtn}
                  </h3>

                  {/* Delivery Address Selection */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94a3b8",
                        marginBottom: 6,
                      }}
                    >
                      {tc.step1Address}
                    </label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#0b0f19",
                        color: "#ffffff",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        padding: "10px",
                        fontSize: 13,
                      }}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}: {a.streetAddress} ({a.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method Selector */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94a3b8",
                        marginBottom: 6,
                      }}
                    >
                      {tc.step2Payment}
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setPaymentMethod("wallet")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: `1px solid ${
                            paymentMethod === "wallet" ? "#10b981" : "#334155"
                          }`,
                          background:
                            paymentMethod === "wallet"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "#0b0f19",
                          color:
                            paymentMethod === "wallet" ? "#34d399" : "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Wallet 2050 ($
                        {((wallet?.availableBalanceCents || 0) / 100).toFixed(
                          2,
                        )}
                        )
                      </button>
                      <button
                        onClick={() => setPaymentMethod("card")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: `1px solid ${
                            paymentMethod === "card" ? "#10b981" : "#334155"
                          }`,
                          background:
                            paymentMethod === "card"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "#0b0f19",
                          color:
                            paymentMethod === "card" ? "#34d399" : "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Credit Card
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #1f2937",
                      paddingTop: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: 13,
                        color: "#94a3b8",
                      }}
                    >
                      <span>Subtotal</span>
                      <span>
                        $
                        {cart
                          .reduce((s, i) => s + i.offer.price * i.quantity, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: 13,
                        color: "#94a3b8",
                      }}
                    >
                      <span>Delivery</span>
                      <span style={{ color: "#34d399" }}>FREE</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#ffffff",
                      }}
                    >
                      <span>{tc.orderTotal}</span>
                      <span>
                        $
                        {cart
                          .reduce((s, i) => s + i.offer.price * i.quantity, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteCheckout}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#ffffff",
                      border: 0,
                      padding: "12px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {tc.placeOrderBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMER ORDERS TAB */}
        {activeTab === "orders" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: "0 0 6px 0",
                }}
              >
                {tc.ordersTitle}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Review live package milestones and past retail purchases
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: "#111827",
                    padding: "20px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                      borderBottom: "1px solid #1f2937",
                      paddingBottom: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#34d399",
                        }}
                      >
                        {o.orderNumber || o.id}
                      </span>
                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          margin: "0 10px",
                        }}
                      >
                        • {o.date}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: "#ffffff",
                        }}
                      >
                        ${o.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}
                  >
                    Delivered to: <b>{o.destinationAddress}</b> • Paid via:{" "}
                    <b>{o.paymentMethod}</b>
                  </div>

                  {/* Delivery Timeline Milestones */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#0b0f19",
                      padding: "14px 20px",
                      borderRadius: 8,
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "#34d399",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ✓ {tc.milestonePlaced}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        background: "#10b981",
                        margin: "0 12px",
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "#34d399",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ✓ {tc.milestonePacking}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        background: "#10b981",
                        margin: "0 12px",
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "#34d399",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ✓ {tc.milestoneShipped}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        background: "#10b981",
                        margin: "0 12px",
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "#34d399",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        ✓ {tc.milestoneDelivered}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOMER ADDRESSES TAB */}
        {activeTab === "addresses" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "0 0 6px 0",
                  }}
                >
                  {tc.addressBookTitle}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  Manage your personal home and office delivery addresses
                </p>
              </div>
              <button
                onClick={() => setShowAddAddressModal(true)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {tc.addNewAddress}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {addresses.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: "#111827",
                    padding: "24px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {a.label === "Home" ? (
                        <Home size={16} />
                      ) : (
                        <Briefcase size={16} />
                      )}{" "}
                      {a.label}
                    </span>
                    {a.isDefault && (
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#ffffff",
                      marginBottom: 4,
                    }}
                  >
                    {a.recipientName}
                  </div>
                  <div
                    style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}
                  >
                    {a.recipientPhone}
                  </div>
                  <div
                    style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}
                  >
                    {a.streetAddress}, Bldg {a.buildingNumber}, Apt{" "}
                    {a.apartmentNumber}
                    <br />
                    {a.district}, {a.city}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSUMER WALLET (2050) TAB */}
        {activeTab === "wallet" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "0 0 6px 0",
                  }}
                >
                  {tc.walletTitle}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  Consumer Liability Account 2050 • Instant 1-click purchases &
                  refunds
                </p>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Add Funds
              </button>
            </div>

            <div
              style={{
                background: "#111827",
                padding: "24px",
                borderRadius: 12,
                border: "1px solid #1f2937",
                marginBottom: 28,
                maxWidth: 500,
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>
                {tc.consumerBalance}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#10b981",
                  margin: "8px 0",
                }}
              >
                ${((wallet?.availableBalanceCents || 0) / 100).toFixed(2)}
              </div>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                Account 2050 • Instant 1-Click Checkout Enabled
              </div>
            </div>

            <div
              style={{
                background: "#111827",
                padding: "24px",
                borderRadius: 12,
                border: "1px solid #1f2937",
              }}
            >
              <h3
                style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px 0" }}
              >
                Recent Wallet Activity
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: "#64748b",
                      borderBottom: "1px solid #1f2937",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    <th style={{ padding: "10px" }}>Date</th>
                    <th style={{ padding: "10px" }}>Description</th>
                    <th style={{ padding: "10px" }}>Reference</th>
                    <th style={{ padding: "10px" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: "1px solid #1f2937" }}
                    >
                      <td style={{ padding: "12px 10px", color: "#94a3b8" }}>
                        {tx.date}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {isRtl ? tx.description.ar : tx.description.en}
                      </td>
                      <td style={{ padding: "12px 10px", color: "#94a3b8" }}>
                        {tx.referenceId}
                      </td>
                      <td
                        style={{
                          padding: "12px 10px",
                          fontWeight: 800,
                          color: tx.isDebit ? "#ef4444" : "#10b981",
                        }}
                      >
                        {tx.isDebit ? "-" : "+"}$
                        {(tx.amountCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* TOPUP MODAL */}
      {showTopupModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#111827",
              padding: "28px",
              borderRadius: 12,
              border: "1px solid #334155",
              width: "100%",
              maxWidth: 380,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px 0" }}>
              Top Up Consumer Wallet (2050)
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>
              Instant funds for 1-click retail purchases
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {["25", "50", "100", "200"].map((val) => (
                <button
                  key={val}
                  onClick={() => setTopupAmount(val)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 8,
                    border: `1px solid ${
                      topupAmount === val ? "#10b981" : "#334155"
                    }`,
                    background:
                      topupAmount === val
                        ? "rgba(16, 185, 129, 0.15)"
                        : "#0b0f19",
                    color: topupAmount === val ? "#34d399" : "#94a3b8",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ${val}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleTopup}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Confirm ${topupAmount}
              </button>
              <button
                onClick={() => setShowTopupModal(false)}
                style={{
                  background: "#1f2937",
                  color: "#94a3b8",
                  border: 0,
                  padding: "12px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ADDRESS MODAL */}
      {showAddAddressModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#111827",
              padding: "28px",
              borderRadius: 12,
              border: "1px solid #334155",
              width: "100%",
              maxWidth: 440,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 16px 0" }}>
              {tc.addNewAddress}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <input
                type="text"
                placeholder="Recipient Full Name"
                value={newAddr.recipientName}
                onChange={(e) =>
                  setNewAddr({ ...newAddr, recipientName: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px",
                }}
              />
              <input
                type="text"
                placeholder="Phone Number (e.g. +966501234567)"
                value={newAddr.recipientPhone}
                onChange={(e) =>
                  setNewAddr({ ...newAddr, recipientPhone: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px",
                }}
              />
              <input
                type="text"
                placeholder="Street Address Line"
                value={newAddr.streetAddress}
                onChange={(e) =>
                  setNewAddr({ ...newAddr, streetAddress: e.target.value })
                }
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px",
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Building #"
                  value={newAddr.buildingNumber}
                  onChange={(e) =>
                    setNewAddr({ ...newAddr, buildingNumber: e.target.value })
                  }
                  style={{
                    flex: 1,
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
                <input
                  type="text"
                  placeholder="Apartment #"
                  value={newAddr.apartmentNumber}
                  onChange={(e) =>
                    setNewAddr({ ...newAddr, apartmentNumber: e.target.value })
                  }
                  style={{
                    flex: 1,
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  if (!newAddr.recipientName || !newAddr.streetAddress) return
                  await api.createCustomerAddress(newAddr)
                  const list = await api.getCustomerAddresses()
                  setAddresses(list)
                  setShowAddAddressModal(false)
                  showToast(
                    isRtl
                      ? "تم حفظ العنوان الجديد بنجاح"
                      : "New address saved to address book",
                  )
                }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Save Address
              </button>
              <button
                onClick={() => setShowAddAddressModal(false)}
                style={{
                  background: "#1f2937",
                  color: "#94a3b8",
                  border: 0,
                  padding: "12px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
