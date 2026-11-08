import { useState, useEffect } from "react"
import {
  ChefHat,
  Flame,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wallet,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Power,
  Utensils,
  MapPin,
  ShieldCheck,
  Star,
  ArrowUpRight,
  RefreshCw,
  Bell,
  Sparkles,
  Phone,
  MessageCircle,
  ChevronRight,
  Info,
} from "lucide-react"
import { api, type APISuborder, type APIKitchen } from "../../services/api"
import { sampleKitchens, sampleProducts } from "../../data/mockStorefront"
import type { Locale } from "../../types"

interface Props {
  locale?: Locale
  setLocale?: (l: Locale) => void
  onSwitchPortal?: (portal: "b2c" | "b2b" | "admin") => void
}

type CookTab = "today_orders" | "schedule" | "dishes" | "wallet"

interface CookOrder {
  id: string
  suborderNumber: string
  customerName: string
  customerPhone: string
  district: string
  address: string
  orderMode: "instant" | "scheduled"
  scheduledDate: string
  slotStartTime: string
  slotEndTime: string
  dishName: string
  portionName: string
  quantity: number
  totalEGP: number
  prepStatus: "new" | "cooking" | "ready_for_pickup" | "dispatched" | "delivered"
  fulfillmentType: "platform_delivery" | "cook_delivery" | "customer_pickup"
  cookNotes?: string
  createdAt: string
}

