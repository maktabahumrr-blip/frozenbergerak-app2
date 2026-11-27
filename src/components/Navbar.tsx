import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  ShoppingBag, 
  Search, 
  MessageSquareQuote, 
  RefreshCw, 
  WifiOff, 
  Bell,
  ChevronDown,
  X,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { NavView } from "./BottomNav";
import { TEAM_WHATSAPP_CONTACTS } from "../data/deliveryAgents";

interface NavbarProps {
  totalCartCount: number;
  totalCartValue: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  whatsappNumber: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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
  whatsappNumber: _whatsappNumber,
  onRefresh,
  isRefreshing = false,
  isOffline = false,
  activeView,
  onNavigateView,
  onOpenNotifications,
}) => {
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

  const defaultMessage = encodeURIComponent(
    "Salam FrozenBergerak! Saya ingin membuat pertanyaan mengenai produk & pesanan."
  );

  const teamModal = isTeamMenuOpen ? (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="navbar-team-wa-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => setIsTeamMenuOpen(false)}
      />

      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <h3 id="navbar-team-wa-title" className="text-sm sm:text-base font-extrabold leading-tight">
                Hubungi Team WhatsApp
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Pilih ahli team kami untuk terus chat di WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTeamMenuOpen(false)}
            aria-label="Tutup pilihan WhatsApp team"
            className="p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Member List */}
        <div className="p-4 pb-6 space-y-2.5 bg-slate-50/60">
          {TEAM_WHATSAPP_CONTACTS.map((member) => (
            <a
              key={member.id}
              id={`header-wa-team-${member.id}`}
              href={`https://wa.me/${member.phone}?text=${defaultMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsTeamMenuOpen(false)}
              className="w-full p-3.5 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-400 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all group active:scale-98"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {member.name}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    +{member.phone}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 px-2.5 py-1.5 rounded-xl transition-colors shrink-0">
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
    <header id="main-header" className="h-16 sm:h-20 w-full bg-white/95 backdrop-blur-md border-b border-sky-100/80 px-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4 shadow-2xs transition-colors">
      {/* Brand Logo & Brand Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        <button
          type="button"
          onClick={() => onNavigateView("home")}
          className="flex items-center gap-1.5 sm:gap-3 text-left focus:outline-none group cursor-pointer min-w-0"
          title="Kembali ke Laman Utama FrozenBergerak"
        >
          <div className="relative shrink-0">
            <img
              src="/logo.png"
              alt="Logo FrozenBergerak"
              className="w-8 h-8 sm:w-12 sm:h-12 object-contain group-hover:scale-105 transition-transform duration-200"
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

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[15px] sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                Frozen<span className="text-blue-600">Bergerak</span>
              </span>
              {isOffline && (
                <span className="text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 px-1 sm:px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                  Offline
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:block -mt-1 truncate">
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
            title="Segar semula katalog & data terkini"
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative cursor-pointer shrink-0"
            title="Tetapan Notifikasi Pergerakan"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
          </button>
        )}

        {/* WhatsApp Contact Button -> Team Selector */}
        <button
          id="header-whatsapp-contact"
          type="button"
          onClick={() => setIsTeamMenuOpen(true)}
          aria-expanded={isTeamMenuOpen}
          aria-haspopup="dialog"
          title="Pilih team FrozenBergerak untuk hubungi di WhatsApp"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors shadow-xs active:scale-95 cursor-pointer shrink-0"
        >
          <MessageSquareQuote className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">WhatsApp</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-90 hidden sm:inline" />
        </button>

        {/* Cart Drawer Trigger */}
        <button
          id="header-cart-btn"
          type="button"
          onClick={onOpenCart}
          className="relative bg-slate-900 hover:bg-slate-800 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
        >
          <ShoppingBag className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Pesanan</span>
          {totalCartCount > 0 ? (
            <span className="bg-blue-600 text-white text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
              {totalCartCount} {totalCartValue > 0 && <span className="hidden sm:inline">• {formatCurrency(totalCartValue)}</span>}
            </span>
          ) : (
            <span className="bg-slate-800 text-slate-400 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full">
              0
            </span>
          )}
        </button>
      </div>
    </header>
    {typeof document !== "undefined" && teamModal ? createPortal(teamModal, document.body) : null}
    </>
  );
};
