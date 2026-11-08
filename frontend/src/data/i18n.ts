import type { Locale } from "../types"

export interface TranslationDictionary {
  brand: {
    name: string

    sub: string

    version: string
  }

  nav: {
    overview: string

    kyc: string

    catalog: string

    finance: string

    cms: string

    supplier: string

    team: string

    audit: string

    settings: string

    workspaces: string

    administration: string

    collapse: string

    support: string

    supportTime: string
  }

  pages: {
    overview: {
      eyebrow: string

      title: string

      description: string
    }

    kyc: {
      eyebrow: string

      title: string

      description: string
    }

    catalog: {
      eyebrow: string

      title: string

      description: string
    }

    finance: {
      eyebrow: string

      title: string

      description: string
    }

    cms: {
      eyebrow: string

      title: string

      description: string
    }

    supplier: {
      eyebrow: string

      title: string

      description: string
    }

    team: {
      eyebrow: string

      title: string

      description: string
    }

    audit: {
      eyebrow: string

      title: string

      description: string
    }

    settings: {
      eyebrow: string

      title: string

      description: string
    }
  }

  overview: {
    gmv: string

    commission: string

    activeSuppliers: string

    disputeRate: string

    totalOrders: string

    gmvChartTitle: string

    gmvChartHint: string

    topSuppliersTitle: string

    topSuppliersHint: string

    recentActivityTitle: string

    recentActivityHint: string

    colSupplier: string

    colGmv: string

    colOrders: string

    colFulfillment: string

    colStatus: string
  }

  kyc: {
    searchPlaceholder: string

    allStatuses: string

    pending: string

    approved: string

    rejected: string

    filterBtn: string

    exportBtn: string

    statTotal: string

    statPending: string

    statApproved: string

    statRejected: string

    colCompany: string

    colCrNumber: string

    colRisk: string

    colCategory: string

    colSubmitted: string

    colStatus: string

    colActions: string

    drawerTitle: string

    drawerSub: string

    tabOverview: string

    tabDocuments: string

    tabRisk: string

    btnApprove: string

    btnReject: string

    btnSuspend: string

    crDoc: string

    taxDoc: string

    bankDoc: string

    complianceProof: string
  }

  finance: {
    heroVolume: string

    heroRevenue: string

    heroEscrow: string

    heroSettled: string

    tabLedger: string

    tabCommission: string

    tabPayouts: string

    proofBalanced: string

    colEntryId: string

    colTimestamp: string

    colDebit: string

    colCredit: string

    colAmount: string

    colReference: string

    colStatus: string
  }

  catalog: {
    searchPlaceholder: string

    btnAddProduct: string

    btnCategoryFilter: string

    colProduct: string

    colSku: string

    colCategory: string

    colOffersCount: string

    colMinPrice: string

    colModeration: string

    colActions: string
  }

  supplierPortal: {
    verifiedSupplier: string

    activeStatus: string

    tabOverview: string

    tabOffers: string

    tabOrders: string

    tabWallet: string

    statTotalRevenue: string

    statPendingOrders: string

    statFulfillmentRate: string

    statEscrowBalance: string

    colOrderNumber: string

    colItems: string

    colCustomer: string

    colTotal: string

    colStage: string

    btnShipOrder: string
  }

  common: {
    search: string

    filter: string

    export: string

    viewDetails: string

    actions: string

    saveChanges: string

    cancel: string

    currency: string

    loading: string

    error: string

    success: string
  }