export function CookPortal({ locale = "ar", onSwitchPortal }: Props) {
  const isRtl = locale === "ar"
  const [activeTab, setActiveTab] = useState<CookTab>("today_orders")
  const [kitchen, setKitchen] = useState<APIKitchen | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<"vodafone_cash" | "instapay" | "bank">("instapay")
  const [payoutAddress, setPayoutAddress] = useState("01012345678@instapay")
  const [payoutAmount, setPayoutAmount] = useState("2500")

  // Initial Seeded Orders for Um Ahmed Kitchen
  const [orders, setOrders] = useState<CookOrder[]>([
    {
      id: "so-eg-101",
      suborderNumber: "SO-UAH-901",
      customerName: "سارة الزهراني",
      customerPhone: "01098765432",
      district: "المعادي / Maadi",
      address: "شارع 9، دجلة المعادي، عمارة 14، شقة 3",
      orderMode: "scheduled",
      scheduledDate: new Date().toISOString().split("T")[0],
      slotStartTime: "14:00",
      slotEndTime: "16:00",
      dishName: "محشي ورق عنب بلدي بدبس الرمان واللحمة المفرومة",
      portionName: "سيرفيس كيلو كامل (تكفي 4 أفراد)",
      quantity: 1,
      totalEGP: 280,
      prepStatus: "new",
      fulfillmentType: "platform_delivery",
      cookNotes: "يرجى تسوية ورق العنب بالليمون ودبس الرمان الإضافي",
      createdAt: "منذ 20 دقيقة",
    },
    {
      id: "so-eg-102",
      suborderNumber: "SO-UAH-902",
      customerName: "أحمد عبد الرحمن",
      customerPhone: "01123456789",
      district: "المعادي / Maadi",
      address: "أبراج عثمان، كورنيش النيل المعادي",
      orderMode: "instant",
      scheduledDate: new Date().toISOString().split("T")[0],
      slotStartTime: "13:30",
      slotEndTime: "14:30",
      dishName: "ملوخية خضراء بالطشة مع نصف دجاجة محمرة وأرز بالشعرية",
      portionName: "وجبة متكاملة (نصف دجاجة + ملوخية + أرز)",
      quantity: 2,
      totalEGP: 320,
      prepStatus: "cooking",
      fulfillmentType: "platform_delivery",
      cookNotes: "طشة ثوم زيادة ومخلل ليمون معصفر إضافي",
      createdAt: "منذ 45 دقيقة",
    },
    {
      id: "so-eg-103",
      suborderNumber: "SO-UAH-903",
      customerName: "د. هدى محمود",
      customerPhone: "01234567890",
      district: "المعادي / Maadi",
      address: "شارع النصر، عمارة 22، الدور 5",
      orderMode: "scheduled",
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      slotStartTime: "15:00",
      slotEndTime: "17:00",
      dishName: "صينية مكرونة فرن بالبشاميل البلدي واللحمة المعصجة",
      portionName: "صينية عائلية كبرى (تكفي 5 - 6 أفراد)",
      quantity: 1,
      totalEGP: 340,
      prepStatus: "new",
      fulfillmentType: "platform_delivery",
      cookNotes: "تحمير وجه الصينية بلون ذهبي غامق",
      createdAt: "حجز مسبق للغد",
    },
  ])

  useEffect(() => {
    loadKitchenData()
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadKitchenData = async () => {
    setLoading(true)
    try {
      // 1. Fetch kitchens from API
      const kitchensList = await api.getKitchens()
      if (kitchensList && kitchensList.length > 0) {
        setKitchen(kitchensList[0])
        setIsOpen(kitchensList[0].is_open)
      } else {
        // Fallback to sample kitchen
        const sample = sampleKitchens[0]
        setKitchen({
          id: sample.id,
          organization_id: sample.organizationId,
          kitchen_name: sample.kitchenName,
          chef_name: sample.chefName,
          bio: sample.bio,
          governorate: sample.governorate,
          district: sample.district,
          address_line: sample.addressLine,
          latitude: sample.latitude,
          longitude: sample.longitude,
          delivery_radius_km: sample.deliveryRadiusKm,
          is_open: sample.isOpen,
          hygiene_rating: sample.hygieneRating,
          hygiene_badge: sample.hygieneBadge,
          dishes_count: sample.dishesCount || 4,
          created_at: new Date().toISOString(),
        })
        setIsOpen(sample.isOpen)
      }

      // 2. Fetch live suborders from backend if authenticated
      const suborders = await api.getSupplierSuborders().catch(() => [])
      if (suborders && suborders.length > 0) {
        const mappedOrders: CookOrder[] = suborders.map((so) => ({
          id: so.id,
          suborderNumber: so.suborder_number,
          customerName: "عميل مطبخي المميز",
          customerPhone: "01099887766",
          district: "المعادي / Cairo",
          address: "شارع النصر، المعادي، القاهرة",
          orderMode: (so.order_mode === "instant" ? "instant" : "scheduled") as any,
          scheduledDate: so.scheduled_date || new Date().toISOString().split("T")[0],
          slotStartTime: so.slot_start_time || "13:00",
          slotEndTime: so.slot_end_time || "15:00",
          dishName: (so.items && so.items.length > 0) ? "وجبة أكل بيتي مصري طازج" : "محشي ورق عنب بلدي",
          portionName: "طبق عائلي",
          quantity: (so.items && so.items.length > 0) ? so.items[0].quantity : 1,
          totalEGP: so.subtotal_cents / 100,
          prepStatus: (so.prep_status || "cooking") as any,
          fulfillmentType: (so.fulfillment_type || "platform_delivery") as any,
          cookNotes: so.cook_notes || "بدون توابل حارة",
          createdAt: "طلب مسجل بالنظام",
        }))
        setOrders(mappedOrders)
      }
    } catch (e) {
      console.error("Error loading cook portal data", e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleKitchenStatus = async () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    try {
      await api.setKitchenStatus(nextState)
      showToast(
        nextState
          ? "تم فتح المطبخ بنجاح! أنتِ الآن تستقبلين طلبات فورية ومجدولة 🟢"
          : "تم إغلاق المطبخ مؤقتاً للراحة. لن تظهر وجباتك للطلب الفوري الآن ⏸️"
      )
    } catch {
      showToast(
        nextState
          ? "تم تفعيل استقبال الطلبات في المطبخ 🟢"
          : "تم إيقاف استقبال الطلبات مؤقتاً ⏸️"
      )
    }
  }

  const handleUpdatePrepStatus = async (orderId: string, nextStatus: CookOrder["prepStatus"]) => {
    try {
      await api.updateSuborderPrepStatus(orderId, nextStatus)
    } catch {}

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, prepStatus: nextStatus } : o))
    )

    if (nextStatus === "cooking") {
      showToast("تسلم إيدك! بدأ طهي الوجبة وتم إشعار العميل بالبدء 👩‍🍳")
    } else if (nextStatus === "ready_for_pickup") {
      showToast("الوجبة جاهزة وساخنة! تم إخطار مندوب مطبخي للتوجه للمطبخ واستلامها 🛵")
    }
  }

  const handleExecutePayout = () => {
    const amt = parseFloat(payoutAmount)
    if (isNaN(amt) || amt <= 0) return
    setShowPayoutModal(false)
    showToast(
      `تم إرسال طلب سحب ${amt.toLocaleString()} ج.م بنجاح إلى حساب ${payoutMethod === "instapay" ? "إنستاباي" : "فودافون كاش"} (${payoutAddress}). التحويل فوري خلال دقائق! 💸`
    )
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const todayOrders = orders.filter((o) => o.scheduledDate === todayStr)
  const futureOrders = orders.filter((o) => o.scheduledDate > todayStr)

  const filteredTodayOrders = todayOrders.filter((o) => {
    if (statusFilter === "all") return true
    return o.prepStatus === statusFilter
  })

  // Metrics
  const todayEarnings = todayOrders.reduce((sum, o) => sum + o.totalEGP, 0)
  const totalWalletBalance = 4850
  const dailyPortionsTotal = 15
  const dailyPortionsMax = 20

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "calc(100vh - 52px)",
        background: "#0c0a09",
        color: "#f5f5f4",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1c1917",
            border: "1px solid #e05638",
            boxShadow: "0 10px 30px rgba(224, 86, 56, 0.3)",
            color: "#f5f5f4",
            padding: "14px 24px",
            borderRadius: 12,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <Sparkles size={18} color="#e05638" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cook Kitchen Profile Hero Card */}
      <div
        style={{
          background: "linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)",
          borderBottom: "1px solid #292524",
          padding: "24px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* Chef Details */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e05638 0%, #b91c1c 100%)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 16px rgba(224, 86, 56, 0.4)",
                border: "3px solid #44403c",
              }}
            >
              <ChefHat size={34} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#fafaf9" }}>
                  {kitchen ? (isRtl ? kitchen.kitchen_name.ar : kitchen.kitchen_name.en) : "مطبخ أم أحمد للأكلات المصرية"}
                </h1>
                <span
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    color: "#4ade80",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{kitchen?.hygiene_badge || "مطبخ معتمد ومرخص"}</span>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 6,
                  color: "#a8a29e",
                  fontSize: 13,
                  fontWeight: 600,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={15} color="#e05638" />
                  <span>{kitchen?.district || "المعادي، القاهرة"}</span>
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#fbbf24" }}>
                  <Star size={15} fill="#fbbf24" />
                  <span>{kitchen?.hygiene_rating || 4.95} (تقييم ممتاز)</span>
                </span>
                <span>•</span>
                <span>الشيف: {kitchen?.chef_name || "الحاجة أم أحمد"}</span>
              </div>
            </div>
          </div>

          {/* Kitchen Open/Close Live Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#1c1917",
              border: "1px solid #292524",
              padding: "12px 18px",
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: isOpen ? "#4ade80" : "#f87171" }}>
                {isOpen ? "المطبخ يستقبل طلبات الآن 🟢" : "المطبخ مغلق مؤقتاً للراحة ⏸️"}
              </div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>
                {isOpen ? "الوجبات ظاهرة للعملاء في نطاق المعادي" : "الوجبات مخفية من نتائج البحث الفوري"}
              </div>
            </div>
            <button
              onClick={handleToggleKitchenStatus}
              style={{
                background: isOpen ? "#22c55e" : "#ef4444",
                color: "#ffffff",
                border: 0,
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
                boxShadow: isOpen ? "0 4px 12px rgba(34, 197, 94, 0.4)" : "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
            >
              <Power size={16} />
              <span>{isOpen ? "إيقاف مؤقت" : "فتح المطبخ"}</span>
            </button>
          </div>
        </div>

        {/* Capacity & Daily Progress Bar */}
        <div
          style={{
            maxWidth: 1200,
            margin: "20px auto 0 auto",
            background: "rgba(41, 37, 36, 0.5)",
            border: "1px solid #292524",
            padding: "14px 18px",
            borderRadius: 12,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Flame size={20} color="#e05638" />
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fafaf9" }}>
                سعة الطهي المتاحة لليوم: {dailyPortionsTotal} من أصل {dailyPortionsMax} وجبة محجوزة
              </span>
              <span style={{ fontSize: 12, color: "#a8a29e", marginRight: 8 }}>
                (متبقي {dailyPortionsMax - dailyPortionsTotal} وجبات قبل الإغلاق التلقائي للمطبخ لمنع التكدس)
              </span>
            </div>
          </div>
          <div style={{ width: 220, height: 8, background: "#292524", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(dailyPortionsTotal / dailyPortionsMax) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #e05638, #f59e0b)",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div
        style={{
          borderBottom: "1px solid #292524",
          background: "#141210",
          position: "sticky",
          top: 52,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            gap: 8,
            padding: "0 20px",
            overflowX: "auto",
          }}
        >
          {[
            {
              id: "today_orders" as CookTab,
              label: "طلبات اليوم الطازجة",
              icon: Flame,
              badge: todayOrders.length.toString(),
            },
            {
              id: "schedule" as CookTab,
              label: "جدولة الأيام القادمة",
              icon: Calendar,
              badge: futureOrders.length.toString(),
            },
            {
              id: "dishes" as CookTab,
              label: "قائمة وجبات المطبخ",
              icon: Utensils,
              badge: "4",
            },
            {
              id: "wallet" as CookTab,
              label: "المحفظة والأرباح (ج.م)",
              icon: Wallet,
              badge: `${totalWalletBalance} ج.م`,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                border: 0,
                background: "transparent",
                color: activeTab === t.id ? "#e05638" : "#a8a29e",
                padding: "16px 18px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: activeTab === t.id ? "3px solid #e05638" : "3px solid transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <t.icon size={17} />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  style={{
                    background: activeTab === t.id ? "#e05638" : "#292524",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {/* TAB 1: TODAY'S ORDERS */}
        {activeTab === "today_orders" && (
          <div>
            {/* Top Bar with Filter Pills & Quick Metrics */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Filter Pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { id: "all", label: "جميع طلبات اليوم" },
                  { id: "new", label: "طلبات جديدة (تحتاج قبول)" },
                  { id: "cooking", label: "قيد الطهي الآن 👩‍🍳" },
                  { id: "ready_for_pickup", label: "جاهزة للتسليم للمندوب 🛵" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      border: 0,
                      background: statusFilter === f.id ? "#e05638" : "#1c1917",
                      color: statusFilter === f.id ? "#ffffff" : "#a8a29e",
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: statusFilter === f.id ? "#e05638" : "#292524",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Today's Sales Metric Box */}
              <div
                style={{
                  background: "#1c1917",
                  border: "1px solid #292524",
                  padding: "10px 18px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 700 }}>
                    مبيعات اليوم المحققة
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80" }}>
                    {todayEarnings.toLocaleString()} ج.م
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(34, 197, 94, 0.15)",
                    display: "grid",
                    placeItems: "center",
                    color: "#4ade80",
                  }}
                >
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            {/* Orders List */}
            {filteredTodayOrders.length === 0 ? (
              <div
                style={{
                  background: "#141210",
                  border: "1px dashed #292524",
                  borderRadius: 16,
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "#a8a29e",
                }}
              >
                <Utensils size={48} style={{ margin: "0 auto 16px auto", opacity: 0.4 }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fafaf9", margin: "0 0 8px 0" }}>
                  لا توجد طلبات في هذا القسم حالياً
                </h3>
                <p style={{ fontSize: 14, margin: 0 }}>
                  عندما يطلب العملاء وجبات بيتي من مطبخك ستظهر هنا فوراً مع تنبيه صوتي وإشعار مباشر.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {filteredTodayOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: "#141210",
                      border: "1px solid #292524",
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: 20,
                      alignItems: "center",
                    }}
                  >
                    {/* Left / Main Details */}
                    <div style={{ flex: "1 1 500px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#fafaf9" }}>
                          طلب رقم {ord.suborderNumber}
                        </span>
                        <span
                          style={{
                            background:
                              ord.orderMode === "instant"
                                ? "rgba(224, 86, 56, 0.15)"
                                : "rgba(59, 130, 246, 0.15)",
                            color: ord.orderMode === "instant" ? "#f87171" : "#60a5fa",
                            border: `1px solid ${
                              ord.orderMode === "instant"
                                ? "rgba(224, 86, 56, 0.3)"
                                : "rgba(59, 130, 246, 0.3)"
                            }`,
                            padding: "3px 10px",
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          {ord.orderMode === "instant" ? <Flame size={13} /> : <Calendar size={13} />}
                          <span>{ord.orderMode === "instant" ? "طلب فوري ساخن ⚡" : "طلب مجدول لموعد محدد 📅"}</span>
                        </span>

                        <span
                          style={{
                            background:
                              ord.prepStatus === "new"
                                ? "#e05638"
                                : ord.prepStatus === "cooking"
                                ? "#f59e0b"
                                : "#22c55e",
                            color: "#ffffff",
                            padding: "3px 10px",
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {ord.prepStatus === "new"
                            ? "جديد بانتظار التأكيد"
                            : ord.prepStatus === "cooking"
                            ? "قيد الطهي في المطبخ 👩‍🍳"
                            : "جاهز للتسليم 🛵"}
                        </span>
                      </div>

                      {/* Dish title & portion */}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#e05638" }}>
                          {ord.dishName}
                        </div>
                        <div style={{ fontSize: 13, color: "#d6d3d1", marginTop: 4 }}>
                          الحجم: <b>{ord.portionName}</b> × الكمية: <b>{ord.quantity}</b>
                        </div>
                      </div>

                      {/* Customer Notes */}
                      {ord.cookNotes && (
                        <div
                          style={{
                            marginTop: 10,
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 12,
                            color: "#fbbf24",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Info size={14} />
                          <span><b>ملاحظة العميل:</b> {ord.cookNotes}</span>
                        </div>
                      )}

                      {/* Delivery Slot & Address */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          marginTop: 12,
                          fontSize: 12,
                          color: "#a8a29e",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={14} color="#f59e0b" />
                          <span>نافذة التسليم: <b>{ord.slotStartTime} - {ord.slotEndTime}</b></span>
                        </span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={14} color="#e05638" />
                          <span>{ord.district} - {ord.address}</span>
                        </span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={14} />
                          <span>{ord.customerName} ({ord.customerPhone})</span>
                        </span>
                      </div>
                    </div>

                    {/* Right / Pricing & Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 12,
                        minWidth: 180,
                      }}
                    >
                      <div style={{ textAlign: isRtl ? "left" : "right" }}>
                        <div style={{ fontSize: 11, color: "#a8a29e" }}>صافي مستحق الست</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#fafaf9" }}>
                          {ord.totalEGP} ج.م
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      {ord.prepStatus === "new" && (
                        <button
                          onClick={() => handleUpdatePrepStatus(ord.id, "cooking")}
                          style={{
                            background: "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",
                            color: "#ffffff",
                            border: 0,
                            padding: "10px 20px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 4px 12px rgba(224, 86, 56, 0.4)",
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          <ChefHat size={16} />
                          <span>قبول وبدء الطهي 👩‍🍳</span>
                        </button>
                      )}

                      {ord.prepStatus === "cooking" && (
                        <button
                          onClick={() => handleUpdatePrepStatus(ord.id, "ready_for_pickup")}
                          style={{
                            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                            color: "#ffffff",
                            border: 0,
                            padding: "10px 20px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>جاهز للتسليم للمندوب 🛵</span>
                        </button>
                      )}

                      {ord.prepStatus === "ready_for_pickup" && (
                        <div
                          style={{
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#4ade80",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: "center",
                            width: "100%",
                          }}
                        >
                          🛵 المندوب في الطريق للاستلام
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULE (FUTURE DAYS) */}
        {activeTab === "schedule" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fafaf9", margin: "0 0 6px 0" }}>
                جدول الحجوزات المسبقة للأيام القادمة 📅
              </h2>
              <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
                خططي لمشتريات اللحوم والخضار البلدي مسبقاً بناءً على طلبات العزومات والعائلات المحجوزة.
              </p>
            </div>

            {futureOrders.length === 0 ? (
              <div
                style={{
                  background: "#141210",
                  border: "1px dashed #292524",
                  borderRadius: 16,
                  padding: "50px 20px",
                  textAlign: "center",
                  color: "#a8a29e",
                }}
              >
                <Calendar size={42} style={{ margin: "0 auto 14px auto", opacity: 0.4 }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fafaf9" }}>
                  لا توجد طلبات مجدولة لأيام لاحقة حالياً
                </h3>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                {futureOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: "#141210",
                      border: "1px solid #292524",
                      borderRadius: 14,
                      padding: "18px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            background: "#e05638",
                            color: "#ffffff",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          تاريخ التسليم: {ord.scheduledDate}
                        </span>
                        <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                          نافذة التسليم: {ord.slotStartTime} - {ord.slotEndTime}
                        </span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fafaf9", marginTop: 8 }}>
                        {ord.dishName} ({ord.portionName})
                      </div>
                      <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
                        العميل: {ord.customerName} • {ord.district} • {ord.cookNotes}
                      </div>
                    </div>
                    <div style={{ textAlign: isRtl ? "left" : "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80" }}>
                        {ord.totalEGP} ج.م
                      </div>
                      <div style={{ fontSize: 12, color: "#a8a29e" }}>مؤكد ومحجوز</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISHES & MENU */}
        {activeTab === "dishes" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fafaf9", margin: "0 0 6px 0" }}>
                وجبات مطبخك المسجلة في مطبخي
              </h2>
              <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
                الأصناف والأحجام التي تم اعتمادها صحياً ومتاحة للطلب من عملائك.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {sampleProducts.slice(0, 4).map((p) => {
                const off = p.offers[0]
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#141210",
                      border: "1px solid #292524",
                      borderRadius: 14,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.image}
                      alt={p.name.ar}
                      style={{ width: "100%", height: 160, objectFit: "cover" }}
                    />
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fafaf9" }}>
                        {p.name.ar}
                      </div>
                      <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
                        {p.description.ar}
                      </div>

                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #292524" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#e05638", marginBottom: 6 }}>
                          الأحجام والأسعار في المنيو:
                        </div>
                        {(off?.portions || []).map((port) => (
                          <div
                            key={port.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 12,
                              color: "#d6d3d1",
                              marginBottom: 4,
                            }}
                          >
                            <span>• {port.name.ar}</span>
                            <b style={{ color: "#4ade80" }}>{port.price_cents / 100} ج.م</b>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                          color: "#a8a29e",
                        }}
                      >
                        <span>الحد اليومي: <b>{off?.dailyPortionLimit || 15} وجبة</b></span>
                        <span style={{ color: "#4ade80", fontWeight: 700 }}>معتمد ونشط ✓</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 4: EARNINGS & WALLET */}
        {activeTab === "wallet" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Available for Payout */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1c1917 0%, #141210 100%)",
                  border: "1px solid #292524",
                  padding: 24,
                  borderRadius: 16,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#a8a29e", fontWeight: 700 }}>
                    الرصيد المتاح للسحب الفوري
                  </span>
                  <Wallet size={20} color="#4ade80" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#4ade80", marginTop: 10 }}>
                  4,200.00 <span style={{ fontSize: 18 }}>ج.م</span>
                </div>
                <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
                  حساب الأرباح رقم 2030 (جاهز للتحويل الفوري)
                </div>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    background: "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",
                    color: "#ffffff",
                    border: 0,
                    padding: "12px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(224, 86, 56, 0.35)",
                  }}
                >
                  سحب الأرباح الآن (إنستاباي / كاش) 💸
                </button>
              </div>

              {/* Escrow Pending Completion */}
              <div
                style={{
                  background: "#141210",
                  border: "1px solid #292524",
                  padding: 24,
                  borderRadius: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#a8a29e", fontWeight: 700 }}>
                    رصيد تحت الطهي والتسليم (معلق)
                  </span>
                  <Clock size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b", marginTop: 10 }}>
                  650.00 <span style={{ fontSize: 18 }}>ج.م</span>
                </div>
                <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
                  حساب الضمان رقم 2020 (يتحول للمتاح فور استلام العميل للطلب)
                </div>
              </div>

              {/* Monthly Summary */}
              <div
                style={{
                  background: "#141210",
                  border: "1px solid #292524",
                  padding: 24,
                  borderRadius: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#a8a29e", fontWeight: 700 }}>
                    إجمالي أرباح الشهر الحالية
                  </span>
                  <TrendingUp size={20} color="#60a5fa" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fafaf9", marginTop: 10 }}>
                  18,450.00 <span style={{ fontSize: 18 }}>ج.م</span>
                </div>
                <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4 }}>
                  معدل التزام بمواعيد التسليم: 99.2% ✓
                </div>
              </div>
            </div>

            {/* Payout History */}
            <div
              style={{
                background: "#141210",
                border: "1px solid #292524",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fafaf9", margin: "0 0 16px 0" }}>
                سجل التحويلات السابقة
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {[
                  {
                    id: "pay-1",
                    date: "2026-11-04",
                    method: "InstaPay (إنستاباي)",
                    dest: "om-ahmed@instapay",
                    amount: 3500,
                    status: "تم التحويل بنجاح ✓",
                  },
                  {
                    id: "pay-2",
                    date: "2026-10-28",
                    method: "فودافون كاش",
                    dest: "01098765432",
                    amount: 2800,
                    status: "تم التحويل بنجاح ✓",
                  },
                ].map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      background: "#1c1917",
                      borderRadius: 10,
                      border: "1px solid #292524",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#fafaf9" }}>
                        سحب أرباح عبر {p.method}
                      </div>
                      <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
                        {p.date} • الحساب: {p.dest}
                      </div>
                    </div>
                    <div style={{ textAlign: isRtl ? "left" : "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#4ade80" }}>
                        +{p.amount} ج.م
                      </div>
                      <div style={{ fontSize: 11, color: "#4ade80" }}>{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#1c1917",
              border: "1px solid #e05638",
              borderRadius: 20,
              padding: 28,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fafaf9", margin: "0 0 8px 0" }}>
              سحب الأرباح لحسابك الشخصي 💸
            </h3>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 20px 0" }}>
              يتم تحويل الأرباح من حساب المحفظة فوراً بدون أي تأخير.
            </p>

            {/* Method Chooser */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#d6d3d1", display: "block", marginBottom: 8 }}>
                طريقة استلام الأموال:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod("instapay")
                    setPayoutAddress("01012345678@instapay")
                  }}
                  style={{
                    background: payoutMethod === "instapay" ? "rgba(224, 86, 56, 0.2)" : "#141210",
                    border: `1px solid ${payoutMethod === "instapay" ? "#e05638" : "#292524"}`,
                    color: payoutMethod === "instapay" ? "#e05638" : "#a8a29e",
                    padding: 12,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  إنستاباي (InstaPay)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod("vodafone_cash")
                    setPayoutAddress("01098765432")
                  }}
                  style={{
                    background: payoutMethod === "vodafone_cash" ? "rgba(224, 86, 56, 0.2)" : "#141210",
                    border: `1px solid ${payoutMethod === "vodafone_cash" ? "#e05638" : "#292524"}`,
                    color: payoutMethod === "vodafone_cash" ? "#e05638" : "#a8a29e",
                    padding: 12,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  فودافون كاش
                </button>
              </div>
            </div>

            {/* Address Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#d6d3d1", display: "block", marginBottom: 6 }}>
                {payoutMethod === "instapay" ? "عنوان إنستاباي (IPA):" : "رقم محفظة فودافون كاش:"}
              </label>
              <input
                type="text"
                value={payoutAddress}
                onChange={(e) => setPayoutAddress(e.target.value)}
                style={{
                  width: "100%",
                  background: "#141210",
                  border: "1px solid #292524",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#fafaf9",
                  fontSize: 14,
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#d6d3d1", display: "block", marginBottom: 6 }}>
                المبلغ المراد سحبه (بالجنيه المصري):
              </label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                style={{
                  width: "100%",
                  background: "#141210",
                  border: "1px solid #292524",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#4ade80",
                  fontSize: 18,
                  fontWeight: 900,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
                الحد الأقصى المتاح الآن: 4,200 ج.م
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleExecutePayout}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",
                  color: "#ffffff",
                  border: 0,
                  padding: "12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                تأكيد التحويل الفوري
              </button>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                style={{
                  background: "#292524",
                  color: "#d6d3d1",
                  border: 0,
                  padding: "12px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
