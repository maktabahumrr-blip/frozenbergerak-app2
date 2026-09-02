import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import defaultHeroBanner from "../assets/images/hero_food_collage_1787666504223.jpg";
import { 
  Flame, 
  ShoppingBag, 
  ShoppingCart,
  Phone, 
  Sparkles, 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  ChevronRight, 
  Gift, 
  FileSpreadsheet,
  Sun,
  Star,
  CheckCircle2,
  CalendarDays,
  Grid,
  Camera,
  Upload,
  RotateCcw,
  Check,
  Lock,
  UserCheck
} from "lucide-react";
import { Product, Category, StoreConfig, PromoItem } from "../types";
import { formatCurrency } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";
import { auth, onAuthStateChanged } from "../lib/firebase";

interface HomeDashboardProps {
  products: Product[];
  categories: Category[];
  promos?: PromoItem[];
  seasonalPromos?: PromoItem[];
  storeConfig: StoreConfig | null;
  onNavigateToCatalog: (categoryId?: string, promoType?: "alltime" | "seasonal" | "popular" | boolean) => void;
  onNavigateToSchedule?: () => void;
  onNavigateView?: (view: "home" | "catalog" | "schedule" | "loyalty" | "feedback") => void;
  onViewProductDetails: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onOpenFeedback?: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  products,
  categories,
  promos = [],
  seasonalPromos = [],
  storeConfig,
  onNavigateToCatalog,
  onNavigateToSchedule,
  onNavigateView,
  onViewProductDetails,
  onAddToCart,
  onOpenFeedback,
}) => {
  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customBanner, setCustomBanner] = useState<string | null>(null);
  const [liveBannerUrl, setLiveBannerUrl] = useState<string>(() => {
    return storeConfig?.heroBannerUrl || "/api/hero-banner";
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("");

  // Keep live banner URL updated whenever storeConfig changes
  useEffect(() => {
    if (storeConfig?.heroBannerUrl) {
      setLiveBannerUrl(storeConfig.heroBannerUrl);
    }
  }, [storeConfig?.heroBannerUrl]);

  // Listen to banner update events across the app
  useEffect(() => {
    const handleBannerUpdate = (e: any) => {
      if (e.detail?.url) {
        setLiveBannerUrl(e.detail.url);
      }
    };
    window.addEventListener("frozen_banner_updated" as any, handleBannerUpdate);
    return () => {
      window.removeEventListener("frozen_banner_updated" as any, handleBannerUpdate);
    };
  }, []);

  // Check admin session for maktabahumrr@gmail.com
  useEffect(() => {
    // 1. Instant check from localStorage
    try {
      const storedUser = localStorage.getItem("fb_auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role === "admin") {
          setIsAdmin(true);
          setAdminEmail(parsed.email || "maktabahumrr@gmail.com");
        }
      }
    } catch {}

    // 2. Direct Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const isPrimaryAdmin = fbUser.email.toLowerCase() === "maktabahumrr@gmail.com";
        if (isPrimaryAdmin) {
          setIsAdmin(true);
          setAdminEmail(fbUser.email);
          return;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleBannerFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCustomBanner(dataUrl);
      setIsUploading(true);

      try {
        const token = localStorage.getItem("fb_auth_token") || "";
        const res = await fetch("/api/upload-banner", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ imageBase64: dataUrl })
        });
        
        const data = await res.json();
        if (res.ok && data.url) {
          setLiveBannerUrl(data.url);
          setCustomBanner(null);
          // Broadcast update so all open tabs/views update instantly
          window.dispatchEvent(new CustomEvent("frozen_banner_updated", { detail: { url: data.url } }));
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          alert(data.error || "Gagal memuat naik gambar banner.");
          setCustomBanner(null);
        }
      } catch (err) {
        console.error("Gagal muat naik ke server:", err);
        setCustomBanner(null);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetBanner = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("fb_auth_token") || "";
      const res = await fetch("/api/reset-banner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCustomBanner(null);
      const resetUrl = data.url || "/api/hero-banner?t=" + Date.now();
      setLiveBannerUrl(resetUrl);
      window.dispatchEvent(new CustomEvent("frozen_banner_updated", { detail: { url: resetUrl } }));
    } catch {
      setCustomBanner(null);
      setLiveBannerUrl("/api/hero-banner?t=" + Date.now());
    }
  };

  // Active promos from Alltimepromo tab or fallback to promo products in sheets
  const activeAllTimePromos = useMemo(() => {
    try {
      if (promos && promos.length > 0) {
        return promos;
      }
      const safeProducts = Array.isArray(products) ? products : [];
      // Fallback: Use products that have promoPrice or originalPrice in the main sheet
      return safeProducts
        .filter((p) => Boolean((p?.promoPrice && p?.originalPrice && p.promoPrice < p.originalPrice) || (p?.promoPrice && p.promoPrice > 0)))
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
              cookedImageUrl: sp?.imageUrl || found.cookedImageUrl
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
            storageInfo: "Simpan pada suhu sejuk beku (-18°C)."
          };
        });
      }

      // Check if any product in main sheet is explicitly categorized as Seasonal
      return safeProducts.filter((p) => {
        const catLower = String(p?.category || "").toLowerCase();
        return catLower.includes("seasonal") || catLower.includes("musiman");
      });
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
      className="w-full space-y-6 sm:space-y-8 pb-8 max-w-7xl mx-auto"
    >
      
      {/* ============================================================ */}
      {/* 1. HERO BANNER IMAGE (Full-width, pure responsive safe-zone) */}
      {/* ============================================================ */}
      <motion.section 
        variants={itemVariants}
        id="section-hero-image-banner"
        className="w-full space-y-2"
      >
        {/* Hidden File Input for Admin only */}
        {isAdmin && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerFileSelected}
          />
        )}

        {/* Admin-Only Upload Action Toolbar */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-950">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Panel Admin: Kemaskini Hero Banner {adminEmail ? `(${adminEmail})` : ""}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {isUploading ? (
                  <span>Sedang Memproses...</span>
                ) : uploadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Gambar Berjaya Dimuat Naik!</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Muat Naik Gambar Asal</span>
                  </>
                )}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetBanner}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  title="Kembalikan ke gambar asal lalai"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Set Semula Banner</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero Image Container */}
        <div 
          onClick={() => {
            if (isAdmin) {
              fileInputRef.current?.click();
            }
          }}
          className={`w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] lg:aspect-[2.5/1] relative flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-md border border-slate-200/90 bg-slate-100 ${isAdmin ? "cursor-pointer group" : ""}`}
          title={isAdmin ? "Klik untuk menukar gambar banner" : "FrozenBergerak Banner"}
        >
          <img
            src={customBanner || liveBannerUrl || storeConfig?.heroBannerUrl || defaultHeroBanner}
            alt="FrozenBergerak Banner"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-center select-none"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== defaultHeroBanner) {
                target.src = defaultHeroBanner;
              }
            }}
          />

          {/* Admin Floating Indicator */}
          {isAdmin && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg text-white text-xs font-medium">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>Klik gambar untuk muat naik (Admin)</span>
            </div>
          )}
        </div>
      </motion.section>


      {/* ============================================================ */}
      {/* 2. 🔥 ALL TIME PROMO SECTION */}
      {/* ============================================================ */}
      <motion.section 
        variants={itemVariants}
        id="section-all-time-promo" 
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                <Flame className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                🔥 All Time Promo
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tawaran istimewa berterusan terus daripada tab Alltimepromo Google Sheets.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToCatalog("all", "alltime")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto hover:underline cursor-pointer"
          >
            <span>Lihat Produk Promo Dalam Katalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Promo Grid from Alltimepromo Google Sheet */}
        {activeAllTimePromos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeAllTimePromos.map((promo) => {
              const hasDiscount = Boolean(
                promo.originalPrice && promo.promoPrice && promo.originalPrice > promo.promoPrice
              );
              const discountPercent = hasDiscount
                ? Math.round(((promo.originalPrice! - promo.promoPrice!) / promo.originalPrice!) * 100)
                : null;
              const savings = hasDiscount ? promo.originalPrice! - promo.promoPrice! : null;

              // Generate WhatsApp link for this specific promo
              const promoPriceText = promo.promoPrice ? formatCurrency(promo.promoPrice) : (promo.originalPrice ? formatCurrency(promo.originalPrice) : "");
              const waText = encodeURIComponent(
                `Halo FrozenBergerak! Saya ingin membuat pesanan untuk promo:\n\n🔥 *${promo.title}*\n💰 Harga Promo: ${promoPriceText}${promo.originalPrice && promo.promoPrice ? ` (Harga Asal: ${formatCurrency(promo.originalPrice)})` : ""}\n📦 Unit: ${promo.unit || "1 pek"}\n\nBoleh saya tahu cara tempahan & penghantaran?`
              );
              const waLink = `https://wa.me/${cleanNumber}?text=${waText}`;

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
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group hover:border-blue-300"
                >
                  {/* Gambar Promo with Click to View Modal */}
                  <div 
                    onClick={() => onViewProductDetails(matchingProduct)}
                    className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={formatImageUrl(promo.imageUrl, "promo", promo.title)}
                      alt={promo.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage("promo", promo.title);
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
                      {/* Penerangan */}
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed whitespace-pre-line">
                        {promo.description || "Promosi makanan sejuk beku istimewa berkualiti tinggi dari FrozenBergerak."}
                      </p>
                    </div>

                    {/* Harga & Tindakan */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
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

                        {/* Butang Tambah ke Troli */}
                        <button
                          type="button"
                          onClick={() => onAddToCart(matchingProduct, 1)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>+ Troli</span>
                        </button>
                      </div>

                      {/* Baris Butang WhatsApp & Perincian */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onViewProductDetails(matchingProduct)}
                          className="text-xs text-slate-700 hover:text-blue-600 font-semibold py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Perincian</span>
                        </button>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-1.5 px-2 rounded-lg shadow-xs transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
      {/* 3. ✨ SEASONAL PROMO SECTION (Promosi Musiman & Istimewa) */}
      {/* ============================================================ */}
      <motion.section 
        variants={itemVariants}
        id="section-seasonal-promo" 
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                <Sun className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ✨ PROMOSI BERMUSIM
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pilihan hidangan istimewa musim perayaan, cuti sekolah &amp; hidangan mudah seisi keluarga.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToCatalog("all", "seasonal")}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto hover:underline cursor-pointer"
          >
            <span>Terokai Promosi Bermusim Dalam Katalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Seasonal Promo Highlight Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-0.5 rounded-full text-xs font-bold text-amber-100">
              <Star className="w-3.5 h-3.5 text-amber-300" />
              <span>Edisi Khas Musim Ini</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pakej Jimat &amp; Hidangan Lazat
            </h3>
            <p className="text-xs sm:text-sm text-amber-50 max-w-xl leading-relaxed">
              Dapatkan stok makanan beku berkualiti seperti kambing perap, rendang daging, dimsum &amp; kudapan mudah saji terus ke pintu rumah anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToCatalog("all", "seasonal")}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <span>Buka Koleksi Promosi Bermusim</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Seasonal Promo Products Grid or Empty Notice */}
        {displaySeasonalItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-amber-200/80 p-6 sm:p-8 text-center shadow-xs space-y-4">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100 shadow-xs">
              <Sun className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Promosi Bermusim Akan Datang
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Tiada produk promosi bermusim dalam Google Sheet buat masa ini. Anda boleh menyemak tawaran promosi berterusan di tab <strong>All Time Promo</strong> atau terokai katalog penuh kami.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigateToCatalog("all", "alltime")}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Lihat All Time Promo</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToCatalog("all")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Buka Katalog Penuh</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {displaySeasonalItems?.map((product) => {
              if (!product) return null;
              const hasPromoPrice = Boolean(
                product?.promoPrice && product?.originalPrice && product.promoPrice < product.originalPrice
              );

              return (
                <div
                  key={`seasonal-${product?.id || Math.random()}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={formatImageUrl(product?.imageUrl, product?.category, product?.name)}
                      alt={product?.name || "Produk Musim"}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackImage(product?.category, product?.name);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Pilihan Musim
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">
                        {product?.category || "Promosi"}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {product?.name || "Produk"}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {product?.description || "Kualiti terbaik sedia dimasak untuk hidangan keluarga."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {hasPromoPrice ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-extrabold text-rose-600">
                              {formatCurrency(product?.promoPrice)}
                            </span>
                            <span className="text-[11px] text-slate-400 line-through">
                              {formatCurrency(product?.originalPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-extrabold text-slate-900">
                            {formatCurrency(product?.price)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 block -mt-0.5">
                          {product?.unit || "1 pek"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewProductDetails(product)}
                          className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddToCart(product, 1)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                          title="Tambah ke Pesanan"
                        >
                          + Pesan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

    </motion.div>
  );
};
