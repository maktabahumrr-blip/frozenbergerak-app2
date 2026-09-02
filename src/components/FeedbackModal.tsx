import React, { useState } from "react";
import { X, MessageSquareHeart, Mail, ShieldCheck } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  feedbackFormUrl?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [feedbackText, setFeedbackText] = useState("");

  if (!isOpen) return null;

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Aduan / Cadangan FrozenBergerak");
    const body = encodeURIComponent(
      `Salam FrozenBergerak,\n\nSaya ingin mengemukakan maklum balas berikut:\n\n${feedbackText || "(Sila tulis aduan atau cadangan anda di sini)"}\n`
    );
    window.location.href = `mailto:frozenbergerak20@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 border border-slate-200 p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-xs border border-purple-100">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">
                Aduan / Cadangan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pihak pengurusan FrozenBergerak sedia mendengar maklum balas anda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Info */}
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-900 text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Komitmen Kualiti FrozenBergerak</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Kami sentiasa mengalu-alukan sebarang pandangan, cadangan produk baharu, atau aduan kualiti &amp; perkhidmatan untuk penambahbaikan berterusan.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback-input" className="block text-xs font-bold text-slate-700">
              Tulis Maklum Balas / Cadangan Anda:
            </label>
            <textarea
              id="feedback-input"
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tuliskan cadangan produk baharu, aduan kualiti atau maklum balas anda..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none resize-none"
            />
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-purple-600" />
            <span>Email Penerima: <strong className="text-slate-700">frozenbergerak20@gmail.com</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSendEmail}
            className="w-full sm:flex-1 py-3 px-5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4 text-purple-400" />
            <span>Buka Email &amp; Hantar Maklum Balas</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
