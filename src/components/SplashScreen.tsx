import React from "react";

interface SplashScreenProps {
  isVisible: boolean;
  isFadingOut: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, isFadingOut }) => {
  if (!isVisible) return null;

  return (
    <div
      id="frozenbergerak-splash-screen"
      role="status"
      aria-label="Memuatkan aplikasi FrozenBergerak"
      className={`fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden flex flex-col justify-between bg-gradient-to-b from-sky-100 via-sky-50/70 to-white select-none transition-opacity duration-350 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 1. TOP SKY & SOFT CLOUDS ILLUSTRATION */}
      <div className="relative w-full h-28 sm:h-36 shrink-0 overflow-hidden pointer-events-none">
        {/* Soft Sun / Morning Glow */}
        <div className="absolute -top-10 right-6 sm:right-14 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-amber-100/70 blur-xl" />

        {/* Left Cloud */}
        <svg
          viewBox="0 0 180 76"
          className="absolute top-5 left-3 sm:left-12 w-32 sm:w-44 h-auto text-white drop-shadow-[0_4px_12px_rgba(14,165,233,0.12)] animate-[floatCloud_5s_ease-in-out_infinite]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M36 62h108c14.4 0 26-10.8 26-24 0-12.1-9.6-22.2-22-23.8C142.8 6.1 131.3 0 118 0c-14.9 0-27.7 8.4-33.5 20.6C80.5 18.9 76 18 71.2 18c-15.4 0-28.1 11.2-30.2 25.8C29.4 45.2 21 53 21 62h15z"
            fill="currentColor"
          />
          <path
            d="M28 62h124"
            stroke="#BAE6FD"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Right Cloud */}
        <svg
          viewBox="0 0 160 68"
          className="absolute top-8 right-2 sm:right-16 w-28 sm:w-40 h-auto text-white drop-shadow-[0_4px_12px_rgba(14,165,233,0.1)] animate-[floatCloud_6.2s_ease-in-out_infinite_reverse]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M28 56h100c12.7 0 23-9.6 23-21.5 0-10.9-8.7-19.9-20-21.3C126.2 5.6 116.4 0 105 0 92.2 0 81.2 7.2 76.2 17.6 72.7 16.1 68.8 15.3 64.7 15.3c-13.5 0-24.7 9.8-26.6 22.7C27.9 39.3 20 46.8 20 56h8z"
            fill="currentColor"
          />
          <path
            d="M24 56h112"
            stroke="#BAE6FD"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Subtle Floating Snowflake Accents */}
        <svg
          viewBox="0 0 24 24"
          className="absolute top-6 left-1/2 -translate-x-10 w-4 h-4 text-sky-300/90 animate-pulse"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 2v20M4.93 7l14.14 10M19.07 7L4.93 17" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="hidden sm:block absolute top-14 left-1/3 w-3.5 h-3.5 text-blue-300/80 animate-pulse"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 2v20M4.93 7l14.14 10M19.07 7L4.93 17" />
        </svg>
      </div>

      {/* 2. CENTER BRAND IDENTITY (FrozenBergerak Logo & Title) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 min-h-0">
        <div className="flex flex-col items-center max-w-xs sm:max-w-sm w-full animate-fadeIn">
          {/* Brand Emblem Badge */}
          <div className="relative mb-4 sm:mb-5">
            <div className="absolute inset-0 -m-2 rounded-full bg-sky-200/50 blur-md animate-pulse" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-1.5 shadow-[0_10px_28px_rgba(37,99,235,0.16)] border-2 border-sky-200 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo FrozenBergerak"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>

          {/* Clear Crisp Brand Wordmark */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-none">
            Frozen<span className="text-blue-600">Bergerak</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-500 tracking-wide">
            Segar Sejuk Beku Terus Ke Pintu Anda
          </p>

          {/* Compact Loading Dots */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-sky-100 shadow-2xs">
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.25s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.12s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">
              Menyediakan katalog...
            </span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ILLUSTRATED ROAD & CUTE DELIVERY TRUCK */}
      <div className="relative w-full shrink-0 pt-10 sm:pt-12 pb-[env(safe-area-inset-bottom)]">
        {/* Soft horizon hills / curb border */}
        <div className="w-full h-2.5 bg-gradient-to-r from-sky-100 via-emerald-50 to-sky-100 border-t border-sky-200/70" />

        {/* Delivery Van sitting right on the road */}
        <div className="relative w-full h-16 sm:h-20 bg-slate-200/90 border-t-2 border-slate-300 flex flex-col justify-center overflow-hidden">
          {/* Scrolling Dotted / Pebbled Road Surface */}
          <div className="w-[200%] h-full flex items-center animate-[scrollRoadStrip_2.4s_linear_infinite]">
            {[0, 1].map((dupIdx) => (
              <svg
                key={dupIdx}
                viewBox="0 0 600 80"
                preserveAspectRatio="none"
                className="w-1/2 h-full shrink-0"
                aria-hidden="true"
              >
                {/* Dashed Road Center Line */}
                <line
                  x1="0"
                  y1="38"
                  x2="600"
                  y2="38"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="24 22"
                />
                {/* Cute Pebbles / Dotted Texture */}
                <circle cx="32" cy="18" r="3" fill="#CBD5E1" />
                <circle cx="96" cy="60" r="3.5" fill="#94A3B8" opacity="0.55" />
                <circle cx="154" cy="21" r="2.5" fill="#94A3B8" opacity="0.5" />
                <rect x="208" y="57" width="10" height="5" rx="2.5" fill="#CBD5E1" />
                <circle cx="272" cy="17" r="3" fill="#CBD5E1" />
                <circle cx="338" cy="61" r="3" fill="#94A3B8" opacity="0.55" />
                <rect x="392" y="16" width="9" height="4.5" rx="2.25" fill="#CBD5E1" />
                <circle cx="458" cy="59" r="3.5" fill="#CBD5E1" />
                <circle cx="516" cy="20" r="2.8" fill="#94A3B8" opacity="0.5" />
                <circle cx="568" cy="58" r="3" fill="#CBD5E1" />
              </svg>
            ))}
          </div>

          {/* Bottom Road Edge */}
          <div className="absolute bottom-0 inset-x-0 h-2 bg-slate-300/80" />
        </div>

        {/* Cute Flat-Vector FrozenBergerak Delivery Van driving on the road */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[38px] sm:bottom-[46px] z-20">
          <div className="animate-[gentleGlide_3.2s_ease-in-out_infinite]">
            <div className="animate-[bounceTruck_0.7s_ease-in-out_infinite]">
              <svg
                viewBox="0 0 210 112"
                className="w-36 sm:w-44 h-auto drop-shadow-[0_6px_10px_rgba(15,23,42,0.18)]"
                fill="none"
                aria-hidden="true"
              >
                {/* Ground Shadow */}
                <ellipse cx="112" cy="103" rx="68" ry="6" fill="#0F172A" opacity="0.16" />

                {/* Speed Motion Lines (Left) */}
                <g className="animate-[speedStreak_0.65s_ease-out_infinite]">
                  <rect x="6" y="42" width="22" height="5" rx="2.5" fill="#38BDF8" />
                  <rect x="12" y="54" width="18" height="5" rx="2.5" fill="#0284C7" />
                  <rect x="2" y="66" width="26" height="5" rx="2.5" fill="#F59E0B" />
                </g>

                {/* Van Cargo Box (Icy Cool Blue) */}
                <rect
                  x="38"
                  y="24"
                  width="96"
                  height="64"
                  rx="12"
                  fill="#0EA5E9"
                  stroke="#0F172A"
                  strokeWidth="4.5"
                />
                {/* Cargo Lower Stripe */}
                <path
                  d="M40 70h92v8a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-8z"
                  fill="#0284C7"
                />

                {/* Cute Snowflake Emblem on Cargo Box */}
                <g transform="translate(86, 51)" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round">
                  <line x1="0" y1="-14" x2="0" y2="14" />
                  <line x1="-12" y1="-7" x2="12" y2="7" />
                  <line x1="12" y1="-7" x2="-12" y2="7" />
                  <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
                </g>

                {/* Delivery Cab Front (Friendly Rounded Navy/Sky Cab) */}
                <path
                  d="M134 38h27c9 0 16 6 19 14l7 16c1.5 3.5 2 7 2 11v2a7 7 0 0 1-7 7h-48V38z"
                  fill="#38BDF8"
                  stroke="#0F172A"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />

                {/* Cab Windshield */}
                <path
                  d="M144 46h16c5.5 0 10 3.6 12 8.5l4 10.5H144V46z"
                  fill="#E0F2FE"
                  stroke="#0F172A"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Windshield Shine */}
                <path d="M150 51l6 10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

                {/* Door Handle */}
                <rect x="143" y="71" width="9" height="3.5" rx="1.75" fill="#0F172A" />

                {/* Warm Amber Headlight & Taillight */}
                <rect x="180" y="69" width="9" height="7" rx="3" fill="#F59E0B" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="35" y="71" width="7" height="7" rx="2.5" fill="#F97316" stroke="#0F172A" strokeWidth="2.5" />

                {/* Front & Rear Bumpers */}
                <rect x="32" y="83" width="160" height="7" rx="3.5" fill="#1E3A8A" stroke="#0F172A" strokeWidth="3" />

                {/* Rear Wheel */}
                <g transform="translate(70, 91)">
                  <circle cx="0" cy="0" r="14" fill="#0F172A" />
                  <circle cx="0" cy="0" r="7.5" fill="#E2E8F0" />
                  <circle cx="0" cy="0" r="3" fill="#2563EB" />
                </g>

                {/* Front Wheel */}
                <g transform="translate(158, 91)">
                  <circle cx="0" cy="0" r="14" fill="#0F172A" />
                  <circle cx="0" cy="0" r="7.5" fill="#E2E8F0" />
                  <circle cx="0" cy="0" r="3" fill="#2563EB" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
