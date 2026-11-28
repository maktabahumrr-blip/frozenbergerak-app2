import React from "react";
import { MapPin, Clock, ShieldCheck } from "lucide-react";
import { StoreConfig } from "../types";

interface FooterProps {
  config: StoreConfig | null;
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ config, compact = false }) => {
  const currentYear = new Date().getFullYear();

  if (compact) {
    return (
      <footer id="main-footer" className="bg-slate-900 text-slate-300 py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-[11px] font-medium text-slate-300">
            100% Halal • Simpan -18°C • 8 PG–10 MLM
          </p>
          <p className="text-[11px] text-slate-400">
            © {currentYear} FrozenBergerak
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-300 pt-10 pb-8 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-800">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white p-1 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo FrozenBergerak"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Frozen<span className="text-blue-400">Bergerak</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {config?.tagline || "Katalog makanan beku berkualiti tinggi terus ke rumah anda dengan kualiti kesegaran terjamin."}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" />
                100% Halal
              </span>
            </div>
          </div>

          {/* Operating Hours, Coverage & Delivery Info */}
          <div className="space-y-3 text-xs text-slate-400">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Penghantaran &amp; Pesanan
            </h4>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>{config?.operatingHours || "Setiap Hari: 8:00 PG - 10:00 MLM"}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Penghantaran: Negeri Sembilan • Selangor • Kuala Lumpur</span>
              </div>
            </div>

            <p className="leading-relaxed pt-1">
              Pilih produk yang anda inginkan, tekan <strong className="text-slate-200">Pesan Sekarang</strong> atau kumpulkan ke senarai pesanan untuk memilih kawasan dan agen penghantaran kami.
            </p>

            <div>
              <span className="text-[11px] text-blue-400 font-medium">
                • Simpan dalam suhu sejuk beku (-18°C) untuk kesegaran optimum.
              </span>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p>© {currentYear} FrozenBergerak. Hak Cipta Terpelihara.</p>
          <p className="text-[11px]">
            delivertoyourdoorstep • Pesanan Pantas Melalui WhatsApp
          </p>
        </div>
      </div>
    </footer>
  );
};
