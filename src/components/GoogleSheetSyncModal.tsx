import React, { useState, useEffect } from "react";
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Database,
  Layers,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { extractSheetId, getSheetCsvEndpoints } from "../data/catalogData";

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: string;
  totalProducts: number;
  onSyncComplete: (newSheetUrl?: string) => Promise<void>;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  currentSource,
  totalProducts,
  onSyncComplete,
}) => {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("custom_google_sheet_url") || "";
      setSheetUrl(saved);
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    try {
      setIsSyncing(true);
      setMessage(null);
      const clean = sheetUrl.trim();
      if (clean) {
        localStorage.setItem("custom_google_sheet_url", clean);
      } else {
        localStorage.removeItem("custom_google_sheet_url");
      }

      await onSyncComplete(clean);
      setMessage({
        type: "success",
        text: "Katalog berjaya disegerakkan terus daripada Google Sheet!"
      });
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Gagal menyegerakkan Google Sheet. Sila semak pautan atau tetapan perkongsian (Anyone with the link)."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setIsSyncing(true);
      localStorage.removeItem("custom_google_sheet_url");
      setSheetUrl("");
      await onSyncComplete("");
      setMessage({
        type: "success",
        text: "Katalog telah ditetapkan semula kepada 41 produk piawai FrozenBergerak."
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Ralat berlaku." });
    } finally {
      setIsSyncing(false);
    }
  };

  const detectedId = sheetUrl ? extractSheetId(sheetUrl) : "";
  const endpoints = detectedId ? getSheetCsvEndpoints(detectedId) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Penyegerakan Google Sheet</h2>
              <p className="text-xs text-emerald-100">
                Pautan terus ke data Google Sheets (Eksport CSV Langsung)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-700 text-sm">
          
          {/* Status banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="font-semibold text-emerald-900 text-xs">Status Katalog Semasa</div>
                <div className="text-xs text-emerald-700">
                  {totalProducts} produk aktif ({currentSource})
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
              Live Ready
            </span>
          </div>

          {/* Form input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Pautan Google Sheet / ID Spreadsheet
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="cth: https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit atau pautan CSV"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Pastikan akses perkongsian Google Sheet ialah <strong>"Anyone with the link can view"</strong>.
            </p>
          </div>

          {detectedId && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="text-slate-500 font-medium">Spreadsheet ID Dikesan:</div>
              <div className="font-mono text-[11px] text-slate-800 break-all select-all font-semibold">
                {detectedId}
              </div>
            </div>
          )}

          {/* Column mapping information */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Pemetaan Kolum Spreadsheet
              </span>
              <span className="text-[10px] font-normal text-slate-500">Auto-dikesan</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">ID</span>
                <span className="text-slate-500">Kod Produk (FB001)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">PRODUK</span>
                <span className="text-slate-500">Nama Makanan Beku</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">KATEGORI</span>
                <span className="text-slate-500">Pau, Dimsum, Kuih, dll</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">HARGA & PROMO</span>
                <span className="text-slate-500">RM 15, RM 20, dll</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">GAMBAR SIAP MASAK</span>
                <span className="text-slate-500">Pautan Google Drive (Auto-CDN)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">GAMBAR PACKAGING</span>
                <span className="text-slate-500">Foto pek bungkusan sebenar</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">PENERANGAN</span>
                <span className="text-slate-500">Biji / pek & cara masak</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-900 block">STATUS</span>
                <span className="text-slate-500">AVAILABLE / HABIS</span>
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isSyncing}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Guna Katalog Asal
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyegerakkan..." : "Simpan & Segarkan"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
