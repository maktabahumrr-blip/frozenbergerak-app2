import React, { useState } from "react";
import { MessageCircle, ShoppingBag, Eye, Check, ShieldCheck, Sparkles, Tag, Layers, Maximize2 } from "lucide-react";
import { Product } from "../types";
import { formatCurrency, generateSingleProductWhatsAppUrl } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";
import { ImageLightbox } from "./ImageLightbox";

interface ProductCardProps {
  product: Product;
  whatsappNumber: string;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  isInCart: boolean;
  cartQuantity: number;
}

const getCategoryBadgeClass = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("pastri") || c.includes("kuih") || c.includes("karipap")) {
    return "bg-orange-500 text-white";
  }
  if (c.includes("sayur") || c.includes("laut") || c.includes("ikan") || c.includes("udang")) {
    return "bg-emerald-600 text-white";
  }
  if (c.includes("ayam") || c.includes("daging")) {
    return "bg-red-600 text-white";
  }
  return "bg-blue-600 text-white";
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  whatsappNumber,
  onViewDetails,
  onAddToCart,
  isInCart,
  cartQuantity,
}) => {
  const hasBothImages = Boolean(product.cookedImageUrl && product.packagingImageUrl);
  const [showPackaging, setShowPackaging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activeImageType = showPackaging ? "packaging" : "cooked";

  const currentImageSrc = showPackaging && product.packagingImageUrl
    ? formatImageUrl(product.packagingImageUrl, product.category, product.name)
    : formatImageUrl(product.cookedImageUrl || product.imageUrl || product.packagingImageUrl, product.category, product.name);

  const fallbackSrc = getCategoryFallbackImage(product.category, product.name);
  const singleWhatsAppUrl = generateSingleProductWhatsAppUrl(product, 1, whatsappNumber);
  const badgeColor = getCategoryBadgeClass(product.category);
  const hasPromo = Boolean(product.promoPrice && product.originalPrice && product.promoPrice < product.originalPrice);

  return (
    <div
      id={`product-card-${product.id}`}
      className="bg-white rounded-2xl shadow-xs hover:shadow-md border border-slate-100 overflow-hidden flex flex-col transition-all duration-200 group"
    >
      {/* Product Image Box */}
      <div 
        className="h-44 sm:h-48 bg-slate-100 relative overflow-hidden cursor-zoom-in group/img"
        onClick={() => setIsLightboxOpen(true)}
        title="Tekan untuk besarkan gambar"
      >
        <img
          src={currentImageSrc}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackSrc;
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Category Pill Tag */}
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wide shadow-xs ${badgeColor}`}>
          {product.category}
        </span>

        {/* Popular / Promo / Halal Badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
          {hasPromo && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1 animate-pulse">
              <Tag className="w-2.5 h-2.5" />
              PROMO
            </span>
          )}
          {product.isPopular && !hasPromo && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Laris
            </span>
          )}
          {product.halalCertified && (
            <span className="bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Halal
            </span>
          )}
        </div>

        {/* Toggle between Siap Masak / Packaging if both are available */}
        {hasBothImages && (
          <div 
            className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-xs rounded-lg p-0.5 flex items-center shadow-xs border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPackaging(false)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                !showPackaging ? "bg-white text-slate-900 shadow-xs" : "text-white/80 hover:text-white"
              }`}
            >
              Masak
            </button>
            <button
              type="button"
              onClick={() => setShowPackaging(true)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                showPackaging ? "bg-white text-slate-900 shadow-xs" : "text-white/80 hover:text-white"
              }`}
            >
              Pek
            </button>
          </div>
        )}

        {/* Action button overlay on hover / touch */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            aria-label="Besarkan Gambar"
            className="opacity-90 group-hover:opacity-100 transition-opacity bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold p-1.5 rounded-lg shadow-xs flex items-center justify-center"
            title="Besarkan Gambar"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Info</span>
          </button>
        </div>
      </div>

      {/* Product Info & Action */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <h4 
              onClick={() => onViewDetails(product)}
              className="font-bold text-base sm:text-lg text-slate-800 leading-tight group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
              title={product.name}
            >
              {product.name}
            </h4>

            {/* Price section with Promo Price support */}
            <div className="text-right whitespace-nowrap">
              {hasPromo && product.originalPrice ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400 line-through font-semibold">
                    {formatCurrency(product.originalPrice)}
                  </span>
                  <span className="text-red-600 font-black text-base">
                    {formatCurrency(product.price)}
                  </span>
                </div>
              ) : (
                <span className="text-blue-600 font-extrabold text-base">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>{product.unit}</span>
            {product.weight && <span>• {product.weight}</span>}
          </div>

          <p className="text-slate-500 text-xs sm:text-sm mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id={`add-btn-${product.id}`}
              onClick={() => onAddToCart(product)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                isInCart
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>({cartQuantity}) Dipilih</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ Pesanan</span>
                </>
              )}
            </button>

            <a
              id={`wa-btn-${product.id}`}
              href={singleWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs text-center"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp</span>
            </a>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
          >
            <span>Pesan Sekarang</span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        productName={product.name}
        category={product.category}
        cookedImageUrl={product.cookedImageUrl || product.imageUrl}
        packagingImageUrl={product.packagingImageUrl}
        activeType={activeImageType}
        onSelectType={(type) => setShowPackaging(type === "packaging")}
      />
    </div>
  );
};
