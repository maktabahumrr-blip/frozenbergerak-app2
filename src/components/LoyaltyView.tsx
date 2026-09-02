import React, { useState } from "react";
import { 
  Gift, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  MessageSquareQuote, 
  HelpCircle,
  Phone,
  ShieldCheck,
  Star
} from "lucide-react";
import { StoreConfig } from "../types";

interface LoyaltyViewProps {
  storeConfig: StoreConfig | null;
  onNavigateToCatalog: () => void;
}

export const LoyaltyView: React.FC<LoyaltyViewProps> = ({
  storeConfig,
  onNavigateToCatalog,
}) => {
  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  const [simulatedStamps, setSimulatedStamps] = useState<number>(3);

  return (
    <div id="loyalty-view-container" className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Hero Banner */}
      <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold text-amber-300">
            <Gift className="w-3.5 h-3.5" />
            <span>Ganjaran Pelanggan Setia FrozenBergerak</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Program Stamp Loyalti Digital
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 max-w-xl leading-relaxed">
            Kumpul stamp digital bagi setiap pesanan makanan sejuk beku. Cukup 10 stamp untuk tebus hidangan percuma atau diskaun istimewa!
          </p>
        </div>
      </div>

      {/* Digital Stamp Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg tracking-tight">
                Kad Stamp Digital Anda
              </h2>
              <span className="text-xs text-slate-500">
                1 Pesanan Penghantaran = 1 Stamp Digital
              </span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold self-start sm:self-auto flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>10 Stamp = 1 Hadiah Percuma</span>
          </div>
        </div>

        {/* 10 Stamp Grid */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Kemajuan Stamp Semasa:</span>
            <span className="font-extrabold text-amber-400 text-sm">
              {simulatedStamps} / 10 Stamp
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${(simulatedStamps / 10) * 100}%` }}
            />
          </div>

          {/* Stamp slots */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => {
              const isCollected = slot <= simulatedStamps;
              const isRewardSlot = slot === 10;

              return (
                <div
                  key={`stamp-slot-view-${slot}`}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
                    isCollected
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-300 text-white shadow-md scale-102"
                      : isRewardSlot
                      ? "bg-amber-400/10 border-dashed border-amber-400/60 text-amber-300"
                      : "bg-white/5 border-dashed border-white/20 text-slate-400"
                  }`}
                >
                  {isCollected ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  ) : isRewardSlot ? (
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 animate-pulse" />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-slate-300">{slot}</span>
                  )}
                  <span className="text-[9px] font-bold mt-0.5 leading-none">
                    {isRewardSlot ? "FREE" : `Stamp ${slot}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-blue-200">
              *Stamp direkodkan secara automatik melalui nombor telefon yang anda gunakan semasa memesan di WhatsApp.
            </span>
          </div>
        </div>

        {/* How it works steps */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span>Cara Mudah Mengumpul &amp; Menebus Stamp:</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">1</span>
              <h4 className="font-bold text-slate-900">Pesan Makanan Beku</h4>
              <p className="text-slate-500 text-[11px]">
                Buat pesanan sejuk beku kegemaran anda melalui WhatsApp atau katalog aplikasi.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">2</span>
              <h4 className="font-bold text-slate-900">Dapatkan 1 Stamp</h4>
              <p className="text-slate-500 text-[11px]">
                Pasukan kami akan merekodkan 1 stamp digital ke akaun nombor telefon anda bagi setiap pesanan.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs">3</span>
              <h4 className="font-bold text-slate-900">Tebus Ganjaran Percuma</h4>
              <p className="text-slate-500 text-[11px]">
                Selepas mencapai 10 stamp, pilih 1 pek hidangan percuma atau baucar potongan harga!
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Check / Claim Button */}
        <div className="pt-3 flex flex-col sm:flex-row gap-3">
          <a
            href={`https://wa.me/${cleanNumber}?text=${encodeURIComponent("Salam FrozenBergerak! Saya ingin menyemak baki stamp loyalti atau membuat pesanan baharu untuk kumpul stamp.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Phone className="w-4 h-4" />
            <span>Semak Status Stamp di WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs"
          >
            <span>Pesan Produk &amp; Kumpul Stamp ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
