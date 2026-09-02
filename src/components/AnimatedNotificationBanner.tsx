import React, { useEffect, useState } from "react";
import { X, ArrowRight, BellRing, Sparkles, MapPin } from "lucide-react";

export interface LiveNotificationPayload {
  id?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  timestamp?: number;
}

interface AnimatedNotificationBannerProps {
  notification: LiveNotificationPayload | null;
  onDismiss: () => void;
  onClickAction?: (url?: string) => void;
}

export const AnimatedNotificationBanner: React.FC<AnimatedNotificationBannerProps> = ({
  notification,
  onDismiss,
  onClickAction,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      // Auto dismiss after 10 seconds if not interacted
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 400);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const handleClick = () => {
    if (onClickAction) {
      onClickAction(notification.url);
    }
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] transition-all duration-500 ease-out transform ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100 shadow-2xl"
          : "-translate-y-12 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 border-2 border-blue-400/60 shadow-[0_12px_40px_rgba(37,99,235,0.4)] backdrop-blur-md">
        
        {/* Animated ambient glow effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          
          {/* Animated FrozenBergerak Vehicle & Logo Badge */}
          <div className="relative flex-shrink-0">
            {/* Pulsing radar ripple circles */}
            <div className="absolute inset-0 -m-1 rounded-2xl bg-blue-400/40 animate-ping" />
            <div className="absolute inset-0 -m-2 rounded-2xl bg-indigo-500/20 animate-pulse" />

            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1 border-2 border-blue-300 shadow-lg flex items-center justify-center overflow-hidden">
              
              {/* Moving road dash stripe beneath the truck */}
              <div className="absolute bottom-1 left-0 right-0 h-1 bg-slate-800 flex overflow-hidden">
                <div className="w-full h-full bg-[linear-gradient(90deg,#fff_50%,transparent_50%)] bg-[length:10px_100%] animate-[moveRoad_0.6s_linear_infinite]" />
              </div>

              {/* Animated FrozenBergerak Truck Image */}
              <img
                src="/logo.svg"
                alt="FrozenBergerak Bergerak"
                className="w-full h-full object-contain filter drop-shadow-md animate-[bounceTruck_0.8s_ease-in-out_infinite] transform"
              />

              {/* Speed motion streaks */}
              <div className="absolute top-2 left-1 flex flex-col gap-0.5 pointer-events-none">
                <span className="w-2.5 h-0.5 bg-blue-200 rounded-full animate-[speedStreak_0.5s_ease-out_infinite]" />
                <span className="w-4 h-0.5 bg-amber-300 rounded-full animate-[speedStreak_0.4s_ease-out_infinite_0.1s]" />
              </div>
            </div>

            {/* Live 'BERGERAK' Badge below icon */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-rose-600 text-[8px] font-black tracking-wider text-white rounded-full uppercase shadow-xs border border-rose-300 flex items-center gap-0.5 animate-bounce">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>BERGERAK</span>
            </div>
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 rounded-full text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1">
                <BellRing className="w-3 h-3 text-blue-300 animate-spin" />
                <span>Notifikasi Masuk</span>
              </span>
              <span className="text-[10px] text-blue-300 font-bold">
                Baru Sahaja
              </span>
            </div>

            <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-snug line-clamp-1">
              {notification.title || "FrozenBergerak Sedang Bergerak!"}
            </h4>

            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
              {notification.body || "Sila semak laluan dan jadual pergerakan terkini kami sekarang."}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleClick}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Buka Jadual</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onDismiss, 300);
                }}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
