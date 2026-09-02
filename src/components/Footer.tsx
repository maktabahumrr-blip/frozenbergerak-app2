import React from "react";
import { Phone, MapPin, Clock, ShieldCheck, Database } from "lucide-react";
import { StoreConfig } from "../types";

interface FooterProps {
  config: StoreConfig | null;
}

export const Footer: React.FC<FooterProps> = ({ config }) => {
  const currentYear = new Date().getFullYear();
  const cleanNumber = config?.whatsappNumber.replace(/[^0-9]/g, "") || "60123456789";

  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-300 pt-10 pb-8 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Logo FrozenBergerak"
                className="w-10 h-10 object-contain"
              />
              <span className="font-bold text-lg text-white tracking-tight">
                Frozen<span className="text-blue-400">Bergerak</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {config?.tagline || "Katalog makanan beku berkualiti tinggi terus ke rumah anda dengan kualiti kesegaran terjamin."}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" />
                100% Halal
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                <Database className="w-3 h-3" />
                Google Sheets Ready
              </span>
            </div>
          </div>

          {/* Contact & Hours */}
          <div className="space-y-2.5 text-xs text-slate-400">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Hubungi & Tempahan
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400">WhatsApp: </span>
                  <a
                    href={`https://wa.me/${cleanNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-semibold hover:underline"
                  >
                    +{cleanNumber}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>{config?.operatingHours || "Setiap Hari: 8:00 PG - 10:00 MLM"}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Penghantaran: Negeri Sembilan • Selangor • Kuala Lumpur</span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="space-y-2.5 text-xs text-slate-400">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Penghantaran & Pesanan
            </h4>
            <p className="leading-relaxed">
              Pilih produk yang anda inginkan, tekan butang WhatsApp atau kumpulkan ke senarai pesanan untuk dihantar terus ke nombor rasmi kami.
            </p>
            <div className="pt-1">
              <span className="text-[11px] text-blue-400 font-medium">
                • Simpan dalam suhu sejuk beku (-18°C) untuk kesegaran optimum.
              </span>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p>© {currentYear} FrozenBergerak. Hak Cipta Terpelihara.</p>
          <p className="text-[11px]">
            delivertoyourdoorstep • Pesanan Pantas Melalui WhatsApp
          </p>
        </div>
      </div>
    </footer>
  );
};
