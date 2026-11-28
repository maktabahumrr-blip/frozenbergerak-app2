import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product, CartItem } from "../types";
import { ProductCard } from "./ProductCard";

interface CatalogSectionCarouselProps {
  categoryName: string;
  products: Product[];
  cart: CartItem[];
  whatsappNumber: string;
  forceHidePrice?: boolean;
  onSeeAll: (categoryName: string) => void;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const CatalogSectionCarousel: React.FC<CatalogSectionCarouselProps> = ({
  categoryName,
  products,
  cart,
  whatsappNumber,
  forceHidePrice = false,
  onSeeAll,
  onViewDetails,
  onAddToCart,
}) => {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const distance = direction === "left" ? -310 : 310;
    carouselRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  return (
    <section
      id={`catalog-section-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className="space-y-3 min-w-0 w-full"
    >
      {/* Category Section Header with inline Lihat Semua > */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
            {categoryName}
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums shrink-0">
            {products.length}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {products.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => scrollCarousel("left")}
                aria-label={`Skrol ${categoryName} ke kiri`}
                className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel("right")}
                aria-label={`Skrol ${categoryName} ke kanan`}
                className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onSeeAll(categoryName)}
            className="text-xs sm:text-[13px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 hover:underline cursor-pointer py-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Sliding Product Carousel */}
      <div
        ref={carouselRef}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 scroll-smooth min-w-0 w-full"
      >
        {products.map((product) => {
          if (!product) return null;
          const cartItem = (Array.isArray(cart) ? cart : []).find((i) => i?.product?.id === product?.id);
          const isSeasonalCard = forceHidePrice || Boolean(product?.hidePrice);
          const cardProduct = isSeasonalCard && !product?.hidePrice ? { ...product, hidePrice: true } : product;

          return (
            <div
              key={product.id || Math.random().toString()}
              className="w-[264px] sm:w-[292px] shrink-0 snap-start flex flex-col"
            >
              <ProductCard
                product={cardProduct}
                whatsappNumber={whatsappNumber}
                hidePrice={isSeasonalCard}
                onViewDetails={(p) => onViewDetails(isSeasonalCard ? { ...p, hidePrice: true } : p)}
                onAddToCart={(p) => onAddToCart(isSeasonalCard ? { ...p, hidePrice: true } : p)}
                isInCart={Boolean(cartItem)}
                cartQuantity={cartItem ? (Number(cartItem?.quantity) || 0) : 0}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
