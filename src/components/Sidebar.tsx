import React from "react";
import { 
  Flame, 
  Cookie, 
  Soup, 
  Utensils, 
  Fish, 
  Grid, 
  Sparkles, 
  CheckCircle2,
  Sun,
  Tag
} from "lucide-react";
import { Category } from "../types";

interface SidebarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  showPopularOnly: boolean;
  onTogglePopularOnly: () => void;
  totalProductsCount: number;
  activePromoFilter?: "alltime" | "seasonal" | null;
  onSelectPromoFilter?: (filter: "alltime" | "seasonal" | null) => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "Flame":
      return <Flame className="w-4 h-4 text-blue-500" />;
    case "Cookie":
      return <Cookie className="w-4 h-4 text-orange-500" />;
    case "Soup":
      return <Soup className="w-4 h-4 text-sky-500" />;
    case "Utensils":
      return <Utensils className="w-4 h-4 text-indigo-500" />;
    case "Fish":
      return <Fish className="w-4 h-4 text-emerald-500" />;
    default:
      return <Grid className="w-4 h-4 text-slate-500" />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  showPopularOnly,
  onTogglePopularOnly,
  totalProductsCount,
  activePromoFilter,
  onSelectPromoFilter,
}) => {
  return (
    <aside id="sleek-sidebar" className="w-64 bg-white border-r border-slate-200 p-6 hidden lg:flex flex-col gap-6 shrink-0">
      
      {/* Promosi Khas Section */}
      {onSelectPromoFilter && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Promosi Khas
          </h3>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              id="sidebar-alltime-promo-filter"
              onClick={() => {
                if (activePromoFilter === "alltime") {
                  onSelectPromoFilter(null);
                } else {
                  onSelectPromoFilter("alltime");
                }
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-colors text-left cursor-pointer ${
                activePromoFilter === "alltime"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50/70 text-rose-700 hover:bg-rose-100/80 border border-rose-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className={`w-4 h-4 ${activePromoFilter === "alltime" ? "text-white" : "text-rose-600"}`} />
                <span>🔥 All Time Promo</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                activePromoFilter === "alltime" ? "bg-rose-800 text-white" : "bg-rose-200 text-rose-800"
              }`}>
                HOT
              </span>
            </button>

            <button
              type="button"
              id="sidebar-seasonal-promo-filter"
              onClick={() => {
                if (activePromoFilter === "seasonal") {
                  onSelectPromoFilter(null);
                } else {
                  onSelectPromoFilter("seasonal");
                }
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-colors text-left cursor-pointer ${
                activePromoFilter === "seasonal"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50/70 text-amber-800 hover:bg-amber-100/80 border border-amber-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`w-4 h-4 ${activePromoFilter === "seasonal" ? "text-white" : "text-amber-600"}`} />
                <span>✨ PROMOSI BERMUSIM</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                activePromoFilter === "seasonal" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"
              }`}>
                NEW
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Kategori Utama Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Kategori Produk
        </h3>
        
        <div className="flex flex-col gap-1.5">
          {(categories || []).map((cat) => {
            const isActive = activeCategoryId === cat.id && !showPopularOnly && !activePromoFilter;

            return (
              <button
                key={cat.id}
                id={`sidebar-cat-${cat.id}`}
                type="button"
                onClick={() => {
                  if (showPopularOnly) onTogglePopularOnly();
                  if (onSelectPromoFilter) onSelectPromoFilter(null);
                  onSelectCategory(cat.id);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {getCategoryIcon(cat.icon)}
                  <span className="truncate">{cat.name}</span>
                </div>
                {typeof cat.count === "number" && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Popular filter button */}
          <button
            type="button"
            id="sidebar-popular-filter"
            onClick={() => {
              if (onSelectPromoFilter) onSelectPromoFilter(null);
              onTogglePopularOnly();
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors text-left mt-1 cursor-pointer ${
              showPopularOnly
                ? "bg-amber-50 text-amber-800 font-semibold border border-amber-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Paling Laris</span>
            </div>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
              🔥
            </span>
          </button>
        </div>
      </div>

      {/* Info Badge: Halal Certified */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Jaminan 100% Halal</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Semua hidangan sejuk beku disahkan bersih, suci &amp; selamat untuk seisi keluarga.
        </p>
      </div>

      {/* Status Kedai Card */}
      <div className="mt-auto p-4 bg-slate-900 rounded-2xl text-white shadow-xs">
        <p className="text-xs font-medium opacity-70 mb-1.5">Status Kedai</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-semibold">Sedia Menerima Pesanan</span>
        </div>
      </div>
    </aside>
  );
};
