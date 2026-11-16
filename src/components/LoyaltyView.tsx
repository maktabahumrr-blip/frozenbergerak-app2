import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  Gift, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Star,
  Clock,
  MessageCircle,
  ChevronDown,
  X,
  ExternalLink
} from "lucide-react";
import { StoreConfig } from "../types";
import { TEAM_WHATSAPP_CONTACTS } from "../data/deliveryAgents";

interface LoyaltyViewProps {
  storeConfig: StoreConfig | null;
  onNavigateToCatalog: () => void;
}

export const LoyaltyView: React.FC<LoyaltyViewProps> = ({
  storeConfig: _storeConfig,
  onNavigateToCatalog,
}) => {
  const [simulatedStamps] = useState<number>(3);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState<boolean>(false);

  const loyaltyWaMessage = encodeURIComponent(
    "Salam FrozenBergerak! Saya ingin menyemak status stamp loyalti atau membuat pesanan baharu untuk kumpul stamp."
  );

  const teamModal = isTeamMenuOpen ? (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loyalty-team-wa-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => setIsTeamMenuOpen(false)}
      />

      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <h3 id="loyalty-team-wa-title" className="text-sm sm:text-base font-extrabold leading-tight">
                Pilih Team FrozenBergerak
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Pilih ahli team kami untuk semak status stamp di WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTeamMenuOpen(false)}
            aria-label="Tutup pilihan WhatsApp team"
            className="p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Member List */}
        <div className="p-4 pb-6 space-y-2.5 bg-slate-50/60">
          {TEAM_WHATSAPP_CONTACTS.map((member) => (
            <a
              key={member.id}
              id={`loyalty-wa-team-${member.id}`}
              href={`https://wa.me/${member.phone}?text=${loyaltyWaMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsTeamMenuOpen(false)}
              className="w-full p-3.5 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-400 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all group active:scale-98"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {member.name}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    +{member.phone}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 px-2.5 py-1.5 rounded-xl transition-colors shrink-0">
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div id="loyalty-view-container" className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold text-amber-300">
                <Gift className="w-3.5 h-3.5" />
                <span>Ganjaran Pelanggan Setia FrozenBergerak</span>
              </div>

              <span className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-extrabold shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Akan Datang (Coming Soon)</span>
              </span>
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
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-lg tracking-tight">
                    Kad Stamp Digital Anda
                  </h2>
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                    <Clock className="w-3 h-3" />
                    <span>Akan Datang (Coming Soon)</span>
                  </span>
                </div>
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
              <span className="font-semibold text-slate-300">Kemajuan Stamp Semasa (Pratonton):</span>
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
                *Fungsi Stamp Digital akan dilancarkan tidak lama lagi. Nantikan pengumuman rasmi daripada team FrozenBergerak.
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
                  Buat pesanan sejuk beku kegemaran anda melalui katalog aplikasi atau team kami.
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

          {/* WhatsApp Team Selector & Catalog CTA */}
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <button
              id="loyalty-whatsapp-team-btn"
              type="button"
              onClick={() => setIsTeamMenuOpen(true)}
              aria-expanded={isTeamMenuOpen}
              aria-haspopup="dialog"
              className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Semak Status Stamp di WhatsApp</span>
              <ChevronDown className="w-4 h-4 opacity-90" />
            </button>

            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <span>Pesan Produk &amp; Kumpul Stamp ➔</span>
            </button>
          </div>
        </div>
      </div>
      {typeof document !== "undefined" && teamModal ? createPortal(teamModal, document.body) : null}
    </>
  );
};
