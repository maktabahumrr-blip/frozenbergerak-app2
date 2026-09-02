import React, { useState, useEffect } from "react";
import { X, MessageCircle, ShoppingBag, ShieldCheck, ThermometerSnowflake, Sparkles, Plus, Minus, Check, Tag, UtensilsCrossed, Package, Maximize2 } from "lucide-react";
import { Product } from "../types";
import { formatCurrency, generateSingleProductWhatsAppUrl } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";
import { ImageLightbox } from "./ImageLightbox";
import { FormattedDescription } from "./FormattedDescription";

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
  whatsappNumber,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const [activeImageType, setActiveImageType] = useState<"cooked" | "packaging">("cooked");
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setJustAdded(false);
      setIsLightboxOpen(false);
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

  const fallbackSrc = getCategoryFallbackImage(product.category, product.name);
  const cookedSrc = product.cookedImageUrl ? formatImageUrl(product.cookedImageUrl, product.category, product.name) : null;
  const packagingSrc = product.packagingImageUrl ? formatImageUrl(product.packagingImageUrl, product.category, product.name) : null;
  
  // Decide which image to show based on selected tab
  let displayedImage = product.imageUrl ? formatImageUrl(product.imageUrl, product.category, product.name) : fallbackSrc;
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

  const total = product.price * quantity;
  const whatsappUrl = generateSingleProductWhatsAppUrl(product, quantity, whatsappNumber);
  const hasPromo = Boolean(product.promoPrice && product.originalPrice && product.promoPrice < product.originalPrice);

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
        id={`modal-product-${product.id}`}
        className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[92vh] flex flex-col md:flex-row border border-slate-200"
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
        <div className="relative w-full md:w-1/2 bg-slate-100 flex flex-col justify-between min-h-[260px] md:min-h-[420px] p-3 sm:p-4">
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
                {product.cookedImageUrl ? (
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
              alt={`${product.name} - ${activeImageType === "cooked" ? "Siap Masak" : "Packaging"}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackSrc;
              }}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 animate-fadeIn"
            />

            {/* Click to Zoom Hover Badge */}
            <div className="absolute top-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl shadow-md backdrop-blur-xs flex items-center gap-1.5 transition-all opacity-80 group-hover/img:opacity-100">
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Besarkan</span>
            </div>

            {product.halalCertified && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl text-slate-800 text-xs font-bold shadow-xs flex items-center gap-1.5 border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Halal</span>
              </div>
            )}
          </div>

          {/* Thumbnails row if both exist */}
          {hasBothImages && (
            <div className="flex items-center justify-center gap-2 pt-2 z-10">
              {cookedSrc && (
                <button
                  type="button"
                  onClick={() => setActiveImageType("cooked")}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shadow-2xs ${
                    activeImageType === "cooked" ? "border-blue-600 ring-2 ring-blue-200 scale-105" : "border-white opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={cookedSrc}
                    alt="Thumbnail Siap Masak"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackSrc;
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
              {packagingSrc && (
                <button
                  type="button"
                  onClick={() => setActiveImageType("packaging")}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shadow-2xs ${
                    activeImageType === "packaging" ? "border-blue-600 ring-2 ring-blue-200 scale-105" : "border-white opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={packagingSrc}
                    alt="Thumbnail Packaging"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackSrc;
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details & Action Column */}
        <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[55vh] md:max-h-[85vh]">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg uppercase">
                  {product.category}
                </span>
                {hasPromo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-lg">
                    <Tag className="w-3 h-3" />
                    Harga Promosi
                  </span>
                )}
                {product.isPopular && !hasPromo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Paling Laris
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h2>
            </div>

            {/* Price & Unit */}
            <div className="flex items-baseline gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {hasPromo && product.originalPrice ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-red-600">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-sm text-slate-400 line-through font-semibold">
                    {formatCurrency(product.originalPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-extrabold text-blue-600">
                  {formatCurrency(product.price)}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                / {product.unit}
              </span>
              {product.weight && (
                <span className="ml-auto text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600 font-semibold">
                  {product.weight}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-100/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Penerangan Produk
              </h4>
              <FormattedDescription description={product.description} />
            </div>

            {/* Storage / Cooking note */}
            {product.storageInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <ThermometerSnowflake className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5 text-slate-900">Panduan Simpanan:</span>
                  <span>{product.storageInfo}</span>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Pilih Kuantiti:</span>
                <span className="text-xs text-slate-500 font-medium">
                  Jumlah: <strong className="text-slate-900">{formatCurrency(total)}</strong>
                </span>
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
                  pek ({product.unit})
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
                  <span>Tambah ke Senarai Pesanan ({formatCurrency(total)})</span>
                </>
              )}
            </button>

            <a
              id={`modal-whatsapp-btn-${product.id}`}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-600 text-white shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Pesan Terus di WhatsApp ({formatCurrency(total)})</span>
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox / Full-Screen Big Image Preview */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        productName={product.name}
        category={product.category}
        cookedImageUrl={product.cookedImageUrl || product.imageUrl}
        packagingImageUrl={product.packagingImageUrl}
        activeType={activeImageType}
        onSelectType={(type) => setActiveImageType(type)}
      />
    </div>
  );
};