  b2b: {
    brandTitle: string

    brandSub: string

    navDashboard: string

    navCatalog: string

    navCart: string

    navOrders: string

    navWarehouses: string

    navTeam: string

    navWallet: string

    navKYC: string

    navProfile: string

    onboardingTitle: string

    onboardingSubtitle: string

    crLabel: string

    vatLabel: string

    submitApplication: string

    underReview: string

    approvedBadge: string

    minOrderQty: string

    volumePricing: string

    supplierComparison: string

    leadTimeDays: string

    addToCartBtn: string

    inStockUnits: string

    outOfStockBadge: string

    supplierSubtotal: string

    destinationWarehouse: string

    poReferenceNumber: string

    proceedToCheckout: string

    warehousesTitle: string

    warehousesSubtitle: string

    addWarehouseBtn: string

    dockType: string

    receivingHours: string

    defaultBadge: string

    teamTitle: string

    teamSubtitle: string

    inviteMemberBtn: string

    walletTitle: string

    walletSubtitle: string

    availableBalance: string

    heldInOrders: string

    totalBalance: string

    topupWalletBtn: string

    statementTitle: string
  }

  b2c: {
    brandTitle: string

    brandSub: string

    navHome: string

    navCatalog: string

    navCart: string

    navOrders: string

    navAddresses: string

    navWallet: string

    navProfile: string

    heroTitle: string

    heroSubtitle: string

    shopDealsBtn: string

    trendingDeals: string

    featuredCategories: string

    searchPlaceholder: string

    addToCartBtn: string

    buyNowBtn: string

    retailPrice: string

    emptyCartMsg: string

    checkoutBtn: string

    step1Address: string

    step2Payment: string

    orderTotal: string

    placeOrderBtn: string

    addressBookTitle: string

    addNewAddress: string

    walletTitle: string

    consumerBalance: string

    quickTopupPrompt: string

    ordersTitle: string

    trackOrderBtn: string
  }
}

