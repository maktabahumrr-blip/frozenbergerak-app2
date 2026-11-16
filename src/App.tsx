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
  WifiOff, 
  ArrowLeft,
  Flame,
  Sun
} from "lucide-react";
import { Product, Category, CartItem, StoreConfig, PromoItem } from "./types";
import {
  fetchLiveCatalog,
  fetchLivePromos,
  fetchLiveSeasonalPromos,
  readCachedPromos,
  buildCategoriesFromProducts
} from "./data/catalogData";
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
  const [promos, setPromos] = useState<PromoItem[]>(() => readCachedPromos("cached_all_time_promos"));
  const [seasonalPromos, setSeasonalPromos] = useState<PromoItem[]>(() => readCachedPromos("cached_seasonal_promos"));
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
  const [installGuideMode, setInstallGuideMode] = useState<"ios" | "browser" | null>(null);

  const handleRequestInstall = async (): Promise<boolean> => {
    if (isIOS) {
      setInstallGuideMode("ios");
      return false;
    }
    if (isInstallable) {
      const accepted = await promptInstall();
      if (!accepted) {
        setInstallGuideMode("browser");
      }
      return accepted;
    }
    setInstallGuideMode("browser");
    return false;
  };

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

  // Live polling for pending team access approvals directly from AKSES TEAM (with local cache fallback)
  const refreshPendingApprovals = async () => {
    try {
      const res = await fetch(`/api/team-access/pending-count?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.pendingList)) {
          setPendingApprovalsCount(Number(data.pendingCount ?? data.pendingList.length) || 0);
          setPendingApprovalsList(data.pendingList);
          return;
        }
      }
    } catch {}
    try {
      const stored = localStorage.getItem("fb_team_approvals");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const pending = list.filter((a: any) => a.status === "pending");
          setPendingApprovalsCount(pending.length);
          setPendingApprovalsList(pending);
        }
      }
    } catch {}
  };

  useEffect(() => {
    refreshPendingApprovals();
    const interval = setInterval(refreshPendingApprovals, 15000);
    const handleFocus = () => refreshPendingApprovals();
    const handleCustomUpdate = () => refreshPendingApprovals();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("fb_approvals_updated", handleCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("fb_approvals_updated", handleCustomUpdate);
    };
  }, []);

  // Fetch product catalog, promos, and store config concurrently with resilient multi-layer fallbacks
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let customSheet = "";
      try {
        customSheet = typeof window !== "undefined" && window.localStorage ? (localStorage.getItem("custom_google_sheet_url") || "") : "";
      } catch {
        customSheet = "";
      }

      const cacheBuster = `_t=${Date.now()}`;

      // Run all data fetches concurrently so All Time Promo & Produk resolve together without lag
      const [catalogResult, promoResult, seasonalResult, confRes] = await Promise.all([
        fetchLiveCatalog(customSheet, forceRefresh).catch(() => null),
        fetchLivePromos(customSheet, forceRefresh).catch(() => null),
        fetchLiveSeasonalPromos(customSheet, forceRefresh).catch(() => null),
        fetch(`/api/config?${cacheBuster}`, { cache: "no-store" }).catch(() => null)
      ]);

      const catalogProducts = Array.isArray(catalogResult?.products) ? catalogResult.products : [];
      const catalogCategories = Array.isArray(catalogResult?.categories) ? catalogResult.categories : [];

      if (catalogProducts.length > 0) {
        setProducts(catalogProducts);
        setCategories(catalogCategories);
      } else {
        setProducts((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : []));
        setCategories((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : []));
      }

      if (promoResult) {
        if (promoResult.promos.length > 0) {
          setPromos(promoResult.promos);
        } else if (promoResult.confirmedEmpty) {
          setPromos([]);
        }
      }

      if (seasonalResult) {
        if (seasonalResult.promos.length > 0) {
          setSeasonalPromos(seasonalResult.promos);
        } else if (seasonalResult.confirmedEmpty) {
          setSeasonalPromos([]);
        }
      }

      if (confRes && confRes.ok) {
        try {
          const contentType = confRes.headers.get("content-type") || "";
          const confText = (await confRes.text()).trim();
          if (confText && !confText.startsWith("<") && !contentType.includes("text/html")) {
            const parsedConf = JSON.parse(confText);
            if (parsedConf && typeof parsedConf === "object") {
              setStoreConfig(parsedConf);
            }
          }
        } catch {}
      }

      if (forceRefresh) {
        showToast(`✓ Data produk berjaya dikemaskini (${catalogProducts.length} produk)!`);
      }
    } catch (err: any) {
      console.warn("Issue encountered during catalog fetch, falling back gracefully:", err);
      setProducts((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : []));
      setCategories((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : []));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Merge products with any promo items from Alltimepromo and Seasonalpromo sheet tabs
  const allMergedProducts = useMemo(() => {
    try {
      const safeProducts = Array.isArray(products) ? products : [];
      const safePromos = Array.isArray(promos) ? promos : [];
      const safeSeasonalPromos = Array.isArray(seasonalPromos) ? seasonalPromos : [];

      const extraPromoProducts: Product[] = [];
      const allPromos = [...safePromos, ...safeSeasonalPromos];

      allPromos.forEach((pr) => {
        if (!pr || !pr.id) return;
        const promoTitle = String(pr.title || "").trim().toLowerCase();
        const promoId = String(pr.id || "").toLowerCase();

        const exists = safeProducts.some(
          (p) =>
            (p?.id && String(p.id).toLowerCase() === promoId) ||
            (p?.name && promoTitle && String(p.name).trim().toLowerCase() === promoTitle)
        );
        const isAlreadyInExtra = extraPromoProducts.some(
          (p) =>
            (p?.id && String(p.id).toLowerCase() === promoId) ||
            (p?.name && promoTitle && String(p.name).trim().toLowerCase() === promoTitle)
        );
        if (!exists && !isAlreadyInExtra) {
          const isSeasonal = safeSeasonalPromos.some((sp) => sp?.id === pr.id);
          extraPromoProducts.push({
            id: pr.id,
            name: pr.title || "Promosi Istimewa",
            category: isSeasonal ? "PROMOSI BERMUSIM" : "All Time Promo",
            price: pr.promoPrice || pr.originalPrice || 0,
            originalPrice: pr.originalPrice,
            promoPrice: pr.promoPrice,
            unit: pr.unit || "1 pek",
            description: pr.description || "Tawaran promosi istimewa daripada FrozenBergerak.",
            imageUrl: pr.imageUrl,
            cookedImageUrl: pr.imageUrl,
            isPopular: true,
            isNew: false,
            inStock: !String(pr.status || "").toLowerCase().includes("habis") && !String(pr.status || "").toLowerCase().includes("tidak"),
            halalCertified: true,
            storageInfo: "Simpan pada suhu sejuk beku (-18°C)."
          });
        }
      });

      return [...safeProducts, ...extraPromoProducts];
    } catch (e) {
      console.warn("Error calculating allMergedProducts:", e);
      return Array.isArray(products) ? products : [];
    }
  }, [products, promos, seasonalPromos]);

  // Derive accurate categories from merged products so counts & filters stay synced
  const catalogCategories = useMemo(() => {
    if (allMergedProducts.length > 0) {
      return buildCategoriesFromProducts(allMergedProducts);
    }
    return categories;
  }, [allMergedProducts, categories]);

  // Filtered products calculation for Catalog
  const filteredProducts = useMemo(() => {
    try {
      const safeMerged = Array.isArray(allMergedProducts) ? allMergedProducts : [];
      const safePromos = Array.isArray(promos) ? promos : [];
      const safeSeasonal = Array.isArray(seasonalPromos) ? seasonalPromos : [];
      const normalizedActiveCat = String(activeCategoryId || "all").replace(/\s+/g, " ").trim().toLowerCase();
      const queryTokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

      return safeMerged.filter((item) => {
        if (!item) return false;
        const itemName = String(item?.name || "").toLowerCase();
        const itemCategory = String(item?.category || "").replace(/\s+/g, " ").trim().toLowerCase();
        const itemId = String(item?.id || "").toLowerCase();

        // Promo filter (All Time Promo or Seasonal Promo)
        if (activePromoFilter === "alltime") {
          const isAllTimeCategory = itemCategory.includes("all time promo") || itemCategory.includes("alltimepromo");
          const isDisc = Boolean(
            (item.promoPrice && item.originalPrice && item.promoPrice < item.originalPrice) ||
            (item.promoPrice && item.promoPrice > 0)
          );
          const matchesPromoTab = safePromos.some(
            (pr) => {
              const prTitle = String(pr?.title || "").trim().toLowerCase();
              const prId = String(pr?.id || "").toLowerCase();
              return (
                prTitle === itemName ||
                prId === itemId ||
                (prTitle && itemName.includes(prTitle)) ||
                (itemName && prTitle.includes(itemName))
              );
            }
          );
          if (!isAllTimeCategory && !isDisc && !matchesPromoTab && !item.isPopular) {
            return false;
          }
        }

        if (activePromoFilter === "seasonal") {
          const matchesSeasonalPromoTab = safeSeasonal.some(
            (sp) => {
              const spTitle = String(sp?.title || "").trim().toLowerCase();
              const spId = String(sp?.id || "").toLowerCase();
              return (
                spTitle === itemName ||
                spId === itemId ||
                (spTitle && itemName.includes(spTitle)) ||
                (itemName && spTitle.includes(itemName))
              );
            }
          );
          const isSeasonalCategory = itemCategory.includes("seasonal") || itemCategory.includes("musiman");

          if (!matchesSeasonalPromoTab && !isSeasonalCategory) {
            return false;
          }
        }

        // Category filter (normalized case-insensitive & trimmed)
        if (normalizedActiveCat !== "all" && itemCategory !== normalizedActiveCat) {
          return false;
        }

        // Popular filter
        if (showPopularOnly && !item.isPopular && !(item.promoPrice && item.originalPrice && item.promoPrice < item.originalPrice)) {
          return false;
        }

        // Multi-word token search across name, category, description, and ID
        if (queryTokens.length > 0) {
          const haystack = `${itemName} ${itemCategory} ${String(item.description || "").toLowerCase()} ${itemId}`;
          const allTokensMatch = queryTokens.every((token) => haystack.includes(token));
          if (!allTokensMatch) {
            return false;
          }
        }

        return true;
      });
    } catch (e) {
      console.warn("Error calculating filteredProducts:", e);
      return [];
    }
  }, [allMergedProducts, promos, seasonalPromos, activePromoFilter, activeCategoryId, showPopularOnly, searchQuery]);

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
    if (!product || !product.id) return;
    const prodId = product.id;
    setCart((prevCart) => {
      const safeCart = Array.isArray(prevCart) ? prevCart : [];
      const existingIndex = safeCart.findIndex((i) => i?.product?.id === prodId);
      if (existingIndex > -1) {
        const updated = [...safeCart];
        updated[existingIndex].quantity = (Number(updated[existingIndex].quantity) || 0) + quantityToAdd;
        return updated;
      } else {
        return [...safeCart, { product, quantity: quantityToAdd }];
      }
    });
    showToast(`✓ ${product.name || "Produk"} dimasukkan ke senarai pesanan!`);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) => {
      const safeCart = Array.isArray(prev) ? prev : [];
      return safeCart.map((item) =>
        item?.product?.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const safeCart = Array.isArray(prev) ? prev : [];
      return safeCart.filter((item) => item?.product?.id !== productId);
    });
    showToast("Produk dikeluarkan dari senarai pesanan.");
  };

  const handleClearCart = () => {
    setCart([]);
    showToast("Senarai pesanan dikosongkan.");
  };

  const totalCartCount = useMemo(
    () => (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0),
    [cart]
  );

  const totalCartValue = useMemo(
    () => (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1), 0),
    [cart]
  );

  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50/40 via-slate-50 to-blue-50/30 font-sans text-slate-800 selection:bg-blue-500 selection:text-white pb-20 sm:pb-16 overflow-x-clip">
      
      {/* Sticky Top Wrapper: PWA Install Banner + Offline Notice + Top Navbar */}
      <div className="sticky top-0 z-40 w-full">
        {/* PWA Install Banner */}
        <InstallPwaBanner
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          isIOS={isIOS}
          onInstall={handleRequestInstall}
          guideMode={installGuideMode}
          onCloseGuide={() => setInstallGuideMode(null)}
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
          isInstalled={isInstalled}
          onInstall={() => {
            void handleRequestInstall();
          }}
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
      </div>

      {/* VIEW 1: UTAMA / HALAMAN UTAMA (Hero, All Time Promo, Seasonal Promo) */}
      {activeView === "home" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <HomeDashboard
            products={allMergedProducts}
            categories={categories}
            promos={promos}
            seasonalPromos={seasonalPromos}
            storeConfig={storeConfig}
            isLoading={loading}
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
            isInstalled={isInstalled}
            onInstallApp={() => {
              void handleRequestInstall();
            }}
          />
        </div>
      )}

      {/* VIEW 2: KATALOG (Semua Kategori, All Time Promo & Seasonal Promo filters) */}
      {activeView === "catalog" && (
        <>
          {/* Mobile Category & Promo Filter Strip */}
          {catalogCategories.length > 0 && (
            <CategoryBar
              categories={catalogCategories}
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
            {catalogCategories.length > 0 && !error && (
              <Sidebar
                categories={catalogCategories}
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
                        ? "Tawaran istimewa yang sentiasa tersedia untuk anda. Nikmati pilihan promosi menarik daripada FrozenBergerak."
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
                      title="Segarkan semula katalog produk"
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

              {/* Catalog Search Bar & Quick Category Chips (Mobile + Desktop) */}
              {!error && (
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="catalog-search-input"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari produk sejuk beku (cth: pau, karipap, dim sum, kambing)..."
                      aria-label="Cari produk dalam katalog"
                      className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Padam ×
                      </button>
                    )}
                  </div>

                  {/* Quick Category Filter Pills (Desktop + Mobile shortcut) */}
                  {catalogCategories.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                        Tapis:
                      </span>
                      {catalogCategories.slice(0, 8).map((cat) => {
                        const isCatActive = activeCategoryId === cat.id && !showPopularOnly && !activePromoFilter;
                        return (
                          <button
                            key={`quick-cat-${cat.id}`}
                            type="button"
                            onClick={() => {
                              if (showPopularOnly) setShowPopularOnly(false);
                              if (activePromoFilter) setActivePromoFilter(null);
                              setActiveCategoryId(cat.id);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                              isCatActive
                                ? "bg-blue-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-24 text-center space-y-4">
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">
                    Memuatkan produk terkini FrozenBergerak...
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
                        Gagal Memuatkan Katalog Produk
                      </h3>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {error}
                      </p>
                    </div>
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
                      ? `Tiada makanan beku yang sepadan dengan carian "${searchQuery}"${activeCategoryId !== "all" ? ` dalam kategori ${activeCategoryId}` : ""}.`
                      : "Tiada produk dalam kategori atau tapisan yang dipilih pada masa ini."}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {searchQuery && (activeCategoryId !== "all" || activePromoFilter || showPopularOnly) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategoryId("all");
                          setActivePromoFilter(null);
                          setShowPopularOnly(false);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        Cari &quot;{searchQuery}&quot; Dalam Semua Kategori
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategoryId("all");
                        setActivePromoFilter(null);
                        setShowPopularOnly(false);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Tunjukkan Semua Produk
                    </button>
                  </div>
                </div>
              )}

              {/* Product Grid */}
              {!loading && !error && filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(filteredProducts || []).map((product) => {
                    if (!product) return null;
                    const cartItem = (Array.isArray(cart) ? cart : []).find((i) => i?.product?.id === product?.id);
                    return (
                      <ProductCard
                        key={product?.id || Math.random().toString()}
                        product={product}
                        whatsappNumber={whatsappNumber}
                        onViewDetails={(p) => setSelectedProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        isInCart={Boolean(cartItem)}
                        cartQuantity={cartItem ? (Number(cartItem?.quantity) || 0) : 0}
                      />
                    );
                  })}
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
          refreshPendingApprovals();
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
