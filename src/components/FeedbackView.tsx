import React, { useState } from "react";
import { 
  MessageSquareHeart, 
  Mail, 
  Send, 
  MessageSquareQuote, 
  Clock, 
  ShieldCheck, 
  CheckCircle2,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Phone
} from "lucide-react";
import { StoreConfig } from "../types";

interface FeedbackViewProps {
  storeConfig: StoreConfig | null;
  onNavigateToCatalog: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  storeConfig,
  onNavigateToCatalog,
}) => {
  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  const [feedbackType, setFeedbackType] = useState<"cadangan" | "aduan" | "pujian" | "lain">("cadangan");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = 
      feedbackType === "cadangan" ? "Cadangan Produk / Servis" :
      feedbackType === "aduan" ? "Aduan Kualiti / Penghantaran" :
      feedbackType === "pujian" ? "Pujian & Maklum Balas Positif" : "Maklum Balas Am";

    const subject = encodeURIComponent(`[${typeLabel}] Maklum Balas Pelanggan - ${customerName || "Pelanggan"}`);
    const body = encodeURIComponent(
      `Salam Pengurusan FrozenBergerak,\n\nJenis Maklum Balas: ${typeLabel}\nNama Pelanggan: ${customerName || "Tiada"}\nNo. Telefon: ${customerPhone || "Tiada"}\n\nKandungan Maklum Balas / Aduan / Cadangan:\n${message}\n\nTerima kasih.`
    );

    window.location.href = `mailto:frozenbergerak20@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSendWhatsApp = () => {
    const typeLabel = 
      feedbackType === "cadangan" ? "💡 Cadangan" :
      feedbackType === "aduan" ? "⚠️ Aduan" :
      feedbackType === "pujian" ? "👍 Pujian" : "💬 Maklum Balas";

    const waText = encodeURIComponent(
      `Salam Pengurusan FrozenBergerak,\n\n*${typeLabel} Pelanggan:*\nNama: ${customerName || "Pelanggan"}\n\n${message || "Saya ingin memberikan maklum balas berkaitan perkhidmatan FrozenBergerak."}`
    );

    window.open(`https://wa.me/${cleanNumber}?text=${waText}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div id="feedback-view-container" className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold text-purple-200">
            <MessageSquareHeart className="w-3.5 h-3.5" />
            <span>Suara &amp; Kepuasan Anda Keutamaan Kami</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Aduan &amp; Cadangan
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
            Kongsi pandangan, cadangan produk baharu, atau sebarang masalah perkhidmatan agar kami dapat terus memberikan mutu terbaik untuk anda.
          </p>
        </div>
      </div>

      {/* Main Feedback Form Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg tracking-tight">
              Borang Maklum Balas Rasmi
            </h2>
            <span className="text-xs text-slate-500">
              Dihantar terus ke emel rasmi <strong className="text-purple-700 font-mono">frozenbergerak20@gmail.com</strong>
            </span>
          </div>
        </div>

        {/* Feedback Type Selector Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Pilih Kategori Maklum Balas:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setFeedbackType("cadangan")}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                feedbackType === "cadangan"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Cadangan Produk</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType("aduan")}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                feedbackType === "aduan"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Aduan / Masalah</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType("pujian")}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                feedbackType === "pujian"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Pujian &amp; Servis</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType("lain")}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                feedbackType === "lain"
                  ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <MessageSquareQuote className="w-4 h-4" />
              <span>Lain-lain</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nama Anda (Pilihan):
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="cth: Puan Siti / Encik Rahman"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                No. Telefon / WhatsApp (Pilihan):
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="cth: 012-3456789"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Kandungan Maklum Balas / Aduan / Cadangan: <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan cadangan produk baharu yang anda ingin kami bawa, lokasi laluan yang dicadangkan, atau sebarang perkara yang boleh kami perbaiki..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Mail className="w-4 h-4 text-purple-400" />
              <span>Hantar Melalui Emel Rasmi</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Hantar Terus ke WhatsApp Pengurusan</span>
            </button>
          </div>
        </form>

        {/* Contact Info Footer */}
        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>Setiap maklum balas diteliti secara peribadi oleh pihak pengurusan FrozenBergerak.</span>
          </div>
          <span className="text-[11px] font-semibold text-purple-700">
            Waktu Maklum Balas: 8:00 PG - 10:00 MLM
          </span>
        </div>
      </div>
    </div>
  );
};
