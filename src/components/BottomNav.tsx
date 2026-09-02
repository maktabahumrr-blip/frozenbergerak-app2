import React from "react";
import { 
  Home, 
  Grid, 
  CalendarDays, 
  Gift, 
  MessageSquareHeart 
} from "lucide-react";

export type NavView = "home" | "catalog" | "schedule" | "loyalty" | "feedback";

interface BottomNavProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  productsCount?: number;
  hasActiveSchedule?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onSelectView,
  productsCount,
  hasActiveSchedule = false,
}) => {
  const navItems = [
    {
      id: "home" as NavView,
      label: "Utama",
      icon: Home,
    },
    {
      id: "catalog" as NavView,
      label: "Katalog",
      icon: Grid,
      badge: productsCount !== undefined && productsCount > 0 ? `${productsCount}` : undefined,
    },
    {
      id: "schedule" as NavView,
      label: "Jadual",
      icon: CalendarDays,
      hasDot: hasActiveSchedule,
    },
    {
      id: "loyalty" as NavView,
      label: "Stamp Loyalti",
      icon: Gift,
    },
    {
      id: "feedback" as NavView,
      label: "Aduan/Cadangan",
      icon: MessageSquareHeart,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Navigasi Bawah Utama"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-[0_-4px_20px_rgba(37,99,235,0.06)] px-2 pt-1 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] transition-all select-none"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              id={`bottom-nav-btn-${item.id}`}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex-1 min-h-[48px] py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? "text-blue-600 bg-gradient-to-b from-sky-50/90 to-blue-50/70 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium"
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute -top-1 w-7 h-1 bg-gradient-to-r from-blue-600 to-sky-500 rounded-full shadow-xs" />
              )}

              {/* Icon with potential live notification dot */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "scale-110 stroke-[2.4]" : "stroke-[1.8]"
                  }`}
                />
                {item.hasDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse border-2 border-white" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] leading-tight tracking-tight mt-1 whitespace-nowrap ${
                  isActive ? "text-blue-700 font-extrabold" : "text-slate-600"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
