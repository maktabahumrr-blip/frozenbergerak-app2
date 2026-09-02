import React, { useEffect } from "react";
import { X, UtensilsCrossed, Package, ZoomIn } from "lucide-react";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  category?: string;
  cookedImageUrl?: string;
  packagingImageUrl?: string;
  activeType?: "cooked" | "packaging";
  onSelectType?: (type: "cooked" | "packaging") => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  productName,
  category = "",
  cookedImageUrl,
  packagingImageUrl,
  activeType = "cooked",
  onSelectType,
}) => {
  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fallbackSrc = getCategoryFallbackImage(category, productName);
  const cookedSrc = cookedImageUrl ? formatImageUrl(cookedImageUrl, category, productName) : null;
  const packagingSrc = packagingImageUrl ? formatImageUrl(packagingImageUrl, category, productName) : null;

  let currentImageSrc = cookedSrc || packagingSrc || fallbackSrc;
  if (activeType === "cooked" && cookedSrc) {
    currentImageSrc = cookedSrc;
  } else if (activeType === "packaging" && packagingSrc) {
    currentImageSrc = packagingSrc;
  }

  const hasBoth = Boolean(cookedSrc && packagingSrc);

  return (
    <div
      id="image-lightbox-modal"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Lightbox Window */}
      <div
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between gap-3 text-white pb-3 px-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate drop-shadow-md">
              {productName}
            </h3>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              {activeType === "cooked" ? (
                <>
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-400" />
                  <span>Paparan Penuh: Gambar Siap Masak</span>
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span>Paparan Penuh: Gambar Packaging</span>
                </>
              )}
            </p>
          </div>

          {/* Close Button X */}
          <button
            type="button"
            id="close-lightbox-btn"
            onClick={onClose}
            aria-label="Tutup Paparan Besar"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full p-2.5 sm:px-4 sm:py-2 transition-all backdrop-blur-md border border-white/20 shadow-lg active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-bold">Tutup (X)</span>
          </button>
        </div>

        {/* Big Image Container */}
        <div className="relative w-full flex items-center justify-center max-h-[70vh] sm:max-h-[76vh] overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-2xl">
          <img
            key={currentImageSrc}
            src={currentImageSrc}
            alt={`${productName} - Paparan Besar`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
            className="max-w-full max-h-[68vh] sm:max-h-[74vh] object-contain rounded-xl shadow-2xl transition-transform duration-300"
          />
        </div>

        {/* Bottom Switcher & Thumbnails (If both available) */}
        {hasBoth && onSelectType && (
          <div className="mt-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => onSelectType("cooked")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeType === "cooked"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Siap Masak</span>
            </button>

            <div className="w-px h-5 bg-white/20" />

            <button
              type="button"
              onClick={() => onSelectType("packaging")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeType === "packaging"
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Packaging</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
