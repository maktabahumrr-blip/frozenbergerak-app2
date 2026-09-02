import React from "react";
import { 
  Grid, 
  Flame, 
  Cookie, 
  Soup, 
  Utensils, 
  Fish, 
  Sparkles,
  Sun,
  Tag
} from "lucide-react";
import { Category } from "../types";

interface CategoryBarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  showPopularOnly: boolean;
  onTogglePopularOnly: () => void;
  activePromoFilter?: "alltime" | "seasonal" | null;
  onSelectPromoFilter?: (filter: "alltime" | "seasonal" | null) => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "Flame":
      return <Flame className="w-3.5 h-3.5" />;
    case "Cookie":
      return <Cookie className="w-3.5 h-3.5" />;
    case "Soup":
      return <Soup className="w-3.5 h-3.5" />;
    case "Utensils":
      return <Utensils className="w-3.5 h-3.5" />;
    case "Fish":
      return <Fish className="w-3.5 h-3.5" />;
    default:
      return <Grid className="w-3.5 h-3.5" />;
  }
};

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  showPopularOnly,
  onTogglePopularOnly,
  activePromoFilter,
  onSelectPromoFilter,
}) => {
  return (
    <div id="mobile-category-bar" className="lg:hidden px-4 py-2.5 bg-white border-b border-slate-200 sticky top-20 z-30 shadow-2xs">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        
        {/* All Time Promo Filter Pill */}
        {onSelectPromoFilter && (
          <button
            type="button"
            onClick={() => {
              if (activePromoFilter === "alltime") {
                onSelectPromoFilter(null);
              } else {
                onSelectPromoFilter("alltime");
              }
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer ${
              activePromoFilter === "alltime"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 All Time Promo</span>
          </button>
        )}

        {/* Seasonal Promo Filter Pill */}
        {onSelectPromoFilter && (
          <button
            type="button"
            onClick={() => {
              if (activePromoFilter === "seasonal") {
                onSelectPromoFilter(null);
              } else {
                onSelectPromoFilter("seasonal");
              }
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer ${
              activePromoFilter === "seasonal"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>✨ PROMOSI BERMUSIM</span>
          </button>
        )}

        {/* Normal Categories */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id && !showPopularOnly && !activePromoFilter;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (showPopularOnly) onTogglePopularOnly();
                if (onSelectPromoFilter) onSelectPromoFilter(null);
                onSelectCategory(cat.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{getCategoryIcon(cat.icon)}</span>
              <span>{cat.name}</span>
              {typeof cat.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Popular button */}
        <button
          type="button"
          onClick={() => {
            if (onSelectPromoFilter) onSelectPromoFilter(null);
            onTogglePopularOnly();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer ${
            showPopularOnly
              ? "bg-amber-500 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Paling Laris</span>
        </button>
      </div>
    </div>
  );
};
