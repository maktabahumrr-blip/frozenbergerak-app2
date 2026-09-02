import React, { useState } from "react";
import { Download, X, Share, PlusSquare, Check } from "lucide-react";

interface InstallPwaBannerProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("pwa_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Only show banner if installable or on iOS browser
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    const success = await onInstall();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => setDismissed(true), 3000);
    }
  };

  return (
    <>
      {/* Sleek Bottom PWA Install Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-blue-900/50 px-4 py-2.5 shadow-md relative z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo FrozenBergerak"
              className="w-9 h-9 object-contain flex-shrink-0"
            />
            <div>
              <p className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Pasang Aplikasi FrozenBergerak</span>
                <span className="bg-blue-500/30 text-blue-300 text-[10px] uppercase font-black px-1.5 py-0.2 rounded border border-blue-400/30">
                  PWA
                </span>
              </p>
              <p className="text-slate-300 text-xs hidden sm:block">
                Akses katalog lebih pantas terus dari skrin utama telefon anda, lengkap dengan mod luar talian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {installedSuccess ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-xs">
                <Check className="w-3.5 h-3.5" /> Berjaya Dipasang
              </span>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? "Cara Pasang" : "Pasang Sekarang"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Tutup notis pasang aplikasi"
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
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
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ikuti langkah mudah ini untuk memasang FrozenBergerak pada skrin utama peranti Apple anda:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tekan butang <strong className="text-blue-600 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline" /> Kongsi (Share)</strong> pada bar pelayar Safari.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tatal ke bawah dan pilih <strong className="text-blue-600 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> "Add to Home Screen" (Tambah ke Skrin Utama)</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <p className="pt-0.5 text-slate-700">
                  Tekan <strong>"Add"</strong> di bahagian atas kanan untuk selesai!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs transition-all"
            >
              Faham & Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
