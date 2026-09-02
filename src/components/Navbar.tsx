import React from "react";
import { 
  ShoppingBag, 
  Search, 
  MessageSquareQuote, 
  RefreshCw, 
  Download, 
  WifiOff, 
  Bell 
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { NavView } from "./BottomNav";

interface NavbarProps {
  totalCartCount: number;
  totalCartValue: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  whatsappNumber: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isInstallable?: boolean;
  onInstall?: () => void;
  isOffline?: boolean;
  activeView: NavView;
  onNavigateView: (view: NavView) => void;
  onNavigateToContact?: () => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalCartCount,
  totalCartValue,
  onOpenCart,
  searchQuery,
  onSearchChange,
  whatsappNumber,
  onRefresh,
  isRefreshing = false,
  isInstallable = false,
  onInstall,
  isOffline = false,
  activeView,
  onNavigateView,
  onNavigateToContact,
  onOpenNotifications,
}) => {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <header id="main-header" className="h-20 bg-white/90 backdrop-blur-md border-b border-sky-100/80 px-4 sm:px-8 flex items-center justify-between shadow-2xs sticky top-0 z-40 transition-colors">
      {/* Brand Logo & Brand Info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigateView("home")}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          title="Kembali ke Laman Utama FrozenBergerak"
        >
          <div className="relative flex-shrink-0">
            <img
              src="/logo.svg"
              alt="Logo FrozenBergerak"
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain group-hover:scale-105 transition-transform duration-200"
            />
            {isOffline && (
              <span
                className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs"
                title="Mod Luar Talian (Offline)"
              >
                <WifiOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                Frozen<span className="text-blue-600">Bergerak</span>
              </span>
              {isOffline && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                  Offline
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:block -mt-1">
              Aneka Pilihan Frozen, Mudah, Jimat Masa &amp; Sedap
            </span>
          </div>
        </button>
      </div>

      {/* Center Search Input & Refresh Sync */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <input
            id="desktop-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (activeView !== "catalog" && e.target.value.trim().length > 0) {
                onNavigateView("catalog");
              }
            }}
            placeholder="Cari produk mengikut nama, kategori..."
            className="pl-10 pr-8 py-2 bg-slate-100 border-none rounded-full w-56 lg:w-64 focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
          />
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Segar semula data dari Google Sheet"
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative cursor-pointer"
            title="Tetapan Notifikasi Pergerakan"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
          </button>
        )}

        {/* Install PWA Button if available */}
        {isInstallable && onInstall && (
          <button
            type="button"
            onClick={onInstall}
            className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-bold text-xs transition-colors active:scale-95 cursor-pointer"
            title="Pasang aplikasi FrozenBergerak pada peranti anda"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang App</span>
          </button>
        )}

        {/* WhatsApp Contact Button */}
        <a
          id="header-whatsapp-contact"
          href={`https://wa.me/${cleanNumber}?text=${encodeURIComponent("Salam FrozenBergerak! Saya ingin membuat pertanyaan mengenai produk & pesanan.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-xs active:scale-95 cursor-pointer"
        >
          <MessageSquareQuote className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>

        {/* Cart Drawer Trigger */}
        <button
          id="header-cart-btn"
          type="button"
          onClick={onOpenCart}
          className="relative bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
        >
          <ShoppingBag className="h-4 w-4 text-blue-400" />
          <span className="hidden xs:inline">Pesanan</span>
          {totalCartCount > 0 ? (
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {totalCartCount} {totalCartValue > 0 && `• ${formatCurrency(totalCartValue)}`}
            </span>
          ) : (
            <span className="bg-slate-800 text-slate-400 text-[11px] px-1.5 py-0.5 rounded-full">
              0
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
