import React, { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { 
  Flame, 
  ShoppingCart,
  Tag, 
  ChevronRight,
  ChevronLeft,
  Gift, 
  Sun,
  CalendarDays,
  CalendarPlus,
  Grid
} from "lucide-react";
import { Product, Category, StoreConfig, PromoItem, BannerItem } from "../types";
import { formatCurrency } from "../utils/formatters";
import { formatImageUrl, handleOptimizedImageError } from "../utils/googleDrive";

interface HomeDashboardProps {
  products: Product[];
  categories: Category[];
  promos?: PromoItem[];
  seasonalPromos?: PromoItem[];
  banners?: BannerItem[];
  stampCount?: number;
  storeConfig: StoreConfig | null;
  isLoading?: boolean;
  onNavigateToCatalog: (categoryId?: string, promoType?: "alltime" | "seasonal" | "popular" | boolean) => void;
  onNavigateToSchedule?: () => void;
  onOpenSlotBooking?: () => void;
  onNavigateView?: (view: "home" | "catalog" | "schedule" | "loyalty" | "feedback") => void;
  onViewProductDetails: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onOpenFeedback?: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
  teamMemberName?: string | null;
  teamMemberRole?: "admin" | "team" | null;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  products,
  categories: _categories,
  promos = [],
  seasonalPromos = [],
  banners = [],
  stampCount = 3,
  storeConfig: _storeConfig,
  isLoading = false,
  onNavigateToCatalog,
  onNavigateToSchedule,
  onOpenSlotBooking,
  onNavigateView,
  onViewProductDetails,
  onAddToCart,
  teamMemberName = null,
  teamMemberRole = null,
}) => {
  const allTimeCarouselRef = useRef<HTMLDivElement | null>(null);
  const seasonalCarouselRef = useRef<HTMLDivElement | null>(null);
  const bannerCarouselRef = useRef<HTMLDivElement | null>(null);
  const [failedBannerIds, setFailedBannerIds] = useState<Record<string, boolean>>({});

  const displayStampCount = Math.max(0, Math.min(10, Number.isFinite(stampCount) ? stampCount : 3));

  const visibleBanners = useMemo(() => {
    if (!Array.isArray(banners)) return [];
    return banners.filter(
      (b) =>
        b &&
        b.imageUrl &&
        String(b.status || "").trim().toUpperCase() === "AKTIF" &&
        !failedBannerIds[b.id]
    );
  }, [banners, failedBannerIds]);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const distance = direction === "left" ? -310 : 310;
    ref.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  // Active promos from Alltimepromo tab or fallback to promo products
  const activeAllTimePromos = useMemo(() => {
    try {
      if (Array.isArray(promos) && promos.length > 0) {
        return promos.filter((p) => p && String(p.title || "").trim().length > 0);
      }
      const safeProducts = Array.isArray(products) ? products : [];
      // Fallback: Use products categorized as All Time Promo or products with promoPrice
      return safeProducts
        .filter((p) => {
          if (!p) return false;
          const catLower = String(p.category || "").toLowerCase();
          const isAllTimeCat = catLower.includes("all time promo") || catLower.includes("alltimepromo");
          const hasPromoPrice = Boolean(
            (p.promoPrice && p.originalPrice && p.promoPrice < p.originalPrice) ||
            (p.promoPrice && p.promoPrice > 0)
          );
          return isAllTimeCat || hasPromoPrice;
        })
        .map((p) => ({
          id: p?.id || `PROMO-${Math.random()}`,
          title: p?.name || "Promosi",
          description: p?.description || "",
          imageUrl: p?.cookedImageUrl || p?.imageUrl || p?.packagingImageUrl,
          originalPrice: p?.originalPrice,
          promoPrice: p?.promoPrice || p?.price || 0,
          status: p?.inStock ? "Aktif" : "Habis",
          unit: p?.unit || "1 pek"
        }));
    } catch (e) {
      console.warn("Error calculating activeAllTimePromos:", e);
      return [];
    }
  }, [promos, products]);

  // Curate seasonal promo items strictly from Seasonalpromo Google Sheet tab or products with Seasonal category
  const displaySeasonalItems = useMemo(() => {
    try {
      const safeProducts = Array.isArray(products) ? products : [];

      if (seasonalPromos && seasonalPromos.length > 0) {
        return seasonalPromos.map((sp) => {
          const spId = String(sp?.id || "").toLowerCase();
          const spTitle = String(sp?.title || "").trim().toLowerCase();

          const found = safeProducts.find(
            (p) =>
              (p?.id && spId && String(p.id).toLowerCase() === spId) ||
              (p?.name && spTitle && String(p.name).trim().toLowerCase() === spTitle)
          );
          if (found) {
            return {
              ...found,
              originalPrice: sp?.originalPrice || found.originalPrice,
              promoPrice: sp?.promoPrice || found.promoPrice || found.price,
              price: sp?.promoPrice || found.promoPrice || found.price,
              description: sp?.description || found.description,
              imageUrl: sp?.imageUrl || found.imageUrl,
              cookedImageUrl: sp?.imageUrl || found.cookedImageUrl,
              hidePrice: true
            };
          }
          return {
            id: sp?.id || `SEA-${Math.random()}`,
            name: sp?.title || "Promosi Bermusim",
            category: "PROMOSI BERMUSIM",
            price: sp?.promoPrice || sp?.originalPrice || 0,
            originalPrice: sp?.originalPrice,
            promoPrice: sp?.promoPrice,
            unit: sp?.unit || "1 pek",
            description: sp?.description || "Promosi musiman istimewa FrozenBergerak.",
            imageUrl: sp?.imageUrl,
            cookedImageUrl: sp?.imageUrl,
            isPopular: true,
            isNew: false,
            inStock: !String(sp?.status || "").toLowerCase().includes("habis") && !String(sp?.status || "").toLowerCase().includes("tidak"),
            halalCertified: true,
            storageInfo: "Simpan pada suhu sejuk beku (-18°C).",
            hidePrice: true
          };
        });
      }

      // Check if any product in main sheet is explicitly categorized as Seasonal
      return safeProducts
        .filter((p) => {
          const catLower = String(p?.category || "").toLowerCase();
          return catLower.includes("seasonal") || catLower.includes("musiman");
        })
        .map((p) => ({ ...p, hidePrice: true }));
    } catch (e) {
      console.warn("Error calculating displaySeasonalItems:", e);
      return [];
    }
  }, [seasonalPromos, products]);

  const containerVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as const,
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <motion.div 
      id="home-dashboard" 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-5 sm:space-y-6 pb-4 max-w-7xl mx-auto"
    >
      {/* ============================================================ */}
      {/* 0A. 🎁 BAR SAPAAN PASUKAN / KAPSUL LOYALTI + 2 KAD TINDAKAN  */}
      {/* ============================================================ */}
      <motion.section variants={itemVariants} className="space-y-3">
        {teamMemberName ? (
          <div
            id="home-team-greeting-bar"
            className="w-full py-1 px-0.5 flex items-center gap-3"
          >
            {/* Emoji Perempuan Bertudung (Hijab) di dalam bulatan lembut */}
            <div
              className={`w-11 h-11 p-2 rounded-full flex items-center justify-center shrink-0 text-2xl leading-none select-none ${
                teamMemberRole === "admin"
                  ? "bg-amber-50"
                  : "bg-blue-50"
              }`}
              aria-hidden="true"
            >
              🧕
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-greeting text-sm sm:text-base font-semibold text-slate-800 leading-snug">
                Semoga murah rezeki,{" "}
                <span className="font-greeting-name text-blue-700 font-semibold italic">
                  {teamMemberName}
                </span>
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide shrink-0 ${
                  teamMemberRole === "admin"
                    ? "bg-amber-500 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {teamMemberRole === "admin" ? "Admin" : "Pasukan"}
              </span>
            </div>
          </div>
        ) : (
          /* Kapsul Ringkas Stamp Loyalti (Pelanggan Biasa) */
          <button
            id="home-loyalty-capsule"
            type="button"
            onClick={() => onNavigateView?.("loyalty")}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3 transition-all active:scale-99 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    Stamp Loyalti
                  </span>
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md tabular-nums shrink-0">
                    Setem: {displayStampCount} / 10
                  </span>
                </div>
                <div className="w-28 sm:w-40 h-1.5 bg-amber-200/80 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(displayStampCount / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-800 shrink-0">
              <span>Tebus</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {/* 2 Kad Tindakan Utama Bersebelahan */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <button
            id="home-btn-jadual-keberadaan"
            type="button"
            onClick={() => {
              if (onNavigateToSchedule) {
                onNavigateToSchedule();
              } else if (onNavigateView) {
                onNavigateView("schedule");
              }
            }}
            className="p-3 sm:p-4 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200/90 hover:border-blue-300 shadow-xs text-left flex items-center gap-2.5 sm:gap-3 transition-all active:scale-98 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                Jadual Pasukan
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Semak laluan hari ini
              </div>
            </div>
          </button>

          <button
            id="home-btn-tempah-slot"
            type="button"
            onClick={() => {
              if (onOpenSlotBooking) {
                onOpenSlotBooking();
              } else if (onNavigateToSchedule) {
                onNavigateToSchedule();
              }
            }}
            className="p-3 sm:p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 shadow-xs text-left flex items-center gap-2.5 sm:gap-3 transition-all active:scale-98 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <CalendarPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] sm:text-base font-extrabold text-white leading-tight truncate">
                Tempah Slot
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-100 mt-0.5 truncate">
                Pilih tarikh &amp; kawasan
              </div>
            </div>
          </button>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/* 0B. 🖼️ BANNER PROMO DINAMIK DARI GOOGLE SHEET ("Banner")     */}
      {/* ============================================================ */}
      {visibleBanners.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          id="section-dynamic-banners"
          aria-label="Banner Promosi"
          className="min-w-0 w-full"
        >
          {visibleBanners.length === 1 ? (
            <div className="min-w-0 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs">
              <img
                src={visibleBanners[0].imageUrl}
                alt={visibleBanners[0].name}
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
                onError={() => {
                  setFailedBannerIds((prev) => ({ ...prev, [visibleBanners[0].id]: true }));
                }}
                className="w-full h-auto object-contain rounded-xl block"
              />
            </div>
          ) : (
            <div
              ref={bannerCarouselRef}
              className="min-w-0 w-full flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
            >
              {visibleBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="min-w-0 w-full sm:w-[76%] lg:w-[64%] shrink-0 snap-center rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs"
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      setFailedBannerIds((prev) => ({ ...prev, [banner.id]: true }));
                    }}
                    className="w-full h-auto object-contain rounded-xl block"
                  />
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* ============================================================ */}
      {/* 1. 🔥 ALL TIME PROMO SECTION (HORIZONTAL SLIDING CAROUSEL)  */}
      {/* ============================================================ */}
      <motion.section 
        variants={itemVariants}
        id="section-all-time-promo" 
        className="space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0">
              <Flame className="w-4 h-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              All Time Promo
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAllTimePromos.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => scrollCarousel(allTimeCarouselRef, "left")}
                  aria-label="Skrol All Time Promo ke kiri"
                  className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel(allTimeCarouselRef, "right")}
                  aria-label="Skrol All Time Promo ke kanan"
                  className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigateToCatalog("all", "alltime")}
              className="text-xs sm:text-[13px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 hover:underline cursor-pointer py-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Sliding Carousel */}
        {activeAllTimePromos.length > 0 ? (
          <div
            ref={allTimeCarouselRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 scroll-smooth"
          >
            {activeAllTimePromos.map((promo) => {
              const hasDiscount = Boolean(
                promo.originalPrice && promo.promoPrice && promo.originalPrice > promo.promoPrice
              );
              const discountPercent = hasDiscount
                ? Math.round(((promo.originalPrice! - promo.promoPrice!) / promo.originalPrice!) * 100)
                : null;
              const savings = hasDiscount ? promo.originalPrice! - promo.promoPrice! : null;

              // Check if promo matches any product in the catalog or create a valid product representation
              const matchingProduct: Product = (() => {
                const pList = Array.isArray(products) ? products : [];
                const promoIdLower = String(promo?.id || "").toLowerCase();
                const promoTitleLower = String(promo?.title || "").trim().toLowerCase();

                const byId = pList.find((p) => p?.id && promoIdLower && String(p.id).toLowerCase() === promoIdLower);
                if (byId) {
                  return {
                    ...byId,
                    price: promo?.promoPrice || byId.promoPrice || byId.price,
                    originalPrice: promo?.originalPrice || byId.originalPrice || byId.price,
                    promoPrice: promo?.promoPrice || byId.promoPrice
                  };
                }

                const byName = pList.find((p) => p?.name && promoTitleLower && String(p.name).trim().toLowerCase() === promoTitleLower);
                if (byName) {
                  return {
                    ...byName,
                    price: promo?.promoPrice || byName.promoPrice || byName.price,
                    originalPrice: promo?.originalPrice || byName.originalPrice || byName.price,
                    promoPrice: promo?.promoPrice || byName.promoPrice
                  };
                }

                const byPartial = pList.find((p) => {
                  const pNameLower = String(p?.name || "").trim().toLowerCase();
                  return pNameLower && promoTitleLower && (pNameLower.includes(promoTitleLower) || promoTitleLower.includes(pNameLower));
                });
                if (byPartial) {
                  return {
                    ...byPartial,
                    price: promo?.promoPrice || byPartial.promoPrice || byPartial.price,
                    originalPrice: promo?.originalPrice || byPartial.originalPrice || byPartial.price,
                    promoPrice: promo?.promoPrice || byPartial.promoPrice
                  };
                }

                return {
                  id: promo?.id || `PROMO-${Math.random()}`,
                  name: promo?.title || "Promosi",
                  category: "All Time Promo",
                  price: promo?.promoPrice || promo?.originalPrice || 0,
                  originalPrice: promo?.originalPrice,
                  promoPrice: promo?.promoPrice,
                  unit: promo?.unit || "1 pek",
                  description: promo?.description || "Promosi makanan sejuk beku istimewa berkualiti tinggi dari FrozenBergerak.",
                  imageUrl: promo?.imageUrl,
                  cookedImageUrl: promo?.imageUrl,
                  packagingImageUrl: undefined,
                  isPopular: true,
                  isNew: false,
                  inStock: !String(promo?.status || "").toLowerCase().includes("habis") && !String(promo?.status || "").toLowerCase().includes("tidak"),
                  halalCertified: true,
                  storageInfo: "Simpan pada suhu sejuk beku (-18°C)."
                };
              })();

              return (
                <div
                  key={`promo-item-${promo.id}`}
                  className="w-[272px] sm:w-[300px] lg:w-[320px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group hover:border-blue-300"
                >
                  {/* Gambar Promo with Click to View Modal */}
                  <div 
                    onClick={() => onViewProductDetails(matchingProduct)}
                    className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={formatImageUrl(promo.imageUrl, "promo", promo.title, "card")}
                      alt={promo.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        handleOptimizedImageError(e.currentTarget, "promo", promo.title, "card");
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Promo Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      {discountPercent ? (
                        <span className="bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Jimat {discountPercent}% {savings ? `(RM ${savings.toFixed(2)})` : ""}
                        </span>
                      ) : (
                        <span className="bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Tawaran Hebat
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-2 right-2 bg-slate-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      🔥 All Time Promo
                    </span>
                  </div>

                  {/* Promo Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Tajuk Promo */}
                      <h3 
                        onClick={() => onViewProductDetails(matchingProduct)}
                        className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
                      >
                        {promo.title}
                      </h3>
                      {/* Penerangan (1 baris ringkas) */}
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                        {promo.description || "Promosi makanan sejuk beku berkualiti tinggi dari FrozenBergerak."}
                      </p>
                    </div>

                    {/* Harga & Tindakan */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          {hasDiscount ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-rose-600">
                                {formatCurrency(promo.promoPrice!)}
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                {formatCurrency(promo.originalPrice!)}
                              </span>
                            </div>
                          ) : promo.promoPrice ? (
                            <span className="text-lg font-black text-rose-600">
                              {formatCurrency(promo.promoPrice)}
                            </span>
                          ) : promo.originalPrice ? (
                            <span className="text-lg font-black text-slate-900">
                              {formatCurrency(promo.originalPrice)}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-700">
                              Harga Istimewa
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block -mt-0.5">
                            {promo.unit || "per pek"}
                          </span>
                        </div>
                      </div>

                      {/* Hanya Butang + Troli & Pesan Sekarang */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onAddToCart(matchingProduct, 1)}
                          className="w-full py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>+ Troli</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewProductDetails(matchingProduct)}
                          className="w-full py-2.5 px-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Pesan Sekarang</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={`promo-skeleton-${idx}`}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden animate-pulse"
              >
                <div className="aspect-4/3 bg-slate-200/80" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-5 bg-slate-200 rounded w-20" />
                    <div className="h-8 bg-slate-200 rounded-xl w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Flame className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">
              Promosi Sedang Dikemaskini
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Sila semak senarai penuh hidangan sejuk beku di katalog kami.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateToCatalog("all", "alltime")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <span>Lihat Produk Di Katalog</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.section>


      {/* ============================================================ */}
      {/* 2. ✨ SEASONAL PROMO SECTION (Tawaran Terhad) */}
      {/* ============================================================ */}
      <motion.section 
        variants={itemVariants}
        id="section-seasonal-promo" 
        className="space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Sun className="w-4 h-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              Tawaran Terhad
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {displaySeasonalItems.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => scrollCarousel(seasonalCarouselRef, "left")}
                  aria-label="Skrol Tawaran Terhad ke kiri"
                  className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel(seasonalCarouselRef, "right")}
                  aria-label="Skrol Tawaran Terhad ke kanan"
                  className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigateToCatalog("all", "seasonal")}
              className="text-xs sm:text-[13px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 hover:underline cursor-pointer py-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Sliding Carousel */}
        {displaySeasonalItems.length > 0 ? (
          <div
            ref={seasonalCarouselRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 scroll-smooth"
          >
            {displaySeasonalItems.map((product) => {
              if (!product) return null;

              return (
                <div
                  key={`seasonal-${product?.id || Math.random()}`}
                  className="w-[272px] sm:w-[300px] lg:w-[320px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group hover:border-blue-300"
                >
                  {/* Gambar Pakej with Click to View Modal */}
                  <div
                    onClick={() => onViewProductDetails(product)}
                    className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={formatImageUrl(product?.imageUrl, product?.category, product?.name, "card")}
                      alt={product?.name || "Produk Musim"}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        handleOptimizedImageError(e.currentTarget, product?.category, product?.name, "card");
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <span className="absolute bottom-2 right-2 bg-slate-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      ✨ Pilihan Musim
                    </span>
                  </div>

                  {/* Butiran Pakej (Tanpa Harga Tetap) */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">
                        {product?.category || "Promosi Bermusim"}
                      </span>
                      <h3
                        onClick={() => onViewProductDetails(product)}
                        className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
                      >
                        {product?.name || "Produk"}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                        {product?.description || "Kualiti terbaik sedia dimasak untuk hidangan keluarga."}
                      </p>
                    </div>

                    {/* Tindakan + Troli & Pesan Sekarang */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onAddToCart(product, 1)}
                          className="w-full py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Tambah ke Senarai Pesanan"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>+ Troli</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewProductDetails(product)}
                          className="w-full py-2.5 px-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Pesan Sekarang</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
              <Sun className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">
              Promosi Bermusim Akan Datang
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tiada produk promosi bermusim buat masa ini. Semak tawaran <strong>All Time Promo</strong> atau terokai katalog penuh kami.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToCatalog("all", "alltime")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Lihat All Time Promo</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToCatalog("all")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Buka Katalog Penuh</span>
              </button>
            </div>
          </div>
        )}
      </motion.section>

    </motion.div>
  );
};
