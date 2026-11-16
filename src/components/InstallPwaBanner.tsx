import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X, Share, PlusSquare, Smartphone, MoreVertical, ExternalLink } from "lucide-react";

interface InstallPwaBannerProps {
  isInstallable?: boolean;
  isInstalled?: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean> | void;
  onNativeInstall?: () => Promise<boolean>;
  guideMode?: "ios" | "browser" | null;
  onCloseGuide?: () => void;
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({
  isInstallable = false,
  isIOS,
  onInstall,
  onNativeInstall,
  guideMode = null,
  onCloseGuide,
}) => {
  const [localGuideMode, setLocalGuideMode] = useState<"ios" | "browser" | null>(null);
  const [activeTab, setActiveTab] = useState<"browser" | "ios">(isIOS ? "ios" : "browser");

  const isModalOpen = Boolean(guideMode || localGuideMode);

  useEffect(() => {
    if (guideMode) {
      setActiveTab(guideMode);
    } else if (localGuideMode) {
      setActiveTab(localGuideMode);
    }
  }, [guideMode, localGuideMode]);

  const closeGuide = () => {
    setLocalGuideMode(null);
    if (onCloseGuide) onCloseGuide();
  };

  const handleOpenManualGuide = () => {
    const defaultMode: "ios" | "browser" = isIOS ? "ios" : "browser";
    setActiveTab(defaultMode);
    if (onCloseGuide) {
      void onInstall();
    } else {
      setLocalGuideMode(defaultMode);
    }
  };

  const handleTryNativePrompt = async () => {
    if (onNativeInstall) {
      const accepted = await onNativeInstall();
      if (accepted) {
        closeGuide();
      }
    }
  };

  const modals = isModalOpen ? (
    <div
      className="fixed inset-0 z-[999] bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-install-guide-title"
    >
      <div className="fixed inset-0" onClick={closeGuide} />
      <div className="relative z-10 bg-white text-slate-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="Logo FrozenBergerak"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <h3 id="manual-install-guide-title" className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Panduan Pasang Aplikasi
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tambah FrozenBergerak ke Skrin Utama
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeGuide}
            aria-label="Tutup panduan pasang aplikasi"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Tabs: Android/Chrome vs iPhone/Safari */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("browser")}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "browser"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Android / Chrome
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ios"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            iPhone / Safari
          </button>
        </div>

        {/* Optional 1-Click Direct Prompt if supported by current browser */}
        {isInstallable && onNativeInstall && (
          <button
            type="button"
            onClick={() => {
              void handleTryNativePrompt();
            }}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Pasang Terus Sekarang (1-Klik)</span>
          </button>
        )}

        {/* Step-by-Step Instructions */}
        {activeTab === "browser" ? (
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Pastikan anda membuka laman ini menggunakan pelayar <strong>Google Chrome</strong> atau <strong>Edge</strong> (jika dibuka dari pautan WhatsApp, tekan <strong className="inline-flex items-center gap-0.5 text-blue-600"><ExternalLink className="w-3 h-3 inline" /> Buka di Chrome</strong> dahulu).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Tekan ikon menu <strong className="text-blue-600 inline-flex items-center gap-0.5"><MoreVertical className="w-3.5 h-3.5 inline" /> (3 titik)</strong> di penjuru atas kanan pelayar.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Pilih <strong className="text-blue-600">&quot;Add to Home screen&quot;</strong> atau <strong className="text-blue-600">&quot;Install app&quot;</strong> (Pasang aplikasi), kemudian tekan <strong>&quot;Install / Add&quot;</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Buka laman ini menggunakan pelayar <strong>Safari</strong> di iPhone atau iPad anda.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Tekan butang <strong className="text-blue-600 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline" /> Kongsi (Share)</strong> di bahagian bawah atau atas skrin.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <p className="pt-0.5 text-slate-700 leading-relaxed">
                Tatal ke bawah, pilih <strong className="text-blue-600 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> &quot;Add to Home Screen&quot;</strong> dan tekan <strong>&quot;Add&quot;</strong> di penjuru atas kanan!
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={closeGuide}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          Faham &amp; Tutup
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Permanent Top Install Banner — Always visible across all mobile & desktop devices */}
      <div
        id="pwa-install-banner"
        className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white border-b border-blue-500/50 px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-md relative z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-white flex items-center gap-1.5 text-[11px] sm:text-sm leading-tight">
                <span className="truncate">Pasang Aplikasi FrozenBergerak</span>
                <span className="bg-white/20 text-white text-[9px] sm:text-[10px] uppercase font-black px-1.5 py-0.5 rounded border border-white/25 shrink-0">
                  APP
                </span>
              </p>
              <p className="text-blue-100 text-[10px] sm:text-xs truncate leading-tight mt-0.5">
                Klik untuk panduan tambah ke skrin utama telefon anda.
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              id="pwa-banner-install-cta"
              type="button"
              onClick={handleOpenManualGuide}
              className="bg-white hover:bg-blue-50 active:scale-95 text-blue-700 font-extrabold text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 rounded-full shadow-sm inline-flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Pasang App</span>
            </button>
          </div>
        </div>
      </div>

      {typeof document !== "undefined" && modals ? createPortal(modals, document.body) : null}
    </>
  );
};