export const translations: Record<Locale, TranslationDictionary> = {
  ar: {
    brand: {
      name: "مطبخي",

      sub: "أكل بيتي طازج من بيوتنا لمائدتك",

      version: "الإصدار 1.0 (مصر)",
    },

    nav: {
      overview: "لوحة التحكم الرئيسية",

      kyc: "اعتماد وتأهيل الموردين",

      catalog: "كتالوج المنتجات العام",

      finance: "الدفتر المالي والتسويات",

      cms: "إدارة محتوى المتجر",

      supplier: "بوابة الموردين والتجار",

      team: "فريق العمل والصلاحيات",

      audit: "سجل العمليات والتدقيق",

      settings: "إعدادات المنصة العامة",

      workspaces: "مساحات العمل",

      administration: "الإدارة والأمان",

      collapse: "طي القائمة الجانبية",

      support: "الدعم التقني المتقدم",

      supportTime: "متوسط الرد 4 دقائق",
    },

    pages: {
      overview: {
        eyebrow: "لوحة الإدارة المركزية",

        title: "مركز قيادة السوق المتعدد",

        description:
          "إدارة العمليات المركزية، ومتابعة إجمالي المبيعات، ومراقبة الالتزام، وتسوية المعاملات المباشرة",
      },

      kyc: {
        eyebrow: "الامتثال والتحقق",

        title: "اعتماد الموردين ومراجعة KYC",

        description:
          "التحقق من السجلات التجارية والشهادات الضريبية والحسابات البنكية للموردين الجدد",
      },

      catalog: {
        eyebrow: "إدارة الكتالوج الموحد",

        title: "كتالوج المنتجات المركزي",

        description:
          "مراجعة المنتجات المشتركة، وإدارة الفئات، وقبول عروض التسعير من الموردين",
      },

      finance: {
        eyebrow: "النظام المالي المزدوج",

        title: "الدفتر المالي والعمولات والتسويات",

        description:
          "سجل القيود المحاسبية غير القابل للتعديل، حساب العمولات، وتسوية محافظ الموردين",
      },

      cms: {
        eyebrow: "تخصيص الواجهة",

        title: "إدارة محتوى واجهة المتجر CMS",

        description:
          "تخصيص الأقسام، البانرات الدعائية، والترتيب الديناميكي لمنتجات الواجهة",
      },

      supplier: {
        eyebrow: "بوابة الموردين",

        title: "لوحة تحكم المورد والشريك",

        description:
          "إدارة عروض المنتجات، ومتابعة المخزون، وتجهيز وشحن الطلبات، ومحفظة الأرباح",
      },

      team: {
        eyebrow: "الأمان والصلاحيات",

        title: "إدارة فريق العمل والصلاحيات RBAC",

        description:
          "تعيين الأدوار، والتحكم بالصلاحيات الدقيقة، ومراقبة الجلسات النشطة لمدراء المنصة",
      },

      audit: {
        eyebrow: "سجل الرقابة والامتثال",

        title: "سجل التدقيق والعمليات الشامل",

        description:
          "سجل زمني لجميع عمليات النظام، وتغيير الإعدادات، وحركات الدفتر المحاسبي",
      },

      settings: {
        eyebrow: "تكوين المنصة",

        title: "إعدادات منصة السوق الأساسية",

        description:
          "العمولات العامة، سياسات الدفع والشحن، وإعدادات بوابات الربط والـ API",
      },
    },

    overview: {
      gmv: "إجمالي قيمة البضائع (GMV)",

      commission: "صافي إيرادات العمولات",

      activeSuppliers: "الموردون / التجار المعتمدون",

      disputeRate: "معدل النزاعات والشكاوى",

      totalOrders: "إجمالي طلبات الشراء",

      gmvChartTitle: "أداء المبيعات والسيولة النقدية",

      gmvChartHint: "إجمالي قيمة العمليات المنفذة خلال 12 شهراً ماضية",

      topSuppliersTitle: "أفضل الموردين أداءً",

      topSuppliersHint: "الموردون الأعلى في سرعة التجهيز وجودة التسليم",

      recentActivityTitle: "آخر العمليات والأنشطة",

      recentActivityHint: "متابعة فورية للطلبات، التسجيل، والتحويلات المالية",

      colSupplier: "المورد / الشركة",

      colGmv: "حجم المبيعات",

      colOrders: "الطلبات",

      colFulfillment: "نسبة التجهيز",

      colStatus: "الحالة",
    },

    kyc: {
      searchPlaceholder: "ابحث باسم الشركة، السجل التجاري، أو المسؤول...",

      allStatuses: "جميع الحالات",

      pending: "قيد المراجعة",

      approved: "معتمد ونشط",

      rejected: "مرفوض",

      filterBtn: "تصفية متقدمة",

      exportBtn: "تصدير التقرير",

      statTotal: "إجمالي الموردين",

      statPending: "بانتظار الاعتماد",

      statApproved: "موردون معتمدون",

      statRejected: "طلبات مرفوضة",

      colCompany: "اسم الشركة / المنشأة",

      colCrNumber: "رقم السجل التجاري",

      colRisk: "مستوى المخاطر",

      colCategory: "التصنيف التجاري",

      colSubmitted: "تاريخ التقديم",

      colStatus: "حالة الاعتماد",

      colActions: "الإجراءات",

      drawerTitle: "ملف تدقيق المورد",

      drawerSub: "مراجعة الوثائق الرسمية والامتثال المالي",

      tabOverview: "نظرة عامة",

      tabDocuments: "المستندات والشهادات",

      tabRisk: "تقييم المخاطر",

      btnApprove: "اعتماد وتفعيل المورد",

      btnReject: "رفض الطلب مع إشعار",

      btnSuspend: "تعليق الحساب مؤقتاً",

      crDoc: "شهادة السجل التجاري الرسمي",

      taxDoc: "شهادة ضريبة القيمة المضافة (VAT)",

      bankDoc: "شهادة الآيبان البنكي المعتمد",

      complianceProof: "وثيقة الالتزام بسياسات السوق",
    },

    finance: {
      heroVolume: "إجمالي المعاملات المنفذة",

      heroRevenue: "عمولات المنصة المستحقة",

      heroEscrow: "أموال الضمان المحجوزة (Escrow)",

      heroSettled: "المبالغ المحولة للموردين",

      tabLedger: "دفتر القيود المزدوجة (Ledger)",

      tabCommission: "محرك قواعد العمولات",

      tabPayouts: "طلبات الصرف والتسوية",

      proofBalanced:
        "الدفتر المالي متوازن تماماً: إجمالي المدين = إجمالي الدائن (النظام المحاسبي مطابق 100%)",

      colEntryId: "رقم القيد",

      colTimestamp: "التوقيت",

      colDebit: "الحساب المدين (Debit)",

      colCredit: "الحساب الدائن (Credit)",

      colAmount: "المبلغ",

      colReference: "رقم المرجع / الطلب",

      colStatus: "الحالة",
    },

    catalog: {
      searchPlaceholder: "ابحث بالمنتج، رمز SKU، أو الفئة...",

      btnAddProduct: "إضافة منتج للكتالوج",

      btnCategoryFilter: "تصنيف الفئات",

      colProduct: "اسم المنتج والمواصفات",

      colSku: "رمز SKU",

      colCategory: "الفئة الرئيسية",

      colOffersCount: "عروض الموردين",

      colMinPrice: "يبدأ من",

      colModeration: "حالة الاعتماد",

      colActions: "خيارات",
    },

    supplierPortal: {
      verifiedSupplier: "مورد موثق ومعتمد رسمياً",

      activeStatus: "نشط ومتصل بالمتجر",

      tabOverview: "نظرة عامة ومؤشرات",

      tabOffers: "عروضي وأسعاري",

      tabOrders: "إدارة الطلبات والشحن",

      tabWallet: "محفظتي وأرباحي",

      statTotalRevenue: "إجمالي المبيعات المحققة",

      statPendingOrders: "طلبات قيد التجهيز",

      statFulfillmentRate: "نسبة الالتزام بالشحن",

      statEscrowBalance: "رصيد معلق في الضمان",

      colOrderNumber: "رقم الطلب الفرعي",

      colItems: "المنتجات",

      colCustomer: "المشتري / التاجر",

      colTotal: "الإجمالي",

      colStage: "المرحلة",

      btnShipOrder: "تأكيد الشحن وإرفاق التتبع",
    },

    common: {
      search: "بحث",

      filter: "تصفية",

      export: "تصدير",

      viewDetails: "عرض التفاصيل",

      actions: "الإجراءات",

      saveChanges: "حفظ التغييرات",

      cancel: "إلغاء",

      currency: "جنيه مصري",

      loading: "جاري التحميل...",

      error: "حدث خطأ غير متوقع",

      success: "تمت العملية بنجاح",
    },

    b2b: {
      brandTitle: "منصة المشتريات المؤسسية",

      brandSub: "بوابة المشتريات للشركات والمصانع",

      navDashboard: "لوحة التحكم",

      navCatalog: "كتالوج الجملة",

      navCart: "سلة المشتريات",

      navOrders: "أوامر التوريد",

      navWarehouses: "مستودعات الاستلام",

      navTeam: "إدارة الفريق والصلاحيات",

      navWallet: "المحفظة المؤسسية",

      navKYC: "توثيق المنشأة",

      navProfile: "الملف القانوني",

      onboardingTitle: "توثيق الشركة والتحقق التجاري",

      onboardingSubtitle:
        "يرجى تقديم بيانات السجل التجاري والشهادة الضريبية لاعتماد الحساب",

      crLabel: "رقم السجل التجاري (CR)",

      vatLabel: "الرقم الضريبي (VAT)",

      submitApplication: "إرسال طلب الاعتماد",

      underReview: "قيد المراجعة والتدقيق",

      approvedBadge: "منشأة معتمدة رسمياً",

      minOrderQty: "الحد الأدنى للطلب (MOQ)",

      volumePricing: "جدول تسعير الكميات والخصومات",

      supplierComparison: "مقارنة عروض الموردين المعتمدين",

      leadTimeDays: "أيام التجهيز والشحن",

      addToCartBtn: "إضافة لأمر التوريد",

      inStockUnits: "وحدة متوفرة في المستودعات",

      outOfStockBadge: "غير متوفر لدى المورد",

      supplierSubtotal: "المجموع الفرعي للمورد",

      destinationWarehouse: "مستودع الاستلام المخصص",

      poReferenceNumber: "رقم أمر الشراء الداخلي (PO)",

      proceedToCheckout: "متابعة وتأكيد أمر التوريد",

      warehousesTitle: "مستودعات وأرصفة الاستلام",

      warehousesSubtitle:
        "إدارة مواقع استلام البضائع ومواصفات منصات التفريغ والرافعات",

      addWarehouseBtn: "إضافة مستودع استلام جديد",

      dockType: "نوع رصيف التفريغ",

      receivingHours: "ساعات استقبال الشاحنات",

      defaultBadge: "المستودع الرئيسي",

      teamTitle: "فريق العمل والصلاحيات المؤسسية",

      teamSubtitle:
        "إدارة الموظفين وتعيين أدوار المشتريات والمالية والمستودعات",

      inviteMemberBtn: "دعوة موظف جديد",

      walletTitle: "المحفظة والحساب المالي للشركة",

      walletSubtitle:
        "إدارة الرصيد المالي المعتمد في دفتر الأستاذ وسجل المعاملات",

      availableBalance: "الرصيد المتاح للصرف",

      heldInOrders: "مبالغ محجوزة تحت الطلب",

      totalBalance: "إجمالي الرصيد المؤسسي",

      topupWalletBtn: "شحن رصيد المحفظة",

      statementTitle: "كشف العمليات وسجل القيود المحاسبية",
    },

    b2c: {
      brandTitle: "مطبخي",

      brandSub: "أكل بيتي طازج من بيوتنا لمائدتك",

      navHome: "المطابخ والأطباق",

      navCatalog: "قائمة الطعام",

      navCart: "سلة الوجبات",

      navOrders: "طلباتي",

      navAddresses: "عناويني في مصر",

      navWallet: "محفظتي",

      navProfile: "حسابي",

      heroTitle: "أكل بيتي على أصوله بسمنة بلدي وحب",

      heroSubtitle:
        "طواجن، محاشي، صواني فرن، وحلويات طازجة محضرة بأيدي أمهات وشيفات منزليات محترفات في القاهرة والجيزة",

      shopDealsBtn: "تصفح أطباق اليوم",

      trendingDeals: "أشهر الأطباق طلباً اليوم",

      featuredCategories: "تصفح حسب نوع الأكل",

      searchPlaceholder:
        "ابحث عن طبق، مطبخ بيتي، أو منطقة في القاهرة والجيزة...",

      addToCartBtn: "إضافة للوجبة",

      buyNowBtn: "طلب فوري",

      retailPrice: "السعر شامل التحضير",

      emptyCartMsg:
        "سلة الوجبات فارغة، اختر أشهى الأطباق البيتية وأضفها للسلة!",

      checkoutBtn: "تأكيد الطلب وتحديد موعد التسليم",

      step1Address: "عنوان التوصيل (المحافظة / الحي)",

      step2Payment: "طريقة الدفع وتأكيد الطلب",

      orderTotal: "المبلغ الإجمالي شامل الضريبة",

      placeOrderBtn: "تأكيد الطلب والدفع",

      addressBookTitle: "دفتر العناوين المحفوظة",

      addNewAddress: "إضافة عنوان جديد",

      walletTitle: "محفظة العميل الشخصية",

      consumerBalance: "الرصيد المتاح في المحفظة",

      quickTopupPrompt: "شحن رصيد فوري عبر البطاقة أو المحافظ الإلكترونية",

      ordersTitle: "سجل الطلبات وتتبع الشحنات",

      trackOrderBtn: "تتبع الشحنة مع المندوب",
    },
  },

  en: {
    brand: {
      name: "Matbakhy",

      sub: "Homemade Food Marketplace",

      version: "v1.0 (Egypt)",
    },

    nav: {
      overview: "Executive Overview",

      kyc: "Supplier KYC & Onboarding",

      catalog: "Global Product Catalog",

      finance: "Financial Ledger & Payouts",

      cms: "Storefront CMS Engine",

      supplier: "Supplier Portal View",

      team: "Team & Roles",

      audit: "Audit Log",

      settings: "Platform Settings",

      workspaces: "WORKSPACES",

      administration: "ADMINISTRATION",

      collapse: "Collapse sidebar",

      support: "Priority support",

      supportTime: "Avg. response 4 min",
    },

    pages: {
      overview: {
        eyebrow: "SUPER ADMIN DASHBOARD",

        title: "Marketplace Command Center",

        description:
          "Multi-tenant orchestration, real-time GMV, supplier compliance & high-frequency transaction engine",
      },

      kyc: {
        eyebrow: "COMPLIANCE & VERIFICATION",

        title: "Supplier KYC & Onboarding Review",

        description:
          "Rigorous verification of corporate registries, tax documents, bank accounts, and supplier risk scoring",
      },

      catalog: {
        eyebrow: "CATALOG MANAGEMENT",

        title: "Global Shared Product Catalog",

        description:
          "Single global product taxonomy with multi-supplier competitive offers, tiered pricing, and attribute enforcement",
      },

      finance: {
        eyebrow: "DOUBLE-ENTRY ACCOUNTING",

        title: "Financial Ledger & Payout Settlement",

        description:
          "Audited immutable ledger, automated tier-based platform commissions, and supplier escrow disbursement",
      },

      cms: {
        eyebrow: "STOREFRONT PRESENTATION",

        title: "Storefront Layout & CMS Engine",

        description:
          "Modular storefront section reordering, dynamic banners, featured categories, and multi-lingual content control",
      },

      supplier: {
        eyebrow: "SUPPLIER PORTAL",

        title: "Seller Operations & Order Fulfillment",

        description:
          "Direct supplier view: product offer management, tier pricing, multi-warehouse stock, and kanban fulfillment",
      },

      team: {
        eyebrow: "ACCESS CONTROL",

        title: "Team Members & Granular RBAC",

        description:
          "Manage admin users, role assignments, fine-grained permission scopes, and 2FA authentication states",
      },

      audit: {
        eyebrow: "COMPLIANCE & TRACEABILITY",

        title: "System Audit & Compliance Log",

        description:
          "Immutable trail of administrative decisions, configuration modifications, and ledger authorizations",
      },

      settings: {
        eyebrow: "CONFIGURATION",

        title: "Platform Core Configuration",

        description:
          "Global marketplace rules, fee schedules, payment gateway credentials, and webhook subscriptions",
      },
    },

    overview: {
      gmv: "Gross merchandise value",

      commission: "Net commission revenue",

      activeSuppliers: "Active suppliers / merchants",

      disputeRate: "Dispute rate",

      totalOrders: "Total orders",

      gmvChartTitle: "GMV performance",

      gmvChartHint: "Gross merchandise value · trailing 12 months",

      topSuppliersTitle: "Top Performing Suppliers",

      topSuppliersHint: "Ranked by fulfillment rate and verified GMV volume",

      recentActivityTitle: "Real-time Platform Activity",

      recentActivityHint:
        "Live feed of orders, KYC submissions, and ledger splits",

      colSupplier: "Supplier",

      colGmv: "GMV Volume",

      colOrders: "Orders",

      colFulfillment: "Fulfillment",

      colStatus: "Status",
    },

    kyc: {
      searchPlaceholder: "Search by company name, CR, or contact…",

      allStatuses: "All statuses",

      pending: "Pending review",

      approved: "Approved & active",

      rejected: "Rejected",

      filterBtn: "Filter",

      exportBtn: "Export CSV",

      statTotal: "Total registered",

      statPending: "Awaiting review",

      statApproved: "Verified suppliers",

      statRejected: "Rejected applications",

      colCompany: "Company name",

      colCrNumber: "CR / Tax ID",

      colRisk: "Risk assessment",

      colCategory: "Category",

      colSubmitted: "Submitted date",

      colStatus: "Verification status",

      colActions: "Actions",

      drawerTitle: "Supplier Due Diligence",

      drawerSub: "Official documentation and risk compliance",

      tabOverview: "Overview",

      tabDocuments: "Documents",

      tabRisk: "Risk Scoring",

      btnApprove: "Approve & Activate Supplier",

      btnReject: "Reject Application",

      btnSuspend: "Suspend Account",

      crDoc: "Commercial Registration Certificate",

      taxDoc: "VAT / Tax Compliance Certificate",

      bankDoc: "Verified Bank Account (IBAN)",

      complianceProof: "Marketplace Terms & SLA Agreement",
    },

    finance: {
      heroVolume: "Gross Traded Volume",

      heroRevenue: "Platform Commission",

      heroEscrow: "Held in Escrow",

      heroSettled: "Settled to Suppliers",

      tabLedger: "Double-Entry Ledger",

      tabCommission: "Commission Engine",

      tabPayouts: "Payout Requests",

      proofBalanced:
        "Ledger status: Perfectly balanced (Σ Debits = Σ Credits). Zero financial leakage detected.",

      colEntryId: "Entry ID",

      colTimestamp: "Timestamp",

      colDebit: "Debit Account",

      colCredit: "Credit Account",

      colAmount: "Amount",

      colReference: "Reference / Order",

      colStatus: "Status",
    },

    catalog: {
      searchPlaceholder: "Search products by name, SKU, or category…",

      btnAddProduct: "Add Master Product",

      btnCategoryFilter: "Filter Category",

      colProduct: "Product & Specifications",

      colSku: "SKU",

      colCategory: "Category",

      colOffersCount: "Seller Offers",

      colMinPrice: "Lowest Price",

      colModeration: "Moderation Status",

      colActions: "Actions",
    },

    supplierPortal: {
      verifiedSupplier: "Verified Enterprise Supplier",

      activeStatus: "Operational & Live in Storefront",

      tabOverview: "Overview & KPIs",

      tabOffers: "My Catalog Offers",

      tabOrders: "Orders & Fulfillment",

      tabWallet: "Earnings & Wallet",

      statTotalRevenue: "Total Traded Volume",

      statPendingOrders: "Orders To Fulfill",

      statFulfillmentRate: "SLA Fulfillment Rate",

      statEscrowBalance: "Escrow Pending Balance",

      colOrderNumber: "Suborder #",

      colItems: "Items",

      colCustomer: "Merchant Customer",

      colTotal: "Amount",

      colStage: "Fulfillment Stage",

      btnShipOrder: "Dispatch & Add Tracking",
    },

    common: {
      search: "Search",

      filter: "Filter",

      export: "Export",

      viewDetails: "View Details",

      actions: "Actions",

      saveChanges: "Save Changes",

      cancel: "Cancel",

      currency: "EGP",

      loading: "Loading…",

      error: "An unexpected error occurred",

      success: "Action completed successfully",
    },

    b2b: {
      brandTitle: "Enterprise Procurement",

      brandSub: "B2B Procurement & Supply Chain Portal",

      navDashboard: "Dashboard",

      navCatalog: "Wholesale Catalog",

      navCart: "Procurement Cart",

      navOrders: "Purchase Orders",

      navWarehouses: "Receiving Docks",

      navTeam: "Team & Roles",

      navWallet: "Corporate Wallet",

      navKYC: "Corporate Verification",

      navProfile: "Company Profile",

      onboardingTitle: "Corporate Verification & KYC",

      onboardingSubtitle:
        "Submit commercial registration and tax certificate for enterprise approval",

      crLabel: "Commercial Registration (CR)",

      vatLabel: "VAT / Tax Identification Number",

      submitApplication: "Submit for Approval",

      underReview: "Application Under Review",

      approvedBadge: "Officially Verified Enterprise",

      minOrderQty: "Minimum Order Quantity (MOQ)",

      volumePricing: "Volume Pricing & Tier Discounts",

      supplierComparison: "Verified Supplier Offer Matrix",

      leadTimeDays: "Dispatch Lead Time (Days)",

      addToCartBtn: "Add to Procurement Order",

      inStockUnits: "units available in warehouses",

      outOfStockBadge: "Out of Stock at Supplier",

      supplierSubtotal: "Supplier Subtotal",

      destinationWarehouse: "Destination Receiving Warehouse",

      poReferenceNumber: "Internal Purchase Order (PO) Ref",

      proceedToCheckout: "Review & Execute Order",

      warehousesTitle: "Receiving Warehouses & Docks",

      warehousesSubtitle:
        "Manage freight delivery points, dock heights, and forklift equipment",

      addWarehouseBtn: "Add Receiving Dock",

      dockType: "Loading Dock Type",

      receivingHours: "Freight Receiving Hours",

      defaultBadge: "Default Facility",

      teamTitle: "Corporate Team & RBAC",

      teamSubtitle:
        "Manage employees, roles, and granular procurement permissions",

      inviteMemberBtn: "Invite Colleague",

      walletTitle: "Corporate Wallet & Ledger",

      walletSubtitle:
        "Manage double-entry balance in Account 2010 and audited transaction statement",

      availableBalance: "Available Balance",

      heldInOrders: "Held in Active Orders",

      totalBalance: "Total Corporate Funds",

      topupWalletBtn: "Top Up Wallet Balance",

      statementTitle: "Audited Ledger Transaction Statement",
    },

    b2c: {
      brandTitle: "Matbakhy",

      brandSub: "Fresh Homemade Food Delivered to Your Door",

      navHome: "Kitchens & Dishes",

      navCatalog: "Food Menu",

      navCart: "Meal Cart",

      navOrders: "My Orders",

      navAddresses: "Delivery Addresses (Egypt)",

      navWallet: "My Wallet",

      navProfile: "My Account",

      heroTitle: "Authentic Homemade Food, Cooked with Love",

      heroSubtitle:
        "Oven tagines, stuffed vine leaves, pasta trays, and fresh desserts crafted by certified home chefs across Cairo & Giza",

      shopDealsBtn: "Browse Today's Dishes",

      trendingDeals: "Trending Dishes Today",

      featuredCategories: "Browse by Cuisine",

      searchPlaceholder:
        "Search dishes, home kitchens, or Cairo/Giza districts…",

      addToCartBtn: "Add to Order",

      buyNowBtn: "Order Now",

      retailPrice: "Price per Portion",

      emptyCartMsg:
        "Your meal cart is empty. Pick your favorite homemade dishes!",

      checkoutBtn: "Confirm Order & Choose Delivery Time",

      step1Address: "Delivery Address (Governorate / District)",

      step2Payment: "Payment Method",

      orderTotal: "Grand Total",

      placeOrderBtn: "Place Order Now",

      addressBookTitle: "Saved Delivery Addresses",

      addNewAddress: "Add New Address",

      walletTitle: "Consumer Wallet (2050)",

      consumerBalance: "Available Wallet Balance",

      quickTopupPrompt: "Instant wallet top-up via card",

      ordersTitle: "Order History & Live Tracking",

      trackOrderBtn: "Track Package",
    },
  },
}
