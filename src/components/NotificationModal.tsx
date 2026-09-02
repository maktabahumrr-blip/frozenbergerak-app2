import React, { useState, useEffect } from "react";
import { X, Bell, BellRing, BellOff, CheckCircle2, AlertCircle, Send, Smartphone, ShieldCheck, Sparkles } from "lucide-react";
import { 
  isPushNotificationSupported, 
  getNotificationPermission, 
  getExistingPushSubscription, 
  subscribeUserToPush, 
  unsubscribeUserFromPush,
  sendTestPushNotification 
} from "../utils/pushNotifications";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);
      setPermission(getNotificationPermission());

      if (supported) {
        getExistingPushSubscription().then((sub) => {
          setIsSubscribed(Boolean(sub));
        });
      }
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await subscribeUserToPush();
      setPermission(getNotificationPermission());

      if (result.success) {
        setIsSubscribed(true);
        setMessage({
          text: "Notifikasi berjaya diaktifkan! Anda akan menerima jadual pergerakan terus ke telefon walaupun aplikasi ditutup.",
          type: "success"
        });
      } else {
        setMessage({
          text: result.error || "Gagal mengaktifkan notifikasi.",
          type: "error"
        });
      }
    } catch (err: any) {
      setMessage({
        text: err?.message || "Ralat tidak dijangka berlaku.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeUserFromPush();
      if (success) {
        setIsSubscribed(false);
        setMessage({
          text: "Notifikasi telah dinyahaktifkan.",
          type: "info"
        });
      }
    } catch (err: any) {
      setMessage({
        text: err?.message || "Gagal menyahaktifkan notifikasi.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const result = await sendTestPushNotification();
      setMessage({
        text: result.message,
        type: result.success ? "success" : "error"
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Gagal menghantar notifikasi ujian.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                PWA True Push
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Notifikasi Pergerakan
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!isSupported ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Pelayar Tidak Menyokong Web Push</span>
              </div>
              <p>
                Pelayar ini tidak menyokong Web Push API secara natif. Sila buka aplikasi FrozenBergerak dalam Google Chrome (Android/Desktop) atau Safari (iOS 16.4+).
              </p>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Terima pemberitahuan segera pada skrin telefon anda setiap kali pasukan <strong className="text-slate-900">FrozenBergerak</strong> mengemaskini laluan pergerakan pasukan, masa tiba, dan stok istimewa di kawasan anda.
                </p>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Diterima Walaupun Aplikasi Ditutup</span>
                  </div>
                  <p className="text-slate-500 text-[11px] pl-6">
                    Sistem Push Notification PWA beroperasi di latar belakang menggunakan standard selamat Web Push.
                  </p>

                  <div className="flex items-center gap-2 text-slate-900 font-bold pt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Privasi &amp; Token Selamat</span>
                  </div>
                  <p className="text-slate-500 text-[11px] pl-6">
                    Hanya notifikasi jadual pergerakan dan promosi rasmi yang dihantar tanpa sebarang spam.
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Status Notifikasi:</span>
                {isSubscribed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Aktif &amp; Berdaftar
                  </span>
                ) : permission === "denied" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Disekat Pelayar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                    <BellOff className="w-3.5 h-3.5 text-slate-500" />
                    Belum Dibenarkan
                  </span>
                )}
              </div>

              {/* Message Banner */}
              {message && (
                <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 font-medium ${
                  message.type === "success" 
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
                    : message.type === "error"
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
                }`}>
                  {message.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />}
                  {message.type === "error" && <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />}
                  {message.type === "info" && <Bell className="w-4 h-4 flex-shrink-0 text-blue-600" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {!isSubscribed ? (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{loading ? "Sedang Memproses..." : "Aktifkan Push Notification Sekarang"}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={loading}
                      className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{loading ? "Menghantar..." : "Hantar Notifikasi Ujian Ke Telefon Ini"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnsubscribe}
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <BellOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nyahaktifkan Notifikasi</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
