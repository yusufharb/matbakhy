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
  ChefHat,
  Flame,
  Calendar,
  Clock,
  Sparkles,
  Filter,
  Utensils,
  Info,
} from "lucide-react"

import { api } from "../../services/api"

import { translations } from "../../data/i18n"

import { sampleKitchens, sampleProducts } from "../../data/mockStorefront"

import type {
  Locale,
  B2CPage,
  B2CCustomerAddress,
  WalletAccount,
  StorefrontProduct,
  CartItem,
  ParentOrder,
  LedgerTransaction,
  KitchenProfile,
  DishPortion,
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

  const [products, setProducts] = useState<StorefrontProduct[]>(sampleProducts)

  const [kitchens, setKitchens] = useState<KitchenProfile[]>(sampleKitchens)

  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(
    null,
  )

  const [selectedDistrict, setSelectedDistrict] = useState<string>("All")

  const [orderMode, setOrderMode] = useState<"instant" | "scheduled">(
    "scheduled",
  )

  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  )

  const [selectedSlot, setSelectedSlot] = useState<string>("14:00 - 16:00")

  const [selectedPortions, setSelectedPortions] =
    useState<Record<string, string>>({})

  const [customerNotes, setCustomerNotes] = useState<string>("")

  const [selectedProduct, setSelectedProduct] =
    useState<StorefrontProduct | null>(null)

  const [modalPortion, setModalPortion] = useState<DishPortion | null>(null)

  const [modalQty, setModalQty] = useState<number>(1)

  const [modalNotes, setModalNotes] = useState<string>("")

  const [cart, setCart] = useState<CartItem[]>([])

  const openProductModal = (product: StorefrontProduct) => {
    setSelectedProduct(product)

    const offer = product.offers[0]

    const currentPortionId = selectedPortions[product.id]

    const initialPortion =
      offer?.portions?.find((p) => p.id === currentPortionId) ||
      offer?.portions?.find((p) => p.is_default) ||
      offer?.portions?.[0] ||
      null

    setModalPortion(initialPortion)

    setModalQty(1)

    setModalNotes("")
  }

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

  const [topupAmount, setTopupAmount] = useState("200")

  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">(
    "wallet",
  )

  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  // New Address Form State (Egyptian Cities & Districts)

  const [newAddr, setNewAddr] = useState({
    label: "Home" as const,

    recipientName: "سارة محمود / Sara Mahmoud",

    recipientPhone: "01012345678",

    city: "القاهرة / Cairo",

    district: "المعادي / Maadi",

    streetAddress: "شارع النصر، دجلة المعادي، عمارة 15",

    buildingNumber: "15",

    floorNumber: "3",

    apartmentNumber: "7",

    deliveryInstructions: "يرجى رن جرس الباب والاتصال قبل الوصول",

    isDefault: true,
  })

  useEffect(() => {
    loadB2CData()
  }, [])

  const loadB2CData = async () => {
    try {
      const [addrList, wlt, txList, ordList, kList, prodList] =
        await Promise.all([
          api.getCustomerAddresses().catch(() => []),

          api.getB2CWallet().catch(() => null),

          api.getLedgerTransactions("b2c").catch(() => []),

          api.getOrders().catch(() => []),

          api.getKitchens().catch(() => []),

          api.getProducts().catch(() => []),
        ])

      if (addrList && addrList.length > 0) {
        setAddresses(addrList)

        const def = addrList.find((a) => a.isDefault) || addrList[0]

        setSelectedAddressId(def.id)
      } else {
        const defaultEgyptAddr: B2CCustomerAddress = {
          id: "addr-eg-01",

          userId: "usr-cairo-01",

          label: "Home",

          recipientName: "سارة محمود",

          recipientPhone: "01012345678",

          city: "القاهرة / Cairo",

          district: "المعادي / Maadi",

          streetAddress: "شارع النصر، دجلة المعادي، عمارة 15",

          buildingNumber: "15",

          floorNumber: "3",

          apartmentNumber: "7",

          deliveryInstructions: "يرجى رن الجرس والتسليم باليد",

          isDefault: true,

          createdAt: new Date().toISOString(),
        }

        setAddresses([defaultEgyptAddr])

        setSelectedAddressId(defaultEgyptAddr.id)
      }

      setWallet(wlt)

      setTransactions(txList)

      if (kList && kList.length > 0) {
        setKitchens(
          kList.map((k) => ({
            id: k.id,

            organizationId: k.organization_id,

            chefName: k.chef_name,

            kitchenName: k.kitchen_name,

            bio: k.bio,

            governorate: k.governorate,

            district: k.district,

            addressLine: k.address_line,

            latitude: k.latitude,

            longitude: k.longitude,

            deliveryRadiusKm: k.delivery_radius_km,

            isOpen: k.is_open,

            hygieneRating: k.hygiene_rating,

            hygieneBadge: k.hygiene_badge,

            dishesCount: k.dishes_count,
          })),
        )
      } else {
        setKitchens(sampleKitchens)
      }

      if (prodList && prodList.length > 0) {
        setProducts(
          prodList.map((p) => {
            const sampleMatch = sampleProducts.find((sp) => sp.sku === p.sku)

            return {
              id: p.id,

              sku: p.sku,

              name: p.name,

              category: p.category_name,

              image:
                sampleMatch?.image ||
                "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=700&auto=format&fit=crop&q=80",

              brand: p.brand_name || "مطبخ بيتي معتمد",

              description: p.description,

              rating: 4.9,

              reviewCount: 95,

              dietaryTags: p.dietary_tags || ["سمنة بلدي", "طازج يومياً"],

              specs: p.attributes || {
                المطبخ: "أكل بيتي مصري",
                التحضير: "طازج بالطلب",
              },

              offers: [
                {
                  id: `off-${p.id}`,

                  supplierId: "b1000000-0000-0000-0000-000000000001",

                  supplierName: "مطبخ أم أحمد للأكلات المصرية",

                  supplierRating: 4.95,

                  verified: true,

                  price: (p.min_price_cents || 15000) / 100,

                  retailPrice: (p.min_price_cents || 15000) / 100,

                  moq: 1,

                  stock: p.total_stock || 20,

                  location: "المعادي / Maadi",

                  deliveryDays: 1,

                  returnPolicy: "ضمان الجودة والطعم البيتي الأصيل",

                  prepLeadHours: 2,

                  isInstant: true,

                  isScheduled: true,

                  dailyPortionLimit: 20,

                  portions: sampleMatch?.offers[0]?.portions || [
                    {
                      id: `port-${p.id}-default`,

                      name: { ar: "وجبة قياسية", en: "Standard Portion" },

                      price_cents: p.min_price_cents || 15000,

                      is_default: true,
                    },
                  ],
                },
              ],
            }
          }),
        )
      } else {
        setProducts(sampleProducts)
      }

      if (ordList && ordList.length > 0) {
        setOrders(
          ordList.map((o) => ({
            id: o.id,

            orderNumber: o.order_number,

            date: o.created_at ? o.created_at.split("T")[0] : "2026-11-08",

            total: o.grand_total_cents / 100,

            status: "Confirmed",

            paymentMethod: o.payment_method || "فودافون كاش / إنستاباي",

            orderType: "b2c",

            destinationAddress: "شارع النصر، دجلة المعادي، القاهرة",

            suborders: (o.suborders || []).map((so) => ({
              id: so.id,

              suborderNumber: so.suborder_number,

              supplierName: so.supplier_name,

              itemsCount: (so.items || []).length || 1,

              amount: so.subtotal_cents / 100,

              status: "Confirmed",

              trackingNumber: `CAP-${so.suborder_number}`,

              orderMode: so.order_mode as any,

              scheduledDate: so.scheduled_date,

              slotStartTime: so.slot_start_time,

              slotEndTime: so.slot_end_time,

              prepStatus: so.prep_status as any,

              fulfillmentType: so.fulfillment_type as any,

              deliveryFeeCents: so.delivery_fee_cents,

              cookNotes: so.cook_notes,
            })),
          })),
        )
      }
    } catch (e) {
      console.error("Failed to load B2C initial data", e)

      setProducts(sampleProducts)

      setKitchens(sampleKitchens)
    }
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)

    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleAddToCart = (
    product: StorefrontProduct,
    qty = 1,
    chosenPortion?: DishPortion,
  ) => {
    const offer = product.offers[0]

    const effectivePrice = chosenPortion
      ? chosenPortion.price_cents / 100
      : offer.price

    const itemOffer = {
      ...offer,

      price: effectivePrice,
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedPortion?.id === chosenPortion?.id,
    )

    if (existingIndex > -1) {
      const updated = [...cart]

      updated[existingIndex].quantity += qty

      setCart(updated)
    } else {
      setCart([
        ...cart,

        {
          product,

          offer: itemOffer,

          quantity: qty,

          selectedPortion: chosenPortion,

          orderMode,

          scheduledDate,

          slotTime: selectedSlot,
        },
      ])
    }

    showToast(
      isRtl
        ? `تمت إضافة ${product.name.ar} ${
            chosenPortion ? `(${chosenPortion.name.ar})` : ""
          } إلى السلة`
        : `Added ${product.name.en} to cart`,
    )
  }

  const handleExecuteCheckout = async () => {
    if (cart.length === 0) return

    const selectedAddr =
      addresses.find((a) => a.id === selectedAddressId) || addresses[0]

    const foodSubtotal = cart.reduce(
      (s, i) => s + i.offer.price * i.quantity,
      0,
    )

    const deliveryFee = 25.0 // 25 EGP standard platform delivery fee

    const grandTotal = foodSubtotal + deliveryFee

    const orderId = `MAT-${Math.floor(10000 + Math.random() * 90000)}`

    try {
      await api.checkout({
        order_type: "b2c",

        payment_method: paymentMethod === "wallet" ? "wallet" : "credit_card",

        delivery_address: `${selectedAddr?.streetAddress || "شارع النصر"}, ${selectedAddr?.district || "المعادي"}, ${selectedAddr?.city || "القاهرة"}`,

        order_mode: orderMode,

        scheduled_date: scheduledDate,

        slot_start_time: selectedSlot.split(" - ")[0] || "14:00",

        slot_end_time: selectedSlot.split(" - ")[1] || "16:00",

        fulfillment_type: "platform_delivery",

        customer_notes: customerNotes || "تسليم الوجبة ساخنة من فضلك",

        items: cart.map((i) => ({
          offer_id: i.offer.id,

          quantity: i.quantity,
        })),
      })
    } catch (e) {
      console.warn("Backend checkout call:", e)
    }

    // Group cart items into kitchen suborders

    const kitchenSubordersMap: Record<string, {
      name: string
      amount: number
      items: number
    }> = {}

    cart.forEach((item) => {
      const supId = item.offer.supplierId || "um-ahmed"

      const supName = item.offer.supplierName || "مطبخ أم أحمد للأكلات المصرية"

      if (!kitchenSubordersMap[supId]) {
        kitchenSubordersMap[supId] = { name: supName, amount: 0, items: 0 }
      }

      kitchenSubordersMap[supId].amount += item.offer.price * item.quantity

      kitchenSubordersMap[supId].items += item.quantity
    })

    const newOrder: ParentOrder = {
      id: `ord-${Date.now()}`,

      orderNumber: orderId,

      date: scheduledDate,

      total: grandTotal,

      status: "Confirmed",

      paymentMethod:
        paymentMethod === "wallet"
          ? "محفظة مطبخي الذكية"
          : "بطاقة دفع / فودافون كاش",

      orderType: "b2c",

      destinationAddress: `${selectedAddr?.streetAddress || "شارع النصر"}، ${selectedAddr?.district || "المعادي"}`,

      suborders: Object.entries(kitchenSubordersMap).map(
        ([sId, sData], idx) => ({
          id: `so-${Date.now()}-${idx}`,

          suborderNumber: `SUB-${orderId}-${idx + 1}`,

          supplierName: sData.name,

          itemsCount: sData.items,

          amount: sData.amount + (idx === 0 ? deliveryFee : 0),

          status: "Confirmed",

          trackingNumber: `CAP-${Date.now().toString().slice(-6)}`,

          orderMode: orderMode,

          scheduledDate: scheduledDate,

          slotStartTime: selectedSlot.split(" - ")[0] || "14:00",

          slotEndTime: selectedSlot.split(" - ")[1] || "16:00",

          prepStatus: "new",

          fulfillmentType: "platform_delivery",

          deliveryFeeCents: 2500,

          cookNotes: customerNotes,
        }),
      ),
    }

    setOrders([newOrder, ...orders])

    setCart([])

    setConfirmedOrderId(orderId)

    setActiveTab("orders")

    showToast(
      isRtl
        ? `ألف هنا! تم تأكيد طلبك بنجاح رقم #${orderId}`
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
        ? `تم شحن رصيد المحفظة بمبلغ ${amount} ج.م`
        : `Wallet topped up by ${amount} EGP`,
    )
  }

  const foodCategories = [
    { id: "All", ar: "جميع الأصناف 🥘", en: "All Dishes 🥘" },

    {
      id: "محاشي وطواجن فرن",
      ar: "محاشي وطواجن 🍲",
      en: "Mahshi & Tagines 🍲",
    },

    {
      id: "صواني ومكرونات بيتي",
      ar: "صواني وعزومات 🥩",
      en: "Trays & Bakes 🥩",
    },

    { id: "دواجن ومحمرات", ar: "دواجن ومحمرات 🍗", en: "Poultry & Roasted 🍗" },

    {
      id: "كشري وأكلات شعبية",
      ar: "كشري وشعبيات 🥣",
      en: "Koshary & Classics 🥣",
    },

    {
      id: "حلويات ومخبوزات بيتي",
      ar: "حلويات شرقية 🍯",
      en: "Eastern Sweets 🍯",
    },
  ]

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim()

    const matchSearch =
      query === "" ||
      p.name.en.toLowerCase().includes(query) ||
      p.name.ar.includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      (p.dietaryTags &&
        p.dietaryTags.some((tag) => tag.toLowerCase().includes(query)))

    const matchCat =
      selectedCategory === "All" ||
      p.category.en === selectedCategory ||
      p.category.ar === selectedCategory

    const matchKitchen =
      !selectedKitchenId ||
      p.offers.some((o) => o.supplierId === selectedKitchenId)

    return matchSearch && matchCat && matchKitchen
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
            {/* 1. Egyptian Delivery District & Order Mode Selector Bar */}
            <div
              style={{
                background: "#141210",

                border: "1px solid #292524",

                borderRadius: 16,

                padding: "16px 20px",

                marginBottom: 24,

                display: "flex",

                flexWrap: "wrap",

                justifyContent: "space-between",

                alignItems: "center",

                gap: 16,
              }}
            >
              {/* District Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={18} color="#e05638" />
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#a8a29e" }}
                >
                  {isRtl ? "توصيل إلى:" : "Deliver to:"}
                </span>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  style={{
                    background: "#1c1917",

                    color: "#fafaf9",

                    border: "1px solid #334155",

                    borderRadius: 8,

                    padding: "6px 12px",

                    fontSize: 13,

                    fontWeight: 700,

                    cursor: "pointer",
                  }}
                >
                  <option value="All">
                    {isRtl
                      ? "جميع أحياء القاهرة والجيزة"
                      : "All Cairo & Giza Districts"}
                  </option>
                  <option value="Maadi">
                    {isRtl ? "المعادي / Maadi" : "Maadi"}
                  </option>
                  <option value="5th Settlement">
                    {isRtl ? "التجمع الخامس / New Cairo" : "5th Settlement"}
                  </option>
                  <option value="Sheikh Zayed">
                    {isRtl ? "الشيخ زايد / Sheikh Zayed" : "Sheikh Zayed"}
                  </option>
                  <option value="Nasr City">
                    {isRtl ? "مدينة نصر / Nasr City" : "Nasr City"}
                  </option>
                  <option value="Mohandessin">
                    {isRtl ? "المهندسين والدقي / Dokki" : "Mohandessin"}
                  </option>
                  <option value="October">
                    {isRtl ? "6 أكتوبر / 6th of October" : "6th of October"}
                  </option>
                </select>
              </div>

              {/* Order Mode Switcher: Instant vs Scheduled */}
              <div
                style={{
                  display: "flex",

                  alignItems: "center",

                  gap: 6,

                  background: "#1c1917",

                  padding: "4px",

                  borderRadius: 10,

                  border: "1px solid #292524",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOrderMode("instant")}
                  style={{
                    border: 0,

                    background:
                      orderMode === "instant"
                        ? "linear-gradient(135deg, #e05638, #c2410c)"
                        : "transparent",

                    color: orderMode === "instant" ? "#ffffff" : "#a8a29e",

                    padding: "6px 14px",

                    borderRadius: 8,

                    fontSize: 12,

                    fontWeight: 800,

                    display: "flex",

                    alignItems: "center",

                    gap: 6,

                    cursor: "pointer",

                    transition: "all 0.15s ease",
                  }}
                >
                  <Flame size={14} />
                  <span>{isRtl ? "طلب فوري ساخن ⚡" : "Instant (45-60m)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode("scheduled")}
                  style={{
                    border: 0,

                    background:
                      orderMode === "scheduled"
                        ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                        : "transparent",

                    color: orderMode === "scheduled" ? "#ffffff" : "#a8a29e",

                    padding: "6px 14px",

                    borderRadius: 8,

                    fontSize: 12,

                    fontWeight: 800,

                    display: "flex",

                    alignItems: "center",

                    gap: 6,

                    cursor: "pointer",

                    transition: "all 0.15s ease",
                  }}
                >
                  <Calendar size={14} />
                  <span>{isRtl ? "جدولة مسبقة 📅" : "Schedule Ahead"}</span>
                </button>
              </div>

              {/* Scheduled Date & Window Picker */}
              {orderMode === "scheduled" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={{
                      background: "#1c1917",

                      color: "#60a5fa",

                      border: "1px solid rgba(37, 99, 235, 0.4)",

                      borderRadius: 8,

                      padding: "6px 10px",

                      fontSize: 12,

                      fontWeight: 700,

                      cursor: "pointer",
                    }}
                  >
                    <option value={new Date().toISOString().split("T")[0]}>
                      {isRtl ? "اليوم" : "Today"} (
                      {new Date().toISOString().split("T")[0]})
                    </option>
                    <option
                      value={
                        new Date(Date.now() + 86400000)
                          .toISOString()
                          .split("T")[0]
                      }
                    >
                      {isRtl ? "غداً" : "Tomorrow"} (
                      {
                        new Date(Date.now() + 86400000)
                          .toISOString()
                          .split("T")[0]
                      }
                      )
                    </option>
                    <option
                      value={
                        new Date(Date.now() + 172800000)
                          .toISOString()
                          .split("T")[0]
                      }
                    >
                      {isRtl ? "بعد غد" : "In 2 Days"} (
                      {
                        new Date(Date.now() + 172800000)
                          .toISOString()
                          .split("T")[0]
                      }
                      )
                    </option>
                  </select>

                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    style={{
                      background: "#1c1917",

                      color: "#fafaf9",

                      border: "1px solid #334155",

                      borderRadius: 8,

                      padding: "6px 10px",

                      fontSize: 12,

                      fontWeight: 700,

                      cursor: "pointer",
                    }}
                  >
                    <option value="13:00 - 15:00">
                      {isRtl
                        ? "1:00 م - 3:00 م (غداء مبكر)"
                        : "1:00 PM - 3:00 PM (Early Lunch)"}
                    </option>
                    <option value="15:00 - 17:00">
                      {isRtl
                        ? "3:00 م - 5:00 م (غداء عائلي)"
                        : "3:00 PM - 5:00 PM (Family Lunch)"}
                    </option>
                    <option value="19:00 - 21:00">
                      {isRtl
                        ? "7:00 م - 9:00 م (عشاء)"
                        : "7:00 PM - 9:00 PM (Dinner)"}
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* 2. Hero Marketing Banner */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, #7f1d1d 0%, #991b1b 30%, #e05638 100%)",

                borderRadius: 16,

                padding: "36px 40px",

                marginBottom: 32,

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                boxShadow: "0 12px 30px rgba(224, 86, 56, 0.25)",
              }}
            >
              <div style={{ maxWidth: 600 }}>
                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",

                    padding: "4px 12px",

                    borderRadius: 20,

                    fontSize: 12,

                    fontWeight: 800,

                    color: "#ffffff",

                    display: "inline-flex",

                    alignItems: "center",

                    gap: 6,
                  }}
                >
                  <Sparkles size={13} />
                  <span>
                    {isRtl
                      ? "أكل بيتي مضمون ونظيف 100%"
                      : "100% Certified Egyptian Home Cooking"}
                  </span>
                </span>
                <h1
                  style={{
                    fontSize: 32,

                    fontWeight: 900,

                    color: "#ffffff",

                    margin: "14px 0 10px 0",

                    lineHeight: 1.25,
                  }}
                >
                  {isRtl
                    ? "طواجن ومحاشي وصواني بالسمنة البلدي من أيدي ستات بيوت شاطرات"
                    : tc.heroTitle}
                </h1>
                <p
                  style={{
                    color: "#ffedd5",

                    fontSize: 15,

                    margin: "0 0 20px 0",

                    lineHeight: 1.6,
                  }}
                >
                  {isRtl
                    ? "اطلبي وجبة غدا فورية سخنة توصلك خلال ساعة، أو جدولي صواني العزومات والمناسبات للغد بأفضل طعم مصري أصيل."
                    : tc.heroSubtitle}
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setActiveTab("catalog")}
                    style={{
                      background: "#ffffff",

                      color: "#991b1b",

                      border: 0,

                      padding: "10px 24px",

                      borderRadius: 20,

                      fontWeight: 900,

                      fontSize: 14,

                      cursor: "pointer",

                      boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                    }}
                  >
                    {isRtl ? "استعراض منيو اليوم" : "Browse Food Menu"} →
                  </button>
                  <button
                    onClick={() => onSwitchPortal?.("supplier")}
                    style={{
                      background: "rgba(0,0,0,0.25)",

                      color: "#ffffff",

                      border: "1px solid rgba(255,255,255,0.4)",

                      padding: "10px 20px",

                      borderRadius: 20,

                      fontWeight: 800,

                      fontSize: 13,

                      cursor: "pointer",
                    }}
                  >
                    {isRtl
                      ? "أنتِ شيف منزلية؟ انضمي لمطبخي 👩‍🍳"
                      : "Home Cook? Join Us"}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 80, opacity: 0.9 }}>🍲</div>
            </div>

            {/* 2.5 Food Categories Selector Pills */}
            <div
              style={{ marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {foodCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id

                  const count =
                    cat.id === "All"
                      ? products.length
                      : products.filter(
                          (p) =>
                            p.category.ar === cat.id ||
                            p.category.en === cat.id,
                        ).length

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        border: `1px solid ${
                          isSelected ? "#e05638" : "#292524"
                        }`,

                        background: isSelected
                          ? "rgba(224, 86, 56, 0.2)"
                          : "#141210",

                        color: isSelected ? "#f87171" : "#d6d3d1",

                        padding: "8px 16px",

                        borderRadius: 20,

                        fontSize: 13,

                        fontWeight: 800,

                        whiteSpace: "nowrap",

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        gap: 8,

                        boxShadow: isSelected
                          ? "0 4px 14px rgba(224, 86, 56, 0.25)"
                          : "none",

                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{isRtl ? cat.ar : cat.en}</span>
                      <span
                        style={{
                          background: isSelected
                            ? "rgba(224, 86, 56, 0.4)"
                            : "#292524",

                          color: isSelected ? "#ffffff" : "#a8a29e",

                          padding: "1px 6px",

                          borderRadius: 10,

                          fontSize: 11,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Certified Home Kitchens Showcase (مطابخ الستات) */}
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ChefHat size={20} color="#e05638" />
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#ffffff",
                      margin: 0,
                    }}
                  >
                    {isRtl
                      ? "مطابخ الستات المعتمدة بالقاهرة والجيزة"
                      : "Certified Home Kitchens"}
                  </h2>
                </div>
                {selectedKitchenId && (
                  <button
                    onClick={() => setSelectedKitchenId(null)}
                    style={{
                      background: "transparent",

                      color: "#e05638",

                      border: 0,

                      fontSize: 12,

                      fontWeight: 700,

                      cursor: "pointer",
                    }}
                  >
                    {isRtl ? "إلغاء التحديد وعرض كل المطابخ" : "Clear Filter"}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",

                  gap: 14,
                }}
              >
                {kitchens.map((k) => {
                  const isSelected =
                    selectedKitchenId === k.organizationId ||
                    selectedKitchenId === k.id

                  return (
                    <div
                      key={k.id}
                      onClick={() =>
                        setSelectedKitchenId(
                          isSelected ? null : k.organizationId || k.id,
                        )
                      }
                      style={{
                        background: isSelected
                          ? "rgba(224, 86, 56, 0.15)"
                          : "#141210",

                        border: `1px solid ${
                          isSelected ? "#e05638" : "#292524"
                        }`,

                        borderRadius: 14,

                        padding: "16px",

                        cursor: "pointer",

                        transition: "all 0.18s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 40,

                              height: 40,

                              borderRadius: "50%",

                              background:
                                "linear-gradient(135deg, #e05638, #b91c1c)",

                              display: "grid",

                              placeItems: "center",

                              color: "#ffffff",

                              fontWeight: 800,
                            }}
                          >
                            <ChefHat size={20} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: "#fafaf9",
                              }}
                            >
                              {k.chefName}
                            </div>
                            <div style={{ fontSize: 11, color: "#a8a29e" }}>
                              {k.district}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            background: "rgba(34, 197, 94, 0.15)",

                            color: "#4ade80",

                            fontSize: 11,

                            fontWeight: 700,

                            padding: "2px 6px",

                            borderRadius: 6,
                          }}
                        >
                          ★ {k.hygieneRating}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#a8a29e",
                          margin: "10px 0 0 0",
                          lineHeight: 1.4,
                        }}
                      >
                        {k.bio}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active Kitchen Spotlight Banner (when filtered) */}
            {selectedKitchenId &&
              (() => {
                const activeK = kitchens.find(
                  (k) => (k.organizationId || k.id) === selectedKitchenId,
                )

                if (!activeK) return null

                return (
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(224, 86, 56, 0.15) 0%, #141210 100%)",

                      border: "1px solid #e05638",

                      borderRadius: 14,

                      padding: "18px 24px",

                      marginBottom: 24,

                      display: "flex",

                      flexWrap: "wrap",

                      justifyContent: "space-between",

                      alignItems: "center",

                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",

                        alignItems: "center",

                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 52,

                          height: 52,

                          borderRadius: "50%",

                          background:
                            "linear-gradient(135deg, #e05638, #b91c1c)",

                          display: "grid",

                          placeItems: "center",

                          color: "#ffffff",

                          fontSize: 24,
                        }}
                      >
                        👩‍🍳
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",

                            alignItems: "center",

                            gap: 10,

                            flexWrap: "wrap",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,

                              fontSize: 17,

                              fontWeight: 900,

                              color: "#ffffff",
                            }}
                          >
                            {activeK.chefName} ({activeK.kitchenName.ar})
                          </h3>
                          <span
                            style={{
                              background: "rgba(34, 197, 94, 0.2)",

                              color: "#4ade80",

                              fontSize: 11,

                              fontWeight: 700,

                              padding: "2px 8px",

                              borderRadius: 12,
                            }}
                          >
                            ★ {activeK.hygieneRating} مطبخ معتمد ومفتش صحياً
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "5px 0 0 0",

                            fontSize: 12,

                            color: "#a8a29e",

                            lineHeight: 1.4,
                          }}
                        >
                          {activeK.bio} • 📍 {activeK.district} • 🛵 توصيل حتى{" "}
                          {activeK.deliveryRadiusKm} كم
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedKitchenId(null)}
                      style={{
                        background: "#292524",

                        color: "#fafaf9",

                        border: "1px solid #44403c",

                        padding: "8px 16px",

                        borderRadius: 8,

                        fontSize: 12,

                        fontWeight: 700,

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        gap: 6,
                      }}
                    >
                      <span>✕</span>
                      <span>
                        {isRtl
                          ? "إلغاء التحديد وعرض كل المطابخ"
                          : "Show All Kitchens"}
                      </span>
                    </button>
                  </div>
                )
              })()}

            {/* 4. Trending Food Dishes Grid with Portions & EGP */}
            <div
              style={{
                marginBottom: 18,

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Flame size={20} color="#e05638" />
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: 0,
                  }}
                >
                  {isRtl
                    ? "الأكلات الأكثر طلباً اليوم في منطقتك"
                    : tc.trendingDeals}
                </h2>
              </div>
              <button
                onClick={() => setActiveTab("catalog")}
                style={{
                  background: "transparent",

                  color: "#e05638",

                  border: 0,

                  fontWeight: 700,

                  fontSize: 13,

                  cursor: "pointer",
                }}
              >
                {isRtl ? "عرض كل الأصناف" : "View All"} →
              </button>
            </div>

            <div
              style={{
                display: "grid",

                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",

                gap: 20,
              }}
            >
              {products

                .filter((p) => {
                  if (!selectedKitchenId) return true

                  return p.offers.some(
                    (o) => o.supplierId === selectedKitchenId,
                  )
                })

                .slice(0, 6)

                .map((p) => {
                  const offer = p.offers[0]

                  const portions = offer?.portions || []

                  const currentPortionId =
                    selectedPortions[p.id] || portions[0]?.id

                  const chosenPortion =
                    portions.find((po) => po.id === currentPortionId) ||
                    portions[0]

                  const displayPrice = chosenPortion
                    ? chosenPortion.price_cents / 100
                    : offer.price

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#141210",

                        borderRadius: 14,

                        border: "1px solid #292524",

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
                          alt={p.name.ar}
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

                            background: offer?.isInstant
                              ? "rgba(224, 86, 56, 0.9)"
                              : "rgba(37, 99, 235, 0.9)",

                            color: "#ffffff",

                            padding: "3px 9px",

                            borderRadius: 12,

                            fontSize: 11,

                            fontWeight: 800,

                            display: "flex",

                            alignItems: "center",

                            gap: 4,
                          }}
                        >
                          {offer?.isInstant ? (
                            <Flame size={12} />
                          ) : (
                            <Calendar size={12} />
                          )}
                          <span>
                            {offer?.isInstant ? "طلب فوري" : "حجز مسبق"}
                          </span>
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
                            color: "#e05638",

                            fontSize: 11,

                            fontWeight: 700,

                            display: "flex",

                            justifyContent: "space-between",
                          }}
                        >
                          <span>{p.category.ar}</span>
                          <span style={{ color: "#a8a29e" }}>{p.brand}</span>
                        </div>
                        <h4
                          style={{
                            fontSize: 15,

                            fontWeight: 800,

                            margin: "6px 0 8px 0",

                            color: "#ffffff",

                            lineHeight: 1.4,
                          }}
                        >
                          {isRtl ? p.name.ar : p.name.en}
                        </h4>

                        {/* Dietary Tags */}
                        {p.dietaryTags && p.dietaryTags.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              flexWrap: "wrap",
                              marginBottom: 10,
                            }}
                          >
                            {p.dietaryTags.slice(0, 3).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  background: "#1c1917",

                                  color: "#d6d3d1",

                                  border: "1px solid #292524",

                                  padding: "2px 7px",

                                  borderRadius: 4,

                                  fontSize: 11,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Portion Selector Pills if available */}
                        {portions.length > 1 && (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#a8a29e",
                                marginBottom: 5,
                              }}
                            >
                              اختيار الحجم والكمية:
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              {portions.map((po) => (
                                <button
                                  key={po.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPortions({
                                      ...selectedPortions,
                                      [p.id]: po.id,
                                    })
                                  }
                                  style={{
                                    border: 0,

                                    background:
                                      chosenPortion?.id === po.id
                                        ? "rgba(224, 86, 56, 0.25)"
                                        : "#1c1917",

                                    borderWidth: 1,

                                    borderStyle: "solid",

                                    borderColor:
                                      chosenPortion?.id === po.id
                                        ? "#e05638"
                                        : "#292524",

                                    color:
                                      chosenPortion?.id === po.id
                                        ? "#f87171"
                                        : "#a8a29e",

                                    padding: "4px 8px",

                                    borderRadius: 6,

                                    fontSize: 11,

                                    fontWeight: 700,

                                    cursor: "pointer",
                                  }}
                                >
                                  {po.name.ar}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Price & Action Buttons */}
                        <div
                          style={{
                            display: "flex",

                            alignItems: "baseline",

                            gap: 6,

                            margin: "auto 0 14px 0",

                            paddingTop: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 22,

                              fontWeight: 900,

                              color: "#e05638",
                            }}
                          >
                            {displayPrice.toLocaleString()}{" "}
                            <span style={{ fontSize: 13 }}>ج.م</span>
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(p, 1, chosenPortion)}
                            style={{
                              flex: 1,

                              background:
                                "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",

                              color: "#ffffff",

                              border: 0,

                              padding: "10px",

                              borderRadius: 8,

                              fontWeight: 800,

                              fontSize: 13,

                              cursor: "pointer",

                              boxShadow: "0 4px 12px rgba(224, 86, 56, 0.3)",

                              display: "flex",

                              alignItems: "center",

                              justifyContent: "center",

                              gap: 6,
                            }}
                          >
                            <ShoppingCart size={15} />
                            <span>{tc.addToCartBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openProductModal(p)}
                            style={{
                              background: "#1c1917",

                              color: "#d6d3d1",

                              border: "1px solid #334155",

                              padding: "10px 12px",

                              borderRadius: 8,

                              fontWeight: 700,

                              fontSize: 12,

                              cursor: "pointer",
                            }}
                            title={
                              isRtl ? "تفاصيل الوجبة والمكونات" : "Dish Details"
                            }
                          >
                            🔍
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* 5. Trust & Quality Guarantee Section */}
            <div
              style={{
                marginTop: 48,

                marginBottom: 24,

                background: "#141210",

                border: "1px solid #292524",

                borderRadius: 16,

                padding: "32px 28px",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  maxWidth: 650,
                  margin: "0 auto 28px auto",
                }}
              >
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "0 0 8px 0",
                  }}
                >
                  {isRtl
                    ? "ليه تطلب من مطبخي؟ (ضمان الطعم والنظافة 100%)"
                    : "Why Choose Matbakhy?"}
                </h3>
                <p style={{ color: "#a8a29e", fontSize: 13, margin: 0 }}>
                  {isRtl
                    ? "أول منصة مصرية متخصصة في تمكين ستات البيوت الماهرات وتقديم أكل بيتي مصري أصيل بأعلى معايير النظافة والاحترافية."
                    : "Certified home-cooked food by talented Egyptian housewives delivered fresh to your dining table."}
                </p>
              </div>

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

                  gap: 20,
                }}
              >
                {[
                  {
                    icon: "🏅",

                    title: isRtl ? "مطابخ بيوت معتمدة" : "Certified Kitchens",

                    desc: isRtl
                      ? "تفتيش صحي دوري وشهادات صحية موثقة لكل ست بيت قبل الانضمام للمنصة."
                      : "Regular hygiene inspections and health certificates for every cook.",
                  },

                  {
                    icon: "🧈",

                    title: isRtl
                      ? "سمنة بلدي ومكونات طازجة"
                      : "100% Baladi Ingredients",

                    desc: isRtl
                      ? "بدون زيوت مهدرجة، بدون مواد حافظة، ولحوم بلدي فريش يومياً."
                      : "Fresh Egyptian meat, no preservatives, and pure local butter.",
                  },

                  {
                    icon: "📦",

                    title: isRtl ? "تغليف حراري فندقي" : "Thermal Packaging",

                    desc: isRtl
                      ? "صواني وأطباق فويل حرارية محكمة تصلك ساخنة بحرارة الفرن."
                      : "Sealed thermal containers to keep your meal steaming hot.",
                  },

                  {
                    icon: "⏱️",

                    title: isRtl
                      ? "التزام بالمواعيد بالدقيقة"
                      : "On-Time Delivery",

                    desc: isRtl
                      ? "تجهيز طازة بالطلب وتوصيل مباشر لميعاد سفرة غداك أو عزومتك."
                      : "Cooked to order and scheduled right for your lunch or dinner.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#1c1917",

                      border: "1px solid #292524",

                      borderRadius: 12,

                      padding: "20px",

                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>
                      {item.icon}
                    </div>
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#ffffff",
                        margin: "0 0 6px 0",
                      }}
                    >
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#a8a29e",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RETAIL CATALOG TAB */}
        {activeTab === "catalog" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1
                style={{
                  fontSize: 26,

                  fontWeight: 900,

                  color: "#ffffff",

                  margin: "0 0 6px 0",
                }}
              >
                {isRtl ? "منيو الأكلات البيتي المصرية 🍲" : tc.navCatalog}
              </h1>
              <p style={{ color: "#a8a29e", fontSize: 14, margin: 0 }}>
                {isRtl
                  ? `استعراض ${filteredProducts.length} صنف طازج بالسمنة البلدي من أفضل شيفات بيوت القاهرة والجيزة`
                  : `Browse ${filteredProducts.length} authentic homemade dishes cooked fresh in Cairo & Giza`}
              </p>
            </div>

            {/* Food Categories Selector in Catalog */}
            <div
              style={{ marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {foodCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id

                  const count =
                    cat.id === "All"
                      ? products.length
                      : products.filter(
                          (p) =>
                            p.category.ar === cat.id ||
                            p.category.en === cat.id,
                        ).length

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        border: `1px solid ${
                          isSelected ? "#e05638" : "#292524"
                        }`,

                        background: isSelected
                          ? "rgba(224, 86, 56, 0.2)"
                          : "#141210",

                        color: isSelected ? "#f87171" : "#d6d3d1",

                        padding: "8px 16px",

                        borderRadius: 20,

                        fontSize: 13,

                        fontWeight: 800,

                        whiteSpace: "nowrap",

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        gap: 8,

                        boxShadow: isSelected
                          ? "0 4px 14px rgba(224, 86, 56, 0.25)"
                          : "none",

                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{isRtl ? cat.ar : cat.en}</span>
                      <span
                        style={{
                          background: isSelected
                            ? "rgba(224, 86, 56, 0.4)"
                            : "#292524",

                          color: isSelected ? "#ffffff" : "#a8a29e",

                          padding: "1px 6px",

                          borderRadius: 10,

                          fontSize: 11,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
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

                const portions = offer?.portions || []

                const currentPortionId =
                  selectedPortions[p.id] || portions[0]?.id

                const chosenPortion =
                  portions.find((po) => po.id === currentPortionId) ||
                  portions[0]

                const displayPrice = chosenPortion
                  ? chosenPortion.price_cents / 100
                  : offer.price

                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#141210",

                      borderRadius: 14,

                      border: "1px solid #292524",

                      overflow: "hidden",

                      display: "flex",

                      flexDirection: "column",
                    }}
                  >
                    <div
                      onClick={() => openProductModal(p)}
                      style={{
                        height: 190,

                        background: "#1e293b",

                        position: "relative",

                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={p.image}
                        alt={p.name.ar}
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

                          background: offer?.isInstant
                            ? "rgba(224, 86, 56, 0.9)"
                            : "rgba(37, 99, 235, 0.9)",

                          color: "#ffffff",

                          padding: "3px 9px",

                          borderRadius: 12,

                          fontSize: 11,

                          fontWeight: 800,

                          display: "flex",

                          alignItems: "center",

                          gap: 4,
                        }}
                      >
                        {offer?.isInstant ? (
                          <Flame size={12} />
                        ) : (
                          <Calendar size={12} />
                        )}
                        <span>
                          {offer?.isInstant ? "طلب فوري" : "حجز مسبق"}
                        </span>
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
                          color: "#e05638",

                          fontSize: 11,

                          fontWeight: 700,

                          display: "flex",

                          justifyContent: "space-between",
                        }}
                      >
                        <span>{p.category.ar}</span>
                        <span style={{ color: "#a8a29e" }}>{p.brand}</span>
                      </div>
                      <h4
                        onClick={() => openProductModal(p)}
                        style={{
                          fontSize: 15,

                          fontWeight: 800,

                          margin: "6px 0 8px 0",

                          color: "#ffffff",

                          lineHeight: 1.4,

                          cursor: "pointer",
                        }}
                      >
                        {isRtl ? p.name.ar : p.name.en}
                      </h4>

                      {/* Dietary Tags */}
                      {p.dietaryTags && p.dietaryTags.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          {p.dietaryTags.slice(0, 3).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                background: "#1c1917",

                                color: "#d6d3d1",

                                border: "1px solid #292524",

                                padding: "2px 7px",

                                borderRadius: 4,

                                fontSize: 11,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Portion Selector Pills if available */}
                      {portions.length > 1 && (
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#a8a29e",
                              marginBottom: 5,
                            }}
                          >
                            {isRtl ? "اختيار الحجم والكمية:" : "Portion Size:"}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {portions.map((po) => (
                              <button
                                key={po.id}
                                type="button"
                                onClick={() =>
                                  setSelectedPortions({
                                    ...selectedPortions,
                                    [p.id]: po.id,
                                  })
                                }
                                style={{
                                  border: 0,

                                  background:
                                    chosenPortion?.id === po.id
                                      ? "rgba(224, 86, 56, 0.25)"
                                      : "#1c1917",

                                  borderWidth: 1,

                                  borderStyle: "solid",

                                  borderColor:
                                    chosenPortion?.id === po.id
                                      ? "#e05638"
                                      : "#292524",

                                  color:
                                    chosenPortion?.id === po.id
                                      ? "#f87171"
                                      : "#a8a29e",

                                  padding: "4px 8px",

                                  borderRadius: 6,

                                  fontSize: 11,

                                  fontWeight: 700,

                                  cursor: "pointer",
                                }}
                              >
                                {po.name.ar}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price in EGP */}
                      <div
                        style={{
                          display: "flex",

                          alignItems: "baseline",

                          gap: 6,

                          margin: "auto 0 14px 0",

                          paddingTop: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 22,

                            fontWeight: 900,

                            color: "#e05638",
                          }}
                        >
                          {displayPrice.toLocaleString()}{" "}
                          <span style={{ fontSize: 13 }}>ج.م</span>
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p, 1, chosenPortion)}
                          style={{
                            flex: 1,

                            background:
                              "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",

                            color: "#ffffff",

                            border: 0,

                            padding: "10px",

                            borderRadius: 8,

                            fontWeight: 800,

                            fontSize: 13,

                            cursor: "pointer",

                            boxShadow: "0 4px 12px rgba(224, 86, 56, 0.3)",

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            gap: 6,
                          }}
                        >
                          <ShoppingCart size={15} />
                          <span>{tc.addToCartBtn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openProductModal(p)}
                          style={{
                            background: "#1c1917",

                            color: "#d6d3d1",

                            border: "1px solid #334155",

                            padding: "10px 12px",

                            borderRadius: 8,

                            fontWeight: 700,

                            fontSize: 12,

                            cursor: "pointer",
                          }}
                          title={
                            isRtl ? "تفاصيل الوجبة والمكونات" : "Dish Details"
                          }
                        >
                          🔍
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

                            color: "#e05638",
                          }}
                        >
                          {(item.offer.price * item.quantity).toFixed(2)}{" "}
                          {isRtl ? "ج.م" : "EGP"}
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
                          {a.label}: {a.streetAddress} ({a.district || a.city})
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
                            paymentMethod === "wallet" ? "#e05638" : "#334155"
                          }`,

                          background:
                            paymentMethod === "wallet"
                              ? "rgba(224, 86, 56, 0.15)"
                              : "#0b0f19",

                          color:
                            paymentMethod === "wallet" ? "#e05638" : "#94a3b8",

                          fontSize: 12,

                          fontWeight: 700,

                          cursor: "pointer",
                        }}
                      >
                        {isRtl ? "المحفظة الإلكترونية (" : "Wallet ("}
                        {((wallet?.availableBalanceCents || 0) / 100).toFixed(
                          2,
                        )}{" "}
                        {isRtl ? "ج.م" : "EGP"})
                      </button>
                      <button
                        onClick={() => setPaymentMethod("card")}
                        style={{
                          flex: 1,

                          padding: "10px",

                          borderRadius: 8,

                          border: `1px solid ${
                            paymentMethod === "card" ? "#e05638" : "#334155"
                          }`,

                          background:
                            paymentMethod === "card"
                              ? "rgba(224, 86, 56, 0.15)"
                              : "#0b0f19",

                          color:
                            paymentMethod === "card" ? "#e05638" : "#94a3b8",

                          fontSize: 12,

                          fontWeight: 700,

                          cursor: "pointer",
                        }}
                      >
                        {isRtl ? "بطاقة بنكية / ميزة" : "Bank Card / Meeza"}
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
                      <span>{isRtl ? "المجموع الفرعي" : "Subtotal"}</span>
                      <span>
                        {cart

                          .reduce((s, i) => s + i.offer.price * i.quantity, 0)

                          .toFixed(2)}{" "}
                        {isRtl ? "ج.م" : "EGP"}
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
                      <span>{isRtl ? "خدمة التوصيل" : "Delivery"}</span>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>
                        {isRtl
                          ? "25.00 ج.م (توصيل المنصة)"
                          : "25.00 EGP (Platform)"}
                      </span>
                    </div>

                    {orderMode === "scheduled" && (
                      <div
                        style={{
                          display: "flex",

                          justifyContent: "space-between",

                          marginBottom: 8,

                          fontSize: 12,

                          color: "#f59e0b",

                          background: "rgba(245, 158, 11, 0.1)",

                          padding: "6px 10px",

                          borderRadius: 6,
                        }}
                      >
                        <span>{isRtl ? "موعد التسليم" : "Scheduled Slot"}</span>
                        <span>
                          {scheduledDate} ({selectedSlot})
                        </span>
                      </div>
                    )}

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
                        {(
                          cart.reduce(
                            (s, i) => s + i.offer.price * i.quantity,
                            0,
                          ) + 25
                        )

                          .toFixed(2)}{" "}
                        {isRtl ? "ج.م" : "EGP"}
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
                        {o.total.toFixed(2)} {isRtl ? "ج.م" : "EGP"}
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

                  color: "#e05638",

                  margin: "8px 0",
                }}
              >
                {((wallet?.availableBalanceCents || 0) / 100).toFixed(2)}{" "}
                {isRtl ? "ج.م" : "EGP"}
              </div>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {isRtl
                  ? "الحساب 2050 • الدفع بنقرة واحدة مفعل"
                  : "Account 2050 • Instant 1-Click Checkout Enabled"}
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
                {isRtl
                  ? "سجل معاملات المحفظة الأخيرة"
                  : "Recent Wallet Activity"}
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
                    <th style={{ padding: "10px" }}>
                      {isRtl ? "التاريخ" : "Date"}
                    </th>
                    <th style={{ padding: "10px" }}>
                      {isRtl ? "الوصف" : "Description"}
                    </th>
                    <th style={{ padding: "10px" }}>
                      {isRtl ? "المرجع" : "Reference"}
                    </th>
                    <th style={{ padding: "10px" }}>
                      {isRtl ? "المبلغ" : "Amount"}
                    </th>
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
                        {tx.isDebit ? "-" : "+"}
                        {(tx.amountCents / 100).toFixed(2)}{" "}
                        {isRtl ? "ج.م" : "EGP"}
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
              {isRtl ? "شحن رصيد المحفظة" : "Top Up Consumer Wallet"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>
              {isRtl
                ? "رصيد فوري لطلب الطعام البيتي بنقرة واحدة (فودافون كاش / إنستاباي)"
                : "Instant funds for home food purchases via Vodafone Cash / InstaPay"}
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {["50", "100", "200", "500"].map((val) => (
                <button
                  key={val}
                  onClick={() => setTopupAmount(val)}
                  style={{
                    flex: 1,

                    padding: "8px",

                    borderRadius: 8,

                    border: `1px solid ${
                      topupAmount === val ? "#e05638" : "#334155"
                    }`,

                    background:
                      topupAmount === val
                        ? "rgba(224, 86, 56, 0.15)"
                        : "#0b0f19",

                    color: topupAmount === val ? "#e05638" : "#94a3b8",

                    fontWeight: 800,

                    cursor: "pointer",
                  }}
                >
                  {val} {isRtl ? "ج.م" : "EGP"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleTopup}
                style={{
                  flex: 1,

                  background: "linear-gradient(135deg, #e05638, #b83d25)",

                  color: "#ffffff",

                  border: 0,

                  padding: "12px",

                  borderRadius: 8,

                  fontWeight: 800,

                  cursor: "pointer",
                }}
              >
                {isRtl
                  ? `تأكيد شحن ${topupAmount} ج.م`
                  : `Confirm ${topupAmount} EGP`}
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

      {/* DISH CUSTOMIZATION MODAL (Food Quick-View & Customization) */}
      {selectedProduct &&
        (() => {
          const offer = selectedProduct.offers[0]

          const portions = offer?.portions || []

          const currentPortion =
            modalPortion ||
            portions.find((p) => p.is_default) ||
            portions[0] ||
            null

          const unitPrice = currentPortion
            ? currentPortion.price_cents / 100
            : offer.price

          const totalPrice = (unitPrice * modalQty).toFixed(2)

          return (
            <div
              style={{
                position: "fixed",

                inset: 0,

                background: "rgba(0,0,0,0.75)",

                backdropFilter: "blur(6px)",

                zIndex: 110,

                display: "grid",

                placeItems: "center",

                padding: 16,

                overflowY: "auto",
              }}
              onClick={() => setSelectedProduct(null)}
            >
              <div
                style={{
                  background: "#141210",

                  border: "1px solid #292524",

                  borderRadius: 16,

                  width: "100%",

                  maxWidth: 540,

                  maxHeight: "92vh",

                  overflowY: "auto",

                  boxShadow: "0 20px 40px rgba(0,0,0,0.8)",

                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Dish Image Banner */}
                <div
                  style={{
                    height: 230,

                    position: "relative",

                    background: "#1e293b",
                  }}
                >
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name.ar}
                    style={{
                      width: "100%",

                      height: "100%",

                      objectFit: "cover",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      position: "absolute",

                      top: 14,

                      [isRtl ? "left" : "right"]: 14,

                      background: "rgba(0,0,0,0.6)",

                      color: "#ffffff",

                      border: 0,

                      width: 32,

                      height: 32,

                      borderRadius: "50%",

                      display: "grid",

                      placeItems: "center",

                      cursor: "pointer",

                      fontSize: 16,

                      fontWeight: 900,
                    }}
                  >
                    ✕
                  </button>
                  <div
                    style={{
                      position: "absolute",

                      bottom: 12,

                      right: isRtl ? 16 : "auto",

                      left: isRtl ? "auto" : 16,

                      display: "flex",

                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(0,0,0,0.7)",

                        color: "#fafaf9",

                        padding: "4px 10px",

                        borderRadius: 12,

                        fontSize: 11,

                        fontWeight: 800,
                      }}
                    >
                      ★ {selectedProduct.rating} ({selectedProduct.reviewCount}{" "}
                      تقييم)
                    </span>
                    <span
                      style={{
                        background: offer?.isInstant
                          ? "rgba(224, 86, 56, 0.9)"
                          : "rgba(37, 99, 235, 0.9)",

                        color: "#ffffff",

                        padding: "4px 10px",

                        borderRadius: 12,

                        fontSize: 11,

                        fontWeight: 800,
                      }}
                    >
                      {offer?.isInstant ? "طلب فوري ساخن ⚡" : "حجز مسبق 📅"}
                    </span>
                  </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "20px 24px" }}>
                  {/* Cook Attribution */}
                  <div
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: 8,

                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>👩‍🍳</span>
                    <span
                      style={{
                        color: "#e05638",

                        fontSize: 12,

                        fontWeight: 800,
                      }}
                    >
                      بإيدين {selectedProduct.brand} •{" "}
                      {selectedProduct.specs["المنطقة"] || "القاهرة"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: 20,

                      fontWeight: 900,

                      color: "#ffffff",

                      margin: "0 0 10px 0",

                      lineHeight: 1.35,
                    }}
                  >
                    {isRtl ? selectedProduct.name.ar : selectedProduct.name.en}
                  </h3>

                  <p
                    style={{
                      color: "#d6d3d1",

                      fontSize: 13,

                      lineHeight: 1.6,

                      margin: "0 0 16px 0",
                    }}
                  >
                    {isRtl
                      ? selectedProduct.description.ar
                      : selectedProduct.description.en}
                  </p>

                  {/* Dietary Tags */}
                  {selectedProduct.dietaryTags &&
                    selectedProduct.dietaryTags.length > 0 && (
                      <div
                        style={{
                          display: "flex",

                          gap: 6,

                          flexWrap: "wrap",

                          marginBottom: 18,
                        }}
                      >
                        {selectedProduct.dietaryTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              background: "#1c1917",

                              color: "#fca5a5",

                              border: "1px solid #292524",

                              padding: "3px 9px",

                              borderRadius: 6,

                              fontSize: 11,

                              fontWeight: 700,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Portion Sizes Selector */}
                  {portions.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <label
                        style={{
                          display: "block",

                          fontSize: 13,

                          fontWeight: 800,

                          color: "#fafaf9",

                          marginBottom: 10,
                        }}
                      >
                        {isRtl
                          ? "اختر الحجم والكمية المناسبة:"
                          : "Select Portion Size:"}
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {portions.map((po) => {
                          const isChosen = currentPortion?.id === po.id

                          return (
                            <div
                              key={po.id}
                              onClick={() => setModalPortion(po)}
                              style={{
                                border: `1px solid ${
                                  isChosen ? "#e05638" : "#292524"
                                }`,

                                background: isChosen
                                  ? "rgba(224, 86, 56, 0.15)"
                                  : "#1c1917",

                                padding: "12px 16px",

                                borderRadius: 10,

                                cursor: "pointer",

                                display: "flex",

                                justifyContent: "space-between",

                                alignItems: "center",

                                transition: "all 0.15s ease",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    width: 18,

                                    height: 18,

                                    borderRadius: "50%",

                                    border: `2px solid ${
                                      isChosen ? "#e05638" : "#78716c"
                                    }`,

                                    display: "grid",

                                    placeItems: "center",
                                  }}
                                >
                                  {isChosen && (
                                    <div
                                      style={{
                                        width: 8,

                                        height: 8,

                                        borderRadius: "50%",

                                        background: "#e05638",
                                      }}
                                    />
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: 13,

                                    fontWeight: 800,

                                    color: isChosen ? "#ffffff" : "#d6d3d1",
                                  }}
                                >
                                  {po.name.ar}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 14,

                                  fontWeight: 900,

                                  color: "#e05638",
                                }}
                              >
                                {(po.price_cents / 100).toFixed(2)} ج.م
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reheating & Packaging Advice */}
                  <div
                    style={{
                      background: "#1c1917",

                      border: "1px solid #292524",

                      borderRadius: 10,

                      padding: "12px 14px",

                      marginBottom: 18,

                      display: "flex",

                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>💡</span>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#a8a29e",
                        lineHeight: 1.5,
                      }}
                    >
                      <b style={{ color: "#fafaf9" }}>
                        نصيحة الست للتقديم والتسخين:{" "}
                      </b>
                      {selectedProduct.specs["طريقة الطهي"] ||
                        "يُفضل تسخين الصينية في فرن ساخن على 180° لمدة 10 دقائق لتعود مقرمشة وطازجة كما خرجت من الفرن."}
                    </div>
                  </div>

                  {/* Chef Special Notes Input */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",

                        fontSize: 12,

                        fontWeight: 700,

                        color: "#a8a29e",

                        marginBottom: 6,
                      }}
                    >
                      {isRtl
                        ? "ملاحظاتك الخاصة للشيف (مثال: ملح خفيف، شطة زيادة...):"
                        : "Special instructions for the chef:"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        isRtl
                          ? "اكتب أي طلب خاص لتحضير الوجبة..."
                          : "Any dietary or spice preferences..."
                      }
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      style={{
                        width: "100%",

                        background: "#0b0f19",

                        color: "#ffffff",

                        border: "1px solid #334155",

                        borderRadius: 8,

                        padding: "10px 12px",

                        fontSize: 13,
                      }}
                    />
                  </div>

                  {/* Stepper & Add to Cart Sticky Button */}
                  <div
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: 12,

                      borderTop: "1px solid #292524",

                      paddingTop: 16,
                    }}
                  >
                    {/* Quantity Stepper */}
                    <div
                      style={{
                        display: "flex",

                        alignItems: "center",

                        gap: 8,

                        background: "#1c1917",

                        border: "1px solid #292524",

                        borderRadius: 8,

                        padding: "4px 8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                        style={{
                          background: "transparent",

                          border: 0,

                          color: "#fafaf9",

                          fontSize: 18,

                          fontWeight: 900,

                          cursor: "pointer",

                          width: 28,

                          height: 28,
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          fontSize: 15,

                          fontWeight: 900,

                          color: "#ffffff",

                          minWidth: 20,

                          textAlign: "center",
                        }}
                      >
                        {modalQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModalQty(modalQty + 1)}
                        style={{
                          background: "transparent",

                          border: 0,

                          color: "#fafaf9",

                          fontSize: 18,

                          fontWeight: 900,

                          cursor: "pointer",

                          width: 28,

                          height: 28,
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        if (modalNotes) {
                          setCustomerNotes(
                            customerNotes
                              ? `${customerNotes} | ${selectedProduct.name.ar}: ${modalNotes}`
                              : `${selectedProduct.name.ar}: ${modalNotes}`,
                          )
                        }

                        handleAddToCart(
                          selectedProduct,

                          modalQty,

                          currentPortion || undefined,
                        )

                        setSelectedProduct(null)
                      }}
                      style={{
                        flex: 1,

                        background:
                          "linear-gradient(135deg, #e05638 0%, #c2410c 100%)",

                        color: "#ffffff",

                        border: 0,

                        padding: "12px",

                        borderRadius: 10,

                        fontWeight: 900,

                        fontSize: 14,

                        cursor: "pointer",

                        boxShadow: "0 6px 16px rgba(224, 86, 56, 0.4)",

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        gap: 8,
                      }}
                    >
                      <ShoppingCart size={16} />
                      <span>
                        {isRtl
                          ? `إضافة للطلب (${totalPrice} ج.م)`
                          : `Add to Cart (${totalPrice} EGP)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* STICKY FLOATING CART BAR */}
      {cart.length > 0 && activeTab !== "cart" && (
        <div
          style={{
            position: "fixed",

            bottom: 20,

            left: "50%",

            transform: "translateX(-50%)",

            zIndex: 90,

            width: "calc(100% - 40px)",

            maxWidth: 780,

            background: "linear-gradient(135deg, #1c1917 0%, #141210 100%)",

            border: "1px solid #e05638",

            borderRadius: 16,

            padding: "12px 22px",

            boxShadow:
              "0 12px 30px rgba(0,0,0,0.7), 0 0 20px rgba(224, 86, 56, 0.25)",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                background: "#e05638",

                color: "#ffffff",

                width: 42,

                height: 42,

                borderRadius: 12,

                display: "grid",

                placeItems: "center",
              }}
            >
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ color: "#ffffff", fontWeight: 900, fontSize: 14 }}>
                {isRtl
                  ? `سلة الطعام (${cart.reduce((s, i) => s + i.quantity, 0)} وجبات)`
                  : `Your Cart (${cart.reduce((s, i) => s + i.quantity, 0)} items)`}
              </div>
              <div style={{ color: "#e05638", fontWeight: 800, fontSize: 13 }}>
                {isRtl ? "المجموع:" : "Total:"}{" "}
                {cart

                  .reduce((s, i) => s + i.offer.price * i.quantity, 0)

                  .toFixed(2)}{" "}
                {isRtl ? "ج.م" : "EGP"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("cart")}
            style={{
              background: "linear-gradient(135deg, #e05638, #b83d25)",

              color: "#ffffff",

              border: 0,

              padding: "10px 22px",

              borderRadius: 10,

              fontWeight: 900,

              fontSize: 13,

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              gap: 8,

              boxShadow: "0 4px 12px rgba(224, 86, 56, 0.3)",
            }}
          >
            <span>{isRtl ? "متابعة الطلب والدفع" : "Proceed to Checkout"}</span>
            <span>{isRtl ? "←" : "→"}</span>
          </button>
        </div>
      )}
    </div>
  )
}
