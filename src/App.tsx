/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Plus, 
  FileSpreadsheet, 
  HelpCircle, 
  WifiOff, 
  ArrowLeft,
  Flame,
  Sun
} from "lucide-react";
import { Product, Category, CartItem, StoreConfig, PromoItem } from "./types";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { CategoryBar } from "./components/CategoryBar";
import { ProductCard } from "./components/ProductCard";
import { ProductModal } from "./components/ProductModal";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { InstallPwaBanner } from "./components/InstallPwaBanner";
import { HomeDashboard } from "./components/HomeDashboard";
import { ScheduleView } from "./components/ScheduleView";
import { LoyaltyView } from "./components/LoyaltyView";
import { FeedbackView } from "./components/FeedbackView";
import { BottomNav, NavView } from "./components/BottomNav";
import { FeedbackModal } from "./components/FeedbackModal";
import { TeamScheduleModal } from "./components/TeamScheduleModal";
import { AnimatedNotificationBanner, LiveNotificationPayload } from "./components/AnimatedNotificationBanner";
import { usePWA } from "./hooks/usePWA";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [seasonalPromos, setSeasonalPromos] = useState<PromoItem[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Team Approvals Live Sync State across all devices
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pendingApprovalsList, setPendingApprovalsList] = useState<any[]>([]);
  const [isAdminTeamModalOpen, setIsAdminTeamModalOpen] = useState<boolean>(false);
  const [adminTeamModalTab, setAdminTeamModalTab] = useState<"manage" | "approvals" | "roles" | "password" | "sheets">("approvals");

  // Active View State: 5 Views (home | catalog | schedule | loyalty | feedback)
  const [activeView, setActiveView] = useState<NavView>("home");

  // Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Live Animated Push Notification Banner State (Vehicle Moving Animation)
  const [liveNotification, setLiveNotification] = useState<LiveNotificationPayload | null>(null);

  // PWA Capabilities & Lifecycle
  const { isInstallable, isInstalled, isOffline, isIOS, promptInstall } = usePWA();

  // Filters & Search
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [activePromoFilter, setActivePromoFilter] = useState<"alltime" | "seasonal" | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPopularOnly, setShowPopularOnly] = useState<boolean>(false);

  // Cart & Modals
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("frozenbergerak_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Listen to hash for direct deep-linking from Push Notifications (e.g. /#jadual)
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash === "#section-jadual-pergerakan" || hash === "#jadual" || hash === "#schedule") {
        setActiveView("schedule");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (hash === "#loyalti" || hash === "#loyalty") {
        setActiveView("loyalty");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (hash === "#aduan" || hash === "#feedback") {
        setActiveView("feedback");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (hash === "#katalog" || hash === "#catalog") {
        setActiveView("catalog");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    handleHashCheck();
    window.addEventListener("hashchange", handleHashCheck);
    return () => window.removeEventListener("hashchange", handleHashCheck);
  }, []);

  // Listen to Service Worker messages and custom live notifications to show the moving Frozen vehicle
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED" && event.data.payload) {
        setLiveNotification({
          id: String(Date.now()),
          title: event.data.payload.title || "FrozenBergerak 📍 Jadual Pergerakan",
          body: event.data.payload.body || "Sila semak jadual pergerakan terkini!",
          url: event.data.payload.url || "/#section-jadual-pergerakan",
          timestamp: Date.now()
        });
      }
    };

    const handleCustomLiveNotification = (event: CustomEvent<LiveNotificationPayload>) => {
      if (event.detail) {
        setLiveNotification({
          ...event.detail,
          id: String(Date.now())
        });
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }
    window.addEventListener("frozen_live_notification" as any, handleCustomLiveNotification as EventListener);

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      }
      window.removeEventListener("frozen_live_notification" as any, handleCustomLiveNotification as EventListener);
    };
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("frozenbergerak_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Gagal menyimpan data cart", e);
    }
  }, [cart]);

  // Live polling for pending team access approvals (Synchronized across all devices)
  useEffect(() => {
    const fetchApprovalsStatus = () => {
      fetch("/api/auth/approvals-status")
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        })
        .then((data) => {
          if (data && data.success && typeof data.pendingCount === "number") {
            setPendingApprovalsCount(data.pendingCount);
            setPendingApprovalsList(data.pendingList || []);
          }
        })
        .catch(() => {});
    };

    fetchApprovalsStatus();
    const interval = setInterval(fetchApprovalsStatus, 8000);
    const handleFocus = () => fetchApprovalsStatus();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Fetch product data from server (which reads directly from Google Sheet with PWA offline fallback)
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const urlParams = forceRefresh ? "?refresh=true" : "";
      const [prodRes, catRes, confRes, promoRes, seasonalRes] = await Promise.all([
        fetch(`/api/products${urlParams}`),
        fetch(`/api/categories${urlParams}`),
        fetch("/api/config"),
        fetch(`/api/promos${urlParams}`).catch(() => null),
        fetch(`/api/seasonal-promos${urlParams}`).catch(() => null),
      ]);

      const prodData = await prodRes.json().catch(() => ({}));
      const catData = await catRes.json().catch(() => ([]));
      const confData = await confRes.json().catch(() => ({}));
      const promoData = promoRes ? await promoRes.json().catch(() => ({})) : {};
      const seasonalData = seasonalRes ? await seasonalRes.json().catch(() => ({})) : {};

      if (!prodRes.ok) {
        throw new Error(
          prodData.error || `Ralat pelayan (Kod: ${prodRes.status}) semasa membaca Google Sheet.`
        );
      }

      setProducts(prodData.products || []);
      setCategories(Array.isArray(catData) ? catData : []);
      setPromos(Array.isArray(promoData?.promos) ? promoData.promos : []);
      setSeasonalPromos(Array.isArray(seasonalData?.promos) ? seasonalData.promos : []);
      setStoreConfig(confData || null);

      if (forceRefresh) {
        showToast("✓ Data berjaya disegerakkan daripada Google Sheet!");
      }
    } catch (err: any) {
      console.error("Error fetching data from Google Sheet:", err);
      if (!navigator.onLine && products.length > 0) {
        showToast("Mod Luar Talian: Memaparkan data produk yang disimpan.");
      } else {
        setProducts([]);
        setCategories([]);
        setPromos([]);
        setSeasonalPromos([]);
        setError(err?.message || "Gagal menyambung dan membaca Google Sheet.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync banner update across storeConfig
  useEffect(() => {
    const handleBannerUpdate = (e: any) => {
      if (e.detail?.url) {
        setStoreConfig((prev) => (prev ? { ...prev, heroBannerUrl: e.detail.url } : prev));
      }
    };
    window.addEventListener("frozen_banner_updated" as any, handleBannerUpdate);
    return () => window.removeEventListener("frozen_banner_updated" as any, handleBannerUpdate);
  }, []);

  // Merge products with any promo items from Alltimepromo and Seasonalpromo sheet tabs
  const allMergedProducts = useMemo(() => {
    const extraPromoProducts: Product[] = [];
    const allPromos = [...promos, ...seasonalPromos];

    allPromos.forEach((pr) => {
      const exists = products.some(
        (p) =>
          p.id.toLowerCase() === pr.id.toLowerCase() ||
          p.name.trim().toLowerCase() === pr.title.trim().toLowerCase()
      );
      const isAlreadyInExtra = extraPromoProducts.some(
        (p) =>
          p.id.toLowerCase() === pr.id.toLowerCase() ||
          p.name.trim().toLowerCase() === pr.title.trim().toLowerCase()
      );
      if (!exists && !isAlreadyInExtra) {
        const isSeasonal = seasonalPromos.some((sp) => sp.id === pr.id);
        extraPromoProducts.push({
          id: pr.id,
          name: pr.title,
          category: isSeasonal ? "PROMOSI BERMUSIM" : "All Time Promo",
          price: pr.promoPrice || pr.originalPrice || 0,
          originalPrice: pr.originalPrice,
          promoPrice: pr.promoPrice,
          unit: pr.unit || "1 pek",
          description: pr.description || "Tawaran promosi istimewa daripada Google Sheets.",
          imageUrl: pr.imageUrl,
          cookedImageUrl: pr.imageUrl,
          isPopular: true,
          isNew: false,
          inStock: !pr.status?.toLowerCase().includes("habis") && !pr.status?.toLowerCase().includes("tidak"),
          halalCertified: true,
          storageInfo: "Simpan pada suhu sejuk beku (-18°C)."
        });
      }
    });

    return [...products, ...extraPromoProducts];
  }, [products, promos, seasonalPromos]);

  // Filtered products calculation for Catalog
  const filteredProducts = useMemo(() => {
    return allMergedProducts.filter((item) => {
      // Promo filter (All Time Promo or Seasonal Promo)
      if (activePromoFilter === "alltime") {
        const isDisc = Boolean(
          (item.promoPrice && item.originalPrice && item.promoPrice < item.originalPrice) ||
          (item.promoPrice && item.promoPrice > 0)
        );
        const matchesPromoTab = promos.some(
          (pr) =>
            pr.title.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            pr.id.toLowerCase() === item.id.toLowerCase() ||
            item.name.toLowerCase().includes(pr.title.toLowerCase()) ||
            pr.title.toLowerCase().includes(item.name.toLowerCase())
        );
        if (!isDisc && !matchesPromoTab && !item.isPopular) {
          return false;
        }
      }

      if (activePromoFilter === "seasonal") {
        const matchesSeasonalPromoTab = seasonalPromos.some(
          (sp) =>
            sp.title.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            sp.id.toLowerCase() === item.id.toLowerCase() ||
            item.name.toLowerCase().includes(sp.title.toLowerCase()) ||
            sp.title.toLowerCase().includes(item.name.toLowerCase())
        );
        const catLower = (item.category || "").toLowerCase();
        const isSeasonalCategory = catLower.includes("seasonal") || catLower.includes("musiman");

        if (!matchesSeasonalPromoTab && !isSeasonalCategory) {
          return false;
        }
      }

      // Category filter (if not filtered by special promo mode or if specific cat is chosen)
      if (activeCategoryId !== "all" && item.category.toLowerCase() !== activeCategoryId.toLowerCase()) {
        return false;
      }

      // Popular filter
      if (showPopularOnly && !item.isPopular && !(item.promoPrice && item.originalPrice && item.promoPrice < item.originalPrice)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        const matchesId = item.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [allMergedProducts, promos, activePromoFilter, activeCategoryId, showPopularOnly, searchQuery]);

  // Navigation Handlers
  const handleNavigateToCatalog = (
    categoryId?: string, 
    promoType?: "alltime" | "seasonal" | "popular" | boolean
  ) => {
    if (categoryId) {
      setActiveCategoryId(categoryId);
    } else {
      setActiveCategoryId("all");
    }

    if (promoType === "alltime") {
      setActivePromoFilter("alltime");
      setShowPopularOnly(false);
    } else if (promoType === "seasonal") {
      setActivePromoFilter("seasonal");
      setShowPopularOnly(false);
    } else if (promoType === "popular" || promoType === true) {
      setActivePromoFilter(null);
      setShowPopularOnly(true);
    } else {
      setActivePromoFilter(null);
      setShowPopularOnly(false);
    }

    setActiveView("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantityToAdd;
        return updated;
      } else {
        return [...prevCart, { product, quantity: quantityToAdd }];
      }
    });
    showToast(`✓ ${product.name} dimasukkan ke senarai pesanan!`);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast("Produk dikeluarkan dari senarai pesanan.");
  };

  const handleClearCart = () => {
    setCart([]);
    showToast("Senarai pesanan dikosongkan.");
  };

  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalCartValue = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50/40 via-slate-50 to-blue-50/30 font-sans text-slate-800 selection:bg-blue-500 selection:text-white pb-20 sm:pb-16">
      
      {/* PWA Install Banner */}
      <InstallPwaBanner
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        onInstall={promptInstall}
      />

      {/* Offline Alert Banner if Internet Disconnected */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Anda sedang dalam mod luar talian (Offline). Aplikasi menggunakan data simpanan cache PWA.</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        totalCartCount={totalCartCount}
        totalCartValue={totalCartValue}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        whatsappNumber={whatsappNumber}
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        isInstallable={isInstallable}
        onInstall={promptInstall}
        isOffline={isOffline}
        activeView={activeView}
        onNavigateView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onNavigateToContact={() => {
          setActiveView("feedback");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenNotifications={() => {
          setActiveView("schedule");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* VIEW 1: UTAMA / HALAMAN UTAMA (Hero, All Time Promo, Seasonal Promo) */}
      {activeView === "home" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <HomeDashboard
            products={allMergedProducts}
            categories={categories}
            promos={promos}
            seasonalPromos={seasonalPromos}
            storeConfig={storeConfig}
            onNavigateToCatalog={handleNavigateToCatalog}
            onNavigateToSchedule={() => {
              setActiveView("schedule");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNavigateView={(view) => {
              setActiveView(view);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onViewProductDetails={(p) => setSelectedProduct(p)}
            onAddToCart={handleAddToCart}
            onOpenFeedback={() => {
              setActiveView("feedback");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
          />
        </div>
      )}

      {/* VIEW 2: KATALOG (Semua Kategori, All Time Promo & Seasonal Promo filters) */}
      {activeView === "catalog" && (
        <>
          {/* Mobile Category & Promo Filter Strip */}
          {categories.length > 0 && (
            <CategoryBar
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelectCategory={(id) => {
                setActiveCategoryId(id);
                setActivePromoFilter(null);
              }}
              showPopularOnly={showPopularOnly}
              onTogglePopularOnly={() => setShowPopularOnly(!showPopularOnly)}
              activePromoFilter={activePromoFilter}
              onSelectPromoFilter={(filter) => {
                setActivePromoFilter(filter);
                if (filter) {
                  setActiveCategoryId("all");
                  setShowPopularOnly(false);
                }
              }}
            />
          )}

          {/* Main Layout Container with Sleek Sidebar */}
          <div className="flex-1 flex max-w-7xl w-full mx-auto">
            
            {/* Desktop Sleek Sidebar */}
            {categories.length > 0 && !error && (
              <Sidebar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={(id) => {
                  setActiveCategoryId(id);
                  setActivePromoFilter(null);
                }}
                showPopularOnly={showPopularOnly}
                onTogglePopularOnly={() => setShowPopularOnly(!showPopularOnly)}
                totalProductsCount={allMergedProducts.length}
                activePromoFilter={activePromoFilter}
                onSelectPromoFilter={(filter) => {
                  setActivePromoFilter(filter);
                  if (filter) {
                    setActiveCategoryId("all");
                    setShowPopularOnly(false);
                  }
                }}
              />
            )}

            {/* Content Main Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-x-hidden">
              
              {/* Main Title & Action Bar */}
              {!error && (
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("home");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Ke Laman Utama</span>
                      </button>

                      {activePromoFilter === "alltime" && (
                        <span className="text-xs font-extrabold text-white bg-rose-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Flame className="w-3 h-3" />
                          🔥 All Time Promo
                        </span>
                      )}

                      {activePromoFilter === "seasonal" && (
                        <span className="text-xs font-extrabold text-white bg-amber-500 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Sun className="w-3 h-3" />
                          ✨ PROMOSI BERMUSIM
                        </span>
                      )}

                      {!activePromoFilter && (
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded">
                          {activeCategoryId === "all" ? "Semua Kategori" : activeCategoryId}
                        </span>
                      )}

                      {showPopularOnly && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded">
                          🔥 Paling Laris
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        Google Sheets Live
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      {activePromoFilter === "alltime"
                        ? "Koleksi All Time Promo"
                        : activePromoFilter === "seasonal"
                        ? "Koleksi Promosi Bermusim"
                        : "Katalog Makanan Beku"}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {activePromoFilter === "alltime"
                        ? "Pilihan produk promosi istimewa berterusan dari tab Alltimepromo."
                        : activePromoFilter === "seasonal"
                        ? "Pilihan pakej jimat dan hidangan khas perayaan seisi keluarga."
                        : "Segar dari peti sejuk, kualiti terbaik sedia dimasak."}
                    </p>
                  </div>

                  {/* View indicators / count & refresh */}
                  <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">
                      Menunjukkan <strong className="text-slate-800">{filteredProducts.length}</strong> produk
                    </span>

                    <button
                      type="button"
                      onClick={() => fetchData(true)}
                      disabled={isRefreshing}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Segarkan data daripada Google Sheet"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                      <span>Segar Semula</span>
                    </button>

                    {(activeCategoryId !== "all" || searchQuery || showPopularOnly || activePromoFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategoryId("all");
                          setActivePromoFilter(null);
                          setSearchQuery("");
                          setShowPopularOnly(false);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        Padam Tapisan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-24 text-center space-y-4">
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">
                    Menyambung dan memuatkan produk daripada Google Sheet...
                  </p>
                </div>
              )}

              {/* Error State */}
              {!loading && error && (
                <div className="py-10 px-6 max-w-xl mx-auto text-left bg-white border border-red-200 rounded-2xl shadow-sm space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-red-900 text-base">
                        Gagal Membaca Data Google Sheet
                      </h3>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Panduan Menyambungkan Google Sheet:</span>
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc text-slate-600">
                      <li>Pastikan GOOGLE_SHEET_ID telah dimasukkan dalam Secrets.</li>
                      <li>Akses Google Sheet mestilah "Anyone with the link can view".</li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fetchData(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span>Cuba Muat Semula</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Empty Search Result State */}
              {!loading && !error && filteredProducts.length === 0 && (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Tiada Produk Ditemui
                  </h3>
                  <p className="text-xs text-slate-500">
                    {searchQuery
                      ? `Tiada makanan beku yang sepadan dengan carian "${searchQuery}".`
                      : "Tiada produk dalam kategori atau tapisan yang dipilih pada masa ini."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategoryId("all");
                      setActivePromoFilter(null);
                      setShowPopularOnly(false);
                    }}
                    className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Tunjukkan Semua Produk
                  </button>
                </div>
              )}

              {/* Product Grid */}
              {!loading && !error && filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => {
                    const cartItem = cart.find((i) => i.product.id === product.id);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        whatsappNumber={whatsappNumber}
                        onViewDetails={(p) => setSelectedProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        isInCart={Boolean(cartItem)}
                        cartQuantity={cartItem ? cartItem.quantity : 0}
                      />
                    );
                  })}

                  {/* Info card */}
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200 border-dashed overflow-hidden flex flex-col justify-center items-center p-8 text-center text-slate-400 min-h-[340px] hover:border-blue-300 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-400">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-600 mb-1">
                      Produk Tambahan Dari Google Sheet
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Sebarang produk baharu yang anda tambah ke Google Sheet akan terpapar di sini secara automatik.
                    </p>
                  </div>
                </div>
              )}

            </main>
          </div>
        </>
      )}

      {/* VIEW 3: JADUAL (Jadual Pergerakan Pasukan) */}
      {activeView === "schedule" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <ScheduleView
            storeConfig={storeConfig}
            onNavigateToCatalog={() => handleNavigateToCatalog("all")}
          />
        </div>
      )}

      {/* VIEW 4: STAMP LOYALTI (Ganjaran & Stamp Card Digital) */}
      {activeView === "loyalty" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <LoyaltyView
            storeConfig={storeConfig}
            onNavigateToCatalog={() => handleNavigateToCatalog("all")}
          />
        </div>
      )}

      {/* VIEW 5: ADUAN / CADANGAN (Maklum Balas, Emel & WhatsApp Pengurusan) */}
      {activeView === "feedback" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <FeedbackView
            storeConfig={storeConfig}
            onNavigateToCatalog={() => handleNavigateToCatalog("all")}
          />
        </div>
      )}

      {/* Live Animated Notification Banner with Moving Frozen Vehicle */}
      <AnimatedNotificationBanner
        notification={liveNotification}
        onDismiss={() => setLiveNotification(null)}
        onClickAction={(url) => {
          if (url && url.includes("jadual")) {
            setActiveView("schedule");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (url && url.includes("katalog")) {
            setActiveView("catalog");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setActiveView("schedule");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      {/* Floating Bottom Cart Bar for Mobile (Positioned above bottom nav) */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-18 left-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700 active:scale-98 transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                {totalCartCount}
              </div>
              <span className="font-bold text-xs">Lihat Senarai Pesanan</span>
            </div>
            <span className="font-black text-sm text-blue-300">
              RM {totalCartValue.toFixed(2)} ➔
            </span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (5 Items) */}
      <BottomNav
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
        }}
        productsCount={products.length}
        hasActiveSchedule={true}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        whatsappNumber={whatsappNumber}
      />

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        whatsappNumber={whatsappNumber}
        onAddToCart={handleAddToCart}
      />

      {/* Order / Cart Slide-over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        whatsappNumber={whatsappNumber}
      />

      {/* Admin Team Approvals & Schedule Modal */}
      <TeamScheduleModal
        isOpen={isAdminTeamModalOpen}
        initialTab={adminTeamModalTab}
        onClose={() => {
          setIsAdminTeamModalOpen(false);
          // Refetch approvals status immediately after closing
          fetch("/api/auth/approvals-status")
            .then(async (res) => {
              if (!res.ok) return null;
              const text = await res.text();
              return text ? JSON.parse(text) : null;
            })
            .then((data) => {
              if (data && data.success && typeof data.pendingCount === "number") {
                setPendingApprovalsCount(data.pendingCount);
                setPendingApprovalsList(data.pendingList || []);
              }
            })
            .catch(() => {});
        }}
        onScheduleUpdated={() => {
          fetchData(true);
        }}
      />

      {/* Footer */}
      <Footer config={storeConfig} />

    </div>
  );
}
