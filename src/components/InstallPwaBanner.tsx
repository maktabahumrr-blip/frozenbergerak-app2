import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Share, PlusSquare, Check, Smartphone, MoreVertical } from "lucide-react";

interface InstallPwaBannerProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
  guideMode?: "ios" | "browser" | null;
  onCloseGuide?: () => void;
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
  guideMode = null,
  onCloseGuide,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [localGuideMode, setLocalGuideMode] = useState<"ios" | "browser" | null>(null);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  const activeGuide = guideMode || localGuideMode;

  const closeGuide = () => {
    setLocalGuideMode(null);
    if (onCloseGuide) onCloseGuide();
  };

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => setDismissed(true), 3000);
    } else if (!onCloseGuide) {
      setLocalGuideMode(isIOS ? "ios" : "browser");
    }
  };

  const modals = activeGuide ? (
    <>
      {activeGuide === "ios" && (
        <div className="fixed inset-0 z-[999] bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0" onClick={closeGuide} />
          <div className="relative z-10 bg-white text-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.svg"
                  alt="Logo FrozenBergerak"
                  className="w-9 h-9 object-contain"
                />
                <h3 className="font-bold text-slate-900 text-base">
                  Pasang di iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={closeGuide}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ikuti 3 langkah mudah ini untuk memasang aplikasi FrozenBergerak pada skrin utama peranti Apple anda:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <p className="pt-0.5 text-slate-700">
                  Buka laman ini di pelayar <strong>Safari</strong> dan tekan butang <strong className="text-blue-600 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline" /> Kongsi (Share)</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tatal ke bawah dan pilih <strong className="text-blue-600 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> &quot;Add to Home Screen&quot; (Tambah ke Skrin Utama)</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tekan <strong>&quot;Add&quot;</strong> di bahagian atas kanan untuk selesai!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeGuide}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              Faham &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {activeGuide === "browser" && (
        <div className="fixed inset-0 z-[999] bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0" onClick={closeGuide} />
          <div className="relative z-10 bg-white text-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Pasang ke Skrin Utama
                </h3>
              </div>
              <button
                type="button"
                onClick={closeGuide}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ikuti langkah mudah ini untuk memasang aplikasi <strong>FrozenBergerak</strong> pada skrin utama peranti anda:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tekan butang menu pelayar <strong className="text-blue-600 inline-flex items-center gap-0.5"><MoreVertical className="w-3.5 h-3.5 inline" /> (3 titik)</strong> di penjuru atas kanan Chrome / Edge.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <p className="pt-0.5 text-slate-700">
                  Pilih <strong className="text-blue-600">&quot;Add to Home screen&quot;</strong> atau <strong className="text-blue-600">&quot;Install app&quot;</strong> (Pasang aplikasi).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tekan <strong>&quot;Install / Add&quot;</strong> — ikon FrozenBergerak akan terus muncul di skrin utama telefon anda!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeGuide}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              Faham &amp; Tutup
            </button>
          </div>
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      {!isInstalled && !dismissed && (
        <div
          id="pwa-install-banner"
          className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white border-b border-blue-500/50 px-3 sm:px-4 py-2.5 shadow-md relative z-50"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">Pasang Aplikasi FrozenBergerak</span>
                  <span className="bg-white/20 text-white text-[10px] uppercase font-black px-1.5 py-0.5 rounded border border-white/25 shrink-0">
                    PWA
                  </span>
                </p>
                <p className="text-blue-100 text-[11px] sm:text-xs truncate">
                  Tambah ke skrin utama telefon untuk akses pantas &amp; mod luar talian.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {installedSuccess ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-xs">
                  <Check className="w-3.5 h-3.5" /> Berjaya Dipasang
                </span>
              ) : (
                <button
                  id="pwa-banner-install-cta"
                  type="button"
                  onClick={handleInstallClick}
                  className="bg-white hover:bg-blue-50 active:scale-95 text-blue-700 font-extrabold text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>{isIOS ? "Cara Pasang" : isInstallable ? "Pasang Sekarang" : "Pasang App"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Tutup notis pasang aplikasi"
                className="text-blue-100 hover:text-white p-1 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {typeof document !== "undefined" && modals ? createPortal(modals, document.body) : null}
    </>
  );
};
