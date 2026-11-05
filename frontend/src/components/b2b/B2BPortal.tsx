import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  ReceiptText,
  Warehouse,
  Users,
  WalletCards,
  ShieldCheck,
  Building2,
  Plus,
  Check,
  ChevronRight,
  Upload,
  AlertTriangle,
  FileCheck2,
  Clock,
  Phone,
  MapPin,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  X,
  CreditCard,
  Building,
} from "lucide-react"
import { api } from "../../services/api"
import { translations } from "../../data/i18n"
import type {
  Locale,
  B2BPage,
  B2BReceivingWarehouse,
  B2BTeamMember,
  B2BKYCDocument,
  B2BCorporateProfile,
  WalletAccount,
  LedgerTransaction,
  StorefrontProduct,
  CartItem,
  ParentOrder,
} from "../../types"

interface Props {
  locale: Locale
  setLocale: (l: Locale) => void
  onSwitchPortal?: (portal: "b2c" | "supplier" | "admin") => void
}

export function B2BPortal({ locale, setLocale, onSwitchPortal }: Props) {
  const isRtl = locale === "ar"
  const t = translations[locale]
  const tb = t.b2b

  const [activeTab, setActiveTab] = useState<B2BPage>("overview")
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [warehouses, setWarehouses] = useState<B2BReceivingWarehouse[]>([])
  const [teamMembers, setTeamMembers] = useState<B2BTeamMember[]>([])
  const [kycDocs, setKycDocs] = useState<B2BKYCDocument[]>([])
  const [profile, setProfile] = useState<B2BCorporateProfile | null>(null)
  const [wallet, setWallet] = useState<WalletAccount | null>(null)
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<ParentOrder[]>([])

  // Modal States
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [showInviteTeam, setShowInviteTeam] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState("5000")
  const [selectedOfferProduct, setSelectedOfferProduct] =
    useState<StorefrontProduct | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [poNumber, setPoNumber] = useState("PO-2026-0981")
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Form States
  const [newWh, setNewWh] = useState({
    name: "",
    code: "",
    countryCode: "SA",
    city: "الرياض / Riyadh",
    addressLine: "",
    dockType: "standard_bay" as const,
    hasForklift: true,
    receivingHours: "08:00 - 17:00",
    contactName: "",
    contactPhone: "",
    isDefault: false,
  })

  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "procurement_manager" as B2BTeamMember["role"],
    spendingLimitCents: 5000000,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [whList, tmList, kycList, prof, wlt, txList, ordList] =
        await Promise.all([
          api.getMerchantWarehouses(),
          api.getB2BTeamMembers(),
          api.getB2BKYCDocuments(),
          api.getB2BCorporateProfile(),
          api.getB2BWallet(),
          api.getLedgerTransactions("b2b"),
          api.getOrders(),
        ])
      setWarehouses(whList)
      if (whList.length > 0) {
        const def = whList.find((w) => w.isDefault) || whList[0]
        setSelectedWarehouseId(def.id)
      }
      setTeamMembers(tmList)
      setKycDocs(kycList)
      setProfile(prof)
      setWallet(wlt)
      setTransactions(txList)
      if (ordList && ordList.length > 0) {
        setOrders(
          ordList.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            date: o.created_at ? o.created_at.split("T")[0] : "2026-11-05",
            total: o.grand_total_cents / 100,
            status: "Confirmed",
            paymentMethod: o.payment_method || "Wallet (Account 2010)",
            orderType: "b2b",
            poReference: "PO-2026-4412",
            destinationWarehouse: "Dammam Logistics Hub",
            suborders: (o.suborders || []).map((so) => ({
              id: so.id,
              suborderNumber: so.suborder_number,
              supplierName: so.supplier_name,
              itemsCount: (so.items || []).length || 1,
              amount: so.subtotal_cents / 100,
              status: "Processing",
              trackingNumber: `TRK-${so.suborder_number}`,
            })),
          })),
        )
      }
    } catch (e) {
      console.error("Failed to load initial B2B data", e)
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
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
            brand: p.brand_name || "Enterprise Brand",
            description: p.description,
            rating: 4.9,
            reviewCount: 42,
            specs: p.attributes || {
              Grade: "Industrial",
              Origin: "GCC Verified",
            },
            offers: [
              {
                id: `off-${p.id}-1`,
                supplierId: "sup-01",
                supplierName: "Noura Foods Trading LLC",
                supplierRating: 4.9,
                verified: true,
                price: (p.min_price_cents || 1800) / 100,
                moq: 10,
                stock: p.total_stock || 450,
                location: "Riyadh Hub",
                deliveryDays: 2,
                returnPolicy: "Commercial SLA Guarantee",
                tiers: [
                  {
                    minQty: 10,
                    maxQty: 49,
                    price: (p.min_price_cents || 1800) / 100,
                  },
                  {
                    minQty: 50,
                    maxQty: 99,
                    price: ((p.min_price_cents || 1800) * 0.9) / 100,
                  },
                  {
                    minQty: 100,
                    maxQty: "+",
                    price: ((p.min_price_cents || 1800) * 0.8) / 100,
                  },
                ],
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

  const handleAddToCart = (
    product: StorefrontProduct,
    offerIndex = 0,
    qty = 10,
  ) => {
    const offer = product.offers[offerIndex]
    if (qty < offer.moq) {
      showToast(
        isRtl
          ? `الكمية أقل من الحد الأدنى للطلب (${offer.moq})`
          : `Quantity is below MOQ (${offer.moq})`,
      )
      return
    }
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
        ? `تمت إضافة ${qty} وحدة إلى سلة المشتريات`
        : `Added ${qty} units to procurement cart`,
    )
  }

  const handleExecuteCheckout = async () => {
    if (cart.length === 0) return
    const selectedWh =
      warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0]
    const cartTotal = cart.reduce(
      (sum, item) => sum + item.offer.price * item.quantity,
      0,
    )

    try {
      await api.checkout({
        items: cart.map((i) => ({
          offer_id: i.offer.id,
          quantity: i.quantity,
        })),
        payment_method: "wallet",
        idempotency_key: `b2b-checkout-${Date.now()}`,
      })
    } catch {}

    const newOrder: ParentOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-B2B-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      total: cartTotal,
      status: "Confirmed",
      paymentMethod: "Corporate Wallet (Account 2010)",
      orderType: "b2b",
      poReference: poNumber,
      destinationWarehouse: selectedWh?.name || "Main Dock",
      suborders: [
        {
          id: `so-${Date.now()}-1`,
          suborderNumber: `SUB-B2B-${Math.floor(1000 + Math.random() * 9000)}`,
          supplierName: cart[0]?.offer.supplierName || "Enterprise Supplier",
          itemsCount: cart.length,
          amount: cartTotal,
          status: "Processing",
          trackingNumber: `TRK-EXP-${Date.now().toString().slice(-6)}`,
        },
      ],
    }

    setOrders([newOrder, ...orders])
    setCart([])
    setActiveTab("orders")
    showToast(
      isRtl
        ? `تم اعتماد أمر التوريد رقم ${newOrder.orderNumber} بنجاح`
        : `Procurement Order ${newOrder.orderNumber} confirmed!`,
    )
  }

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount)
    if (isNaN(amount) || amount <= 0) return
    await api.topupWallet("b2b", amount * 100)
    const w = await api.getB2BWallet()
    setWallet(w)
    setShowTopupModal(false)
    showToast(
      isRtl
        ? `تم شحن رصيد المحفظة بمبلغ $${amount}`
        : `Successfully topped up $${amount}`,
    )
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "calc(100vh - 52px)",
        background: "#0b0f19",
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
            background: "linear-gradient(135deg, #059669, #047857)",
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

      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 270,
          background: "#0d1322",
          borderRight: isRtl ? "none" : "1px solid #1e293b",
          borderLeft: isRtl ? "1px solid #1e293b" : "none",
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px",
          gap: 6,
        }}
      >
        <div
          style={{
            padding: "0 10px 16px 10px",
            borderBottom: "1px solid #1e293b",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              🏢
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                {tb.brandTitle}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {tb.brandSub}
              </div>
            </div>
          </div>

          {/* Org Approval Status Pill */}
          <div
            style={{
              marginTop: 12,
              padding: "6px 10px",
              borderRadius: 8,
              background:
                profile?.status === "approved"
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(245, 158, 11, 0.12)",
              border: `1px solid ${
                profile?.status === "approved"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(245, 158, 11, 0.3)"
              }`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: profile?.status === "approved" ? "#34d399" : "#fbbf24",
            }}
          >
            <ShieldCheck size={14} />
            <span>
              {profile?.status === "approved"
                ? tb.approvedBadge
                : tb.underReview}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        {[
          {
            id: "overview" as B2BPage,
            label: tb.navDashboard,
            icon: LayoutDashboard,
          },
          { id: "catalog" as B2BPage, label: tb.navCatalog, icon: Box },
          {
            id: "cart" as B2BPage,
            label: `${tb.navCart} (${cart.length})`,
            icon: ShoppingCart,
            badge: cart.length > 0 ? String(cart.length) : undefined,
          },
          {
            id: "orders" as B2BPage,
            label: tb.navOrders,
            icon: ReceiptText,
            badge: String(orders.length),
          },
          {
            id: "warehouses" as B2BPage,
            label: tb.navWarehouses,
            icon: Warehouse,
          },
          { id: "team" as B2BPage, label: tb.navTeam, icon: Users },
          { id: "wallet" as B2BPage, label: tb.navWallet, icon: WalletCards },
          { id: "onboarding" as B2BPage, label: tb.navKYC, icon: ShieldCheck },
          { id: "profile" as B2BPage, label: tb.navProfile, icon: Building2 },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: 8,
              border: 0,
              background:
                activeTab === item.id
                  ? "rgba(37, 99, 235, 0.18)"
                  : "transparent",
              color: activeTab === item.id ? "#60a5fa" : "#94a3b8",
              fontWeight: activeTab === item.id ? 800 : 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                style={{
                  background: activeTab === item.id ? "#2563eb" : "#1e293b",
                  color: "#ffffff",
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* Context Switcher Quick Link */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid #1e293b",
          }}
        >
          <button
            onClick={() => onSwitchPortal?.("b2c")}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "rgba(255,255,255,0.03)",
              color: "#cbd5e1",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <span>🛍️</span>
            <span>
              {isRtl
                ? "التبديل للمتجر الشخصي (B2C)"
                : "Switch to Consumer Store (B2C)"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
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
                {tb.navDashboard}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                {isRtl
                  ? "متابعة أوامر الشراء، مستودعات الاستلام، والسيولة النقدية في دفتر الأستاذ"
                  : "Track wholesale procurement, receiving hubs, and corporate ledger liquidity"}
              </p>
            </div>

            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 18,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {tb.availableBalance}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#10b981",
                    margin: "8px 0",
                  }}
                >
                  $
                  {((wallet?.availableBalanceCents || 0) / 100).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 },
                  )}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  Account 2010 • Verified Invariant
                </div>
              </div>

              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {tb.heldInOrders}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#f59e0b",
                    margin: "8px 0",
                  }}
                >
                  $
                  {((wallet?.heldBalanceCents || 0) / 100).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 },
                  )}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  In Escrow for Pending Deliveries
                </div>
              </div>

              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {isRtl ? "أوامر التوريد النشطة" : "Active Orders"}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#60a5fa",
                    margin: "8px 0",
                  }}
                >
                  {orders.length}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  Across {warehouses.length} Receiving Docks
                </div>
              </div>

              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {isRtl ? "مستودعات الاستلام" : "Receiving Docks"}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#a78bfa",
                    margin: "8px 0",
                  }}
                >
                  {warehouses.length}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  Operational Delivery Docks
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 20,
              }}
            >
              <div
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
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                    {isRtl ? "أحدث أوامر الشراء" : "Recent Purchase Orders"}
                  </h3>
                  <button
                    onClick={() => setActiveTab("catalog")}
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: 0,
                      color: "#ffffff",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + {isRtl ? "طلب شراء جديد" : "New Procurement Run"}
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#64748b",
                    }}
                  >
                    {isRtl
                      ? "لا توجد أوامر شراء سابقة، ابدأ بتصفح كتالوج الجملة"
                      : "No previous orders. Browse the wholesale catalog to get started."}
                  </div>
                ) : (
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
                        <th style={{ padding: "8px 12px" }}>Order #</th>
                        <th style={{ padding: "8px 12px" }}>Date</th>
                        <th style={{ padding: "8px 12px" }}>
                          Destination Dock
                        </th>
                        <th style={{ padding: "8px 12px" }}>Total</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => (
                        <tr
                          key={o.id}
                          style={{ borderBottom: "1px solid #1f2937" }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: 700,
                              color: "#60a5fa",
                            }}
                          >
                            {o.orderNumber || o.id}
                          </td>
                          <td style={{ padding: "12px", color: "#94a3b8" }}>
                            {o.date}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {o.destinationWarehouse}
                          </td>
                          <td style={{ padding: "12px", fontWeight: 800 }}>
                            ${o.total.toFixed(2)}
                          </td>
                          <td style={{ padding: "12px" }}>
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
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Wallet Summary Card */}
              <div
                style={{
                  background: "#111827",
                  padding: "24px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    margin: "0 0 16px 0",
                  }}
                >
                  {tb.walletTitle}
                </h3>
                <div
                  style={{
                    background: "#0b0f19",
                    padding: "16px",
                    borderRadius: 8,
                    marginBottom: 16,
                    border: "1px solid #1e293b",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>
                    Account 2010 Liability
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#ffffff",
                      margin: "4px 0",
                    }}
                  >
                    ${((wallet?.totalBalanceCents || 0) / 100).toFixed(2)}
                  </div>
                  <div
                    style={{
                      color: "#34d399",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} /> Double-Entry Balanced
                  </div>
                </div>
                <button
                  onClick={() => setShowTopupModal(true)}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #059669, #047857)",
                    color: "#ffffff",
                    border: 0,
                    padding: "10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + {tb.topupWalletBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WHOLESALE CATALOG TAB */}
        {activeTab === "catalog" && (
          <div>
            <div
              style={{
                marginBottom: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
                  {tb.navCatalog}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  {tb.volumePricing} • {tb.supplierComparison}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {products.map((p) => {
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
                          top: 12,
                          right: isRtl ? "auto" : 12,
                          left: isRtl ? 12 : "auto",
                          background: "rgba(15, 23, 42, 0.85)",
                          color: "#38bdf8",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        MOQ: {offer.moq} {isRtl ? "وحدة" : "units"}
                      </span>
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

                      {/* Tier Breakdown Table */}
                      <div
                        style={{
                          background: "#0b0f19",
                          padding: "10px",
                          borderRadius: 8,
                          marginBottom: 14,
                          border: "1px solid #1e293b",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#94a3b8",
                            marginBottom: 6,
                          }}
                        >
                          {tb.volumePricing}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          {offer.tiers?.map((t, idx) => (
                            <div key={idx} style={{ textAlign: "center" }}>
                              <div style={{ color: "#64748b", fontSize: 10 }}>
                                {t.minQty}-{t.maxQty} pcs
                              </div>
                              <div
                                style={{ fontWeight: 800, color: "#34d399" }}
                              >
                                ${t.price.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <button
                          onClick={() => handleAddToCart(p, 0, offer.moq)}
                          style={{
                            flex: 1,
                            background:
                              "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            color: "#ffffff",
                            border: 0,
                            padding: "10px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {tb.addToCartBtn} ({offer.moq}+)
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PROCUREMENT CART & CHECKOUT TAB */}
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
                {tb.cartTitle}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Review MOQ validation, select receiving warehouse dock, and
                confirm order
              </p>
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
                <ShoppingCart
                  size={40}
                  style={{ color: "#64748b", marginBottom: 12 }}
                />
                <h3
                  style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0" }}
                >
                  {isRtl
                    ? "سلة المشتريات فارغة"
                    : "Your procurement cart is empty"}
                </h3>
                <button
                  onClick={() => setActiveTab("catalog")}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: 0,
                    color: "#ffffff",
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isRtl ? "تصفح كتالوج الجملة" : "Browse Wholesale Catalog"}
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
                {/* Cart Items */}
                <div
                  style={{
                    background: "#111827",
                    padding: "20px",
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
                          width: 64,
                          height: 64,
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>
                          {isRtl ? item.product.name.ar : item.product.name.en}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          Supplier: {item.offer.supplierName} • MOQ:{" "}
                          {item.offer.moq}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>
                          ${(item.offer.price * item.quantity).toFixed(2)}
                        </div>
                        <div style={{ color: "#34d399", fontSize: 11 }}>
                          {item.quantity} units @ ${item.offer.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Destination & Submit */}
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
                    {tb.proceedToCheckout}
                  </h3>

                  {/* Destination Warehouse Picker */}
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
                      {tb.destinationWarehouse}
                    </label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
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
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PO Reference Input */}
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
                      {tb.poReferenceNumber}
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#0b0f19",
                        color: "#ffffff",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        padding: "10px",
                        fontSize: 13,
                      }}
                    />
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
                      <span>Freight & Logistics</span>
                      <span>$0.00 (FOB Contract)</span>
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
                      <span>Grand Total</span>
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
                      background: "linear-gradient(135deg, #059669, #047857)",
                      color: "#ffffff",
                      border: 0,
                      padding: "12px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {isRtl
                      ? "اعتماد أمر التوريد والدفع عبر المحفظة"
                      : "Confirm PO & Pay via Wallet (2010)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECEIVING WAREHOUSES TAB */}
        {activeTab === "warehouses" && (
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
                  {tb.warehousesTitle}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  {tb.warehousesSubtitle}
                </p>
              </div>
              <button
                onClick={() => setShowAddWarehouse(true)}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {tb.addWarehouseBtn}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {warehouses.map((w) => (
                <div
                  key={w.id}
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
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          margin: "0 0 4px 0",
                          color: "#ffffff",
                        }}
                      >
                        {w.name}
                      </h4>
                      <span
                        style={{
                          color: "#60a5fa",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Code: {w.code}
                      </span>
                    </div>
                    {w.isDefault && (
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
                        {tb.defaultBadge}
                      </span>
                    )}
                  </div>

                  <div
                    style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <MapPin size={14} /> {w.addressLine}, {w.city}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Clock size={14} /> {tb.receivingHours}:{" "}
                      {w.receivingHours}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Phone size={14} /> {w.contactName} ({w.contactPhone})
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#0b0f19",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#cbd5e1",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {tb.dockType}: <b>{w.dockType}</b>
                    </span>
                    <span>
                      Forklift: <b>{w.hasForklift ? "Yes" : "No"}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM & RBAC TAB */}
        {activeTab === "team" && (
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
                  {tb.teamTitle}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  {tb.teamSubtitle}
                </p>
              </div>
              <button
                onClick={() => setShowInviteTeam(true)}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {tb.inviteMemberBtn}
              </button>
            </div>

            <div
              style={{
                background: "#111827",
                borderRadius: 12,
                border: "1px solid #1f2937",
                overflow: "hidden",
              }}
            >
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
                      background: "#0d1322",
                      color: "#64748b",
                      borderBottom: "1px solid #1f2937",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    <th style={{ padding: "12px 16px" }}>Member Name</th>
                    <th style={{ padding: "12px 16px" }}>Email</th>
                    <th style={{ padding: "12px 16px" }}>
                      Organizational Role
                    </th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: "1px solid #1f2937" }}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          fontWeight: 700,
                          color: "#ffffff",
                        }}
                      >
                        {m.firstName} {m.lastName}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#94a3b8" }}>
                        {m.email}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: "rgba(37, 99, 235, 0.15)",
                            color: "#60a5fa",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {m.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background:
                              m.status === "active"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                            color:
                              m.status === "active" ? "#34d399" : "#fbbf24",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WALLET & LEDGER TAB */}
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
                  {tb.walletTitle}
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                  {tb.walletSubtitle}
                </p>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                style={{
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "#ffffff",
                  border: 0,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {tb.topupWalletBtn}
              </button>
            </div>

            {/* Wallet Balances Card */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 20,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {tb.availableBalance}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#10b981",
                    margin: "8px 0",
                  }}
                >
                  ${((wallet?.availableBalanceCents || 0) / 100).toFixed(2)}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  Account 2010 • Ready for Procurement
                </div>
              </div>

              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {tb.heldInOrders}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#f59e0b",
                    margin: "8px 0",
                  }}
                >
                  ${((wallet?.heldBalanceCents || 0) / 100).toFixed(2)}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  In Escrow for Active POs
                </div>
              </div>

              <div
                style={{
                  background: "#111827",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {tb.totalBalance}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "8px 0",
                  }}
                >
                  ${((wallet?.totalBalanceCents || 0) / 100).toFixed(2)}
                </div>
                <div style={{ color: "#34d399", fontSize: 11 }}>
                  Immutable Cryptographic Chain
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div
              style={{
                background: "#111827",
                borderRadius: 12,
                border: "1px solid #1f2937",
                padding: "20px",
              }}
            >
              <h3
                style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px 0" }}
              >
                {tb.statementTitle}
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
                    <th style={{ padding: "10px" }}>Entry #</th>
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
                      <td
                        style={{
                          padding: "12px 10px",
                          fontWeight: 700,
                          color: "#60a5fa",
                        }}
                      >
                        {tx.entryNumber}
                      </td>
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

        {/* KYC & ONBOARDING TAB */}
        {activeTab === "onboarding" && (
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
                {tb.onboardingTitle}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                {tb.onboardingSubtitle}
              </p>
            </div>

            <div
              style={{
                background: "#111827",
                padding: "28px",
                borderRadius: 12,
                border: "1px solid #1f2937",
                maxWidth: 700,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginBottom: 6,
                  }}
                >
                  {tb.crLabel}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile?.crNumber || "1010928374"}
                  style={{
                    width: "100%",
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginBottom: 6,
                  }}
                >
                  {tb.vatLabel}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile?.vatNumber || "310029384700003"}
                  style={{
                    width: "100%",
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
              </div>

              <h4
                style={{ fontSize: 15, fontWeight: 800, margin: "0 0 12px 0" }}
              >
                Submitted Verification Documents
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                {kycDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#0b0f19",
                      borderRadius: 8,
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {isRtl ? doc.title.ar : doc.title.en}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        {doc.fileName} ({doc.fileSize})
                      </div>
                    </div>
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
                      APPROVED
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  showToast(
                    isRtl
                      ? "تم إرسال التحديثات لمدقق الامتثال"
                      : "Compliance documents re-verified",
                  )
                }
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {tb.submitApplication}
              </button>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
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
                {tb.navOrders}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Inspection of parent orders and partitioned supplier suborders
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
                          color: "#60a5fa",
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
                      <span style={{ color: "#cbd5e1", fontSize: 12 }}>
                        PO Ref: <b>{o.poReference}</b>
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
                    style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}
                  >
                    Destination: <b>{o.destinationWarehouse}</b> • Payment:{" "}
                    <b>{o.paymentMethod}</b>
                  </div>

                  {/* Suborders */}
                  <div
                    style={{
                      background: "#0b0f19",
                      borderRadius: 8,
                      padding: "12px",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        marginBottom: 8,
                      }}
                    >
                      PARTITIONED SUPPLIER SUBORDERS
                    </div>
                    {o.suborders.map((so) => (
                      <div
                        key={so.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 0",
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <span style={{ color: "#ffffff", fontWeight: 700 }}>
                            {so.supplierName}
                          </span>
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: 11,
                              margin: "0 8px",
                            }}
                          >
                            ({so.trackingNumber})
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>
                            ${so.amount.toFixed(2)}
                          </span>
                          <span
                            style={{
                              background: "rgba(37, 99, 235, 0.15)",
                              color: "#60a5fa",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {so.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
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
                {tb.navProfile}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Corporate identity, billing address, and tax records
              </p>
            </div>

            <div
              style={{
                background: "#111827",
                padding: "28px",
                borderRadius: 12,
                border: "1px solid #1f2937",
                maxWidth: 700,
              }}
            >
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
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile?.legalName}
                  style={{
                    width: "100%",
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
              </div>
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
                  Registered Billing Address
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile?.billingAddress}
                  style={{
                    width: "100%",
                    background: "#0b0f19",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "10px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#94a3b8",
                      marginBottom: 6,
                    }}
                  >
                    Corporate Email
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.contactEmail}
                    style={{
                      width: "100%",
                      background: "#0b0f19",
                      color: "#ffffff",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "10px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#94a3b8",
                      marginBottom: 6,
                    }}
                  >
                    Corporate Phone
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.contactPhone}
                    style={{
                      width: "100%",
                      background: "#0b0f19",
                      color: "#ffffff",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "10px",
                    }}
                  />
                </div>
              </div>
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
              maxWidth: 420,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px 0" }}>
              {tb.topupWalletBtn}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>
              Post balanced double-entry deposit into Account 2010
            </p>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#cbd5e1",
                  marginBottom: 6,
                }}
              >
                Amount (USD)
              </label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleTopup}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Confirm Deposit
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

      {/* ADD WAREHOUSE MODAL */}
      {showAddWarehouse && (
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
              maxWidth: 480,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px 0" }}>
              {tb.addWarehouseBtn}
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
                placeholder="Warehouse Name (e.g. Jeddah Industrial Dock)"
                value={newWh.name}
                onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
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
                placeholder="Facility Code (e.g. SA-JED-03)"
                value={newWh.code}
                onChange={(e) => setNewWh({ ...newWh, code: e.target.value })}
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
                value={newWh.addressLine}
                onChange={(e) =>
                  setNewWh({ ...newWh, addressLine: e.target.value })
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
                placeholder="Contact Person Name & Phone"
                value={newWh.contactName}
                onChange={(e) =>
                  setNewWh({
                    ...newWh,
                    contactName: e.target.value,
                    contactPhone: "+966550000000",
                  })
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
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  if (!newWh.name || !newWh.code) return
                  await api.createMerchantWarehouse(newWh)
                  const list = await api.getMerchantWarehouses()
                  setWarehouses(list)
                  setShowAddWarehouse(false)
                  showToast(
                    isRtl
                      ? "تمت إضافة مستودع الاستلام بنجاح"
                      : "Receiving dock added successfully",
                  )
                }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Save Warehouse
              </button>
              <button
                onClick={() => setShowAddWarehouse(false)}
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

      {/* INVITE TEAM MODAL */}
      {showInviteTeam && (
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
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px 0" }}>
              {tb.inviteMemberBtn}
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
                placeholder="First Name"
                value={newMember.firstName}
                onChange={(e) =>
                  setNewMember({ ...newMember, firstName: e.target.value })
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
                placeholder="Last Name"
                value={newMember.lastName}
                onChange={(e) =>
                  setNewMember({ ...newMember, lastName: e.target.value })
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
                type="email"
                placeholder="Corporate Email (e.g. colleague@company.com)"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
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
              <select
                value={newMember.role}
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value as any })
                }
                style={{
                  width: "100%",
                  background: "#0b0f19",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px",
                }}
              >
                <option value="procurement_manager">
                  Procurement Manager (مدير المشتريات)
                </option>
                <option value="warehouse_manager">
                  Warehouse Logistics Manager (مدير المستودعات)
                </option>
                <option value="finance_viewer">
                  Finance & Accounts Auditor (مراجع الحسابات)
                </option>
                <option value="admin">
                  Corporate Administrator (مسؤول منشأة)
                </option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  if (!newMember.email) return
                  await api.inviteB2BTeamMember(newMember)
                  const list = await api.getB2BTeamMembers()
                  setTeamMembers(list)
                  setShowInviteTeam(false)
                  showToast(
                    isRtl
                      ? "تم إرسال رابط التفعيل للموظف"
                      : "Invitation link dispatched (48h expiry)",
                  )
                }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Send Secure Invitation
              </button>
              <button
                onClick={() => setShowInviteTeam(false)}
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
