import React, { useState, useEffect } from "react";
import { X, MessageCircle, ShoppingBag, ShieldCheck, ThermometerSnowflake, Sparkles, Plus, Minus, Check, Tag, UtensilsCrossed, Package, Maximize2, CalendarDays, AlertCircle } from "lucide-react";
import { AgentContact, DeliveryArea, Product } from "../types";
import { formatCurrency, generateSingleProductWhatsAppUrl } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage, handleOptimizedImageError } from "../utils/googleDrive";
import { getLocalTodayIso } from "../utils/scheduleDateHelper";
import { ImageLightbox } from "./ImageLightbox";
import { FormattedDescription } from "./FormattedDescription";
import { AreaAgentSelector } from "./AreaAgentSelector";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  whatsappNumber: _whatsappNumber,
  onAddToCart,
}) => {
  const todayIso = getLocalTodayIso();
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const [activeImageType, setActiveImageType] = useState<"cooked" | "packaging">("cooked");
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  // Explicitly start null so Husna is NEVER selected by default
  const [selectedArea, setSelectedArea] = useState<DeliveryArea | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentContact | null>(null);
  const [plannedDate, setPlannedDate] = useState<string>(todayIso);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setJustAdded(false);
      setIsLightboxOpen(false);
      setSelectedArea(null);
      setSelectedAgent(null);
      setPlannedDate(getLocalTodayIso());
      // Default to cooked image if available, else packaging
      if (product?.cookedImageUrl) {
        setActiveImageType("cooked");
      } else if (product?.packagingImageUrl) {
        setActiveImageType("packaging");
      } else {
        setActiveImageType("cooked");
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const fallbackSrc = getCategoryFallbackImage(product.category, product.name, "medium");
  const cookedSrc = product.cookedImageUrl ? formatImageUrl(product.cookedImageUrl, product.category, product.name, "medium") : null;
  const packagingSrc = product.packagingImageUrl ? formatImageUrl(product.packagingImageUrl, product.category, product.name, "medium") : null;
  const cookedThumbSrc = product.cookedImageUrl ? formatImageUrl(product.cookedImageUrl, product.category, product.name, "thumb") : null;
  const packagingThumbSrc = product.packagingImageUrl ? formatImageUrl(product.packagingImageUrl, product.category, product.name, "thumb") : null;
  
  // Decide which image to show based on selected tab
  let displayedImage = product.imageUrl ? formatImageUrl(product.imageUrl, product.category, product.name, "medium") : fallbackSrc;
  if (activeImageType === "cooked" && cookedSrc) {
    displayedImage = cookedSrc;
  } else if (activeImageType === "packaging" && packagingSrc) {
    displayedImage = packagingSrc;
  } else if (cookedSrc) {
    displayedImage = cookedSrc;
  } else if (packagingSrc) {
    displayedImage = packagingSrc;
  }

  const hasBothImages = Boolean(product.cookedImageUrl && product.packagingImageUrl);

  const catLower = String(product?.category || "").toLowerCase();
  const isPriceHidden = Boolean(
    product?.hidePrice ||
    catLower.includes("promosi bermusim") ||
    catLower.includes("seasonal") ||
    catLower.includes("musiman")
  );
  const total = (Number(product?.price) || 0) * (Number(quantity) || 1);
  const canDirectWhatsApp = Boolean(selectedArea && selectedAgent && plannedDate);
  const whatsappUrl = canDirectWhatsApp && selectedAgent && selectedArea
    ? generateSingleProductWhatsAppUrl(
        product,
        quantity,
        selectedAgent.phone,
        { area: selectedArea.name, agentName: selectedAgent.name, plannedDate }
      )
    : "#";
  const hasPromo = Boolean(!isPriceHidden && product?.promoPrice && product?.originalPrice && product.promoPrice < product.originalPrice);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        id={`modal-product-${product?.id || "item"}`}
        className="relative bg-white w-full max-w-2xl rounded-3xl overflow-y-auto md:overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col md:flex-row border border-slate-200 overscroll-contain"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3.5 right-3.5 z-30 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-full p-2 shadow-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Column */}
        <div className="relative w-full md:w-1/2 bg-slate-100 flex flex-col justify-between min-h-[240px] md:min-h-[420px] shrink-0 p-3 sm:p-4">
          {/* Top Switcher Tabs (If both or either images are available) */}
          {hasBothImages ? (
            <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-slate-200/80 self-center z-10 mb-2">
              <button
                type="button"
                onClick={() => setActiveImageType("cooked")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeImageType === "cooked"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Siap Masak</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveImageType("packaging")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeImageType === "packaging"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Packaging</span>
              </button>
            </div>
          ) : (
            <div className="self-start z-10">
              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-xs text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-2xs border border-slate-200">
                {product?.cookedImageUrl ? (
                  <>
                    <UtensilsCrossed className="w-3 h-3 text-blue-600" />
                    <span>Gambar Siap Masak</span>
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 text-blue-600" />
                    <span>Gambar Packaging</span>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Main Active Image */}
          <div 
            onClick={() => setIsLightboxOpen(true)}
            className="group/img relative flex-1 w-full rounded-2xl overflow-hidden bg-slate-200/60 min-h-[180px] sm:min-h-[220px] shadow-inner cursor-zoom-in"
            title="Klik untuk lihat gambar saiz penuh"
          >
            <img
              key={displayedImage}
              src={displayedImage}
              alt={`${product?.name || "Produk"} - ${activeImageType === "cooked" ? "Siap Masak" : "Packaging"}`}
              referrerPolicy="no-referrer"
              decoding="async"
              onError={(e) => {
                handleOptimizedImageError(e.currentTarget, product.category, product.name, "medium");
              }}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 animate-fadeIn"
            />

            {/* Click to Zoom Hover Badge */}
            <div className="absolute top-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-1.5 transition-all opacity-80 group-hover/img:opacity-100">
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Besarkan</span>
            </div>

            {product?.halalCertified && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl text-slate-800 text-xs font-bold shadow-xs flex items-center gap-1.5 border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Halal</span>
              </div>
            )}
          </div>

          {/* Thumbnails row if both exist */}
          {hasBothImages && (
            <div className="flex items-center justify-center gap-2 pt-2 z-10">
              {cookedThumbSrc && (
                <button
                  type="button"
                  onClick={() => setActiveImageType("cooked")}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shadow-2xs ${
                    activeImageType === "cooked" ? "border-blue-600 ring-2 ring-blue-200 scale-105" : "border-white opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={cookedThumbSrc}
                    alt="Thumbnail Siap Masak"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      handleOptimizedImageError(e.currentTarget, product.category, product.name, "thumb");
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
              {packagingThumbSrc && (
                <button
                  type="button"
                  onClick={() => setActiveImageType("packaging")}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shadow-2xs ${
                    activeImageType === "packaging" ? "border-blue-600 ring-2 ring-blue-200 scale-105" : "border-white opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={packagingThumbSrc}
                    alt="Thumbnail Packaging"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      handleOptimizedImageError(e.currentTarget, product.category, product.name, "thumb");
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details & Action Column */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 pb-7 flex flex-col justify-between md:overflow-y-auto md:max-h-[88vh] overscroll-contain">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg uppercase">
                  {product?.category || "Umum"}
                </span>
                {hasPromo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-lg">
                    <Tag className="w-3 h-3" />
                    Harga Promosi
                  </span>
                )}
                {product?.isPopular && !hasPromo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Paling Laris
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product?.name || "Produk"}
              </h2>
            </div>

            {/* Price & Unit (Hidden for random/seasonal packages) */}
            {!isPriceHidden ? (
              <div className="flex items-baseline gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {hasPromo && product?.originalPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-red-600">
                      {formatCurrency(product?.price)}
                    </span>
                    <span className="text-sm text-slate-400 line-through font-semibold">
                      {formatCurrency(product?.originalPrice)}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-extrabold text-blue-600">
                    {formatCurrency(product?.price)}
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  / {product?.unit || "1 pek"}
                </span>
                {product?.weight && (
                  <span className="ml-auto text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600 font-semibold">
                    {product?.weight}
                  </span>
                )}
              </div>
            ) : (
              product?.weight && (
                <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100 text-xs text-slate-600">
                  <span className="font-medium">Pakej Pilihan Musim</span>
                  <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-semibold">
                    {product?.weight}
                  </span>
                </div>
              )
            )}

            {/* Description */}
            <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-100/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Penerangan Produk
              </h4>
              <FormattedDescription description={product?.description} />
            </div>

            {/* Storage / Cooking note */}
            {product?.storageInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <ThermometerSnowflake className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5 text-slate-900">Panduan Simpanan:</span>
                  <span>{product?.storageInfo}</span>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Pilih Kuantiti:</span>
                {!isPriceHidden ? (
                  <span className="text-xs text-slate-500 font-medium">
                    Jumlah: <strong className="text-slate-900">{formatCurrency(total)}</strong>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">
                    Kuantiti: <strong className="text-slate-900">{quantity} pek</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  pek ({product?.unit || "1 pek"})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-5 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={handleAdd}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                justAdded
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95"
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Berjaya Ditambah ({quantity} pek)!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isPriceHidden
                      ? `Tambah ke Senarai Pesanan (${quantity} pek)`
                      : `Tambah ke Senarai Pesanan (${formatCurrency(total)})`}
                  </span>
                </>
              )}
            </button>

            {/* Tarikh Pilihan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
              <label htmlFor={`modal-date-${product?.id || "item"}`} className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Tarikh Rancangan Penghantaran:</span>
              </label>
              <input
                id={`modal-date-${product?.id || "item"}`}
                type="date"
                min={todayIso}
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Delivery Area & Manual Linked Agent Selection (resets agent on area change) */}
            <AreaAgentSelector
              selectedArea={selectedArea}
              selectedAgent={selectedAgent}
              onSelectArea={(area) => {
                setSelectedArea(area);
                setSelectedAgent(null);
              }}
              onSelectAgent={(agent) => setSelectedAgent(agent)}
              compact={true}
              idPrefix={`modal-${product?.id || "item"}`}
            />

            {/* Separated Price Note */}
            {!isPriceHidden ? (
              <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 flex items-center justify-between">
                <span>Subtotal Produk: <strong>{formatCurrency(total)}</strong></span>
                <span className="text-blue-700 font-semibold">+ Caj hantar berasingan</span>
              </div>
            ) : (
              <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 flex items-center justify-between">
                <span>Item pakej / random ({quantity} pek)</span>
                <span className="text-blue-700 font-semibold">+ Caj hantar berasingan</span>
              </div>
            )}

            {!canDirectWhatsApp ? (
              <div className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Sila pilih Kawasan &amp; tekan nama Agen secara manual di atas untuk WhatsApp.</span>
              </div>
            ) : (
              <a
                id={`modal-whatsapp-btn-${product?.id || "item"}`}
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>
                  {isPriceHidden
                    ? `Pesan Terus ke ${selectedAgent?.name}`
                    : `Pesan Terus ke ${selectedAgent?.name} (${formatCurrency(total)})`}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Full-Screen Big Image Preview */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        productName={product?.name || ""}
        category={product?.category}
        cookedImageUrl={product?.cookedImageUrl || product?.imageUrl}
        packagingImageUrl={product?.packagingImageUrl}
        activeType={activeImageType}
        onSelectType={(type) => setActiveImageType(type)}
      />
    </div>
  );
};
