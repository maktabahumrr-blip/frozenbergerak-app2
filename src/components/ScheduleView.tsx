import React, { useState, useEffect, useMemo } from "react";
import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2, 
  Lock, 
  Bell, 
  BellRing, 
  Send, 
  MessageSquareQuote, 
  RefreshCw,
  Truck,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { ScheduleItem, StoreConfig } from "../types";
import { TeamScheduleModal } from "./TeamScheduleModal";
import { NotificationModal } from "./NotificationModal";
import { 
  isPushNotificationSupported, 
  getExistingPushSubscription, 
  subscribeUserToPush,
  sendTestPushNotification
} from "../utils/pushNotifications";
import { getFilteredTodaySchedules, getTodayDateInfo } from "../utils/scheduleDateHelper";

interface ScheduleViewProps {
  storeConfig: StoreConfig | null;
  onNavigateToCatalog: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  storeConfig,
  onNavigateToCatalog,
}) => {
  const whatsappNumber = storeConfig?.whatsappNumber || "60123456789";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  // Schedule & Push Notification States
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(false);
  const [scheduleSource, setScheduleSource] = useState<string>("local_cache");
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  // Dynamic automatic date calculation for today
  const todayInfo = useMemo(() => getTodayDateInfo(), []);
  const todaySchedules = useMemo(() => getFilteredTodaySchedules(schedules, 10), [schedules]);

  // Pending Team Approvals state for Admin alert
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [teamModalInitialTab, setTeamModalInitialTab] = useState<"manage" | "approvals">("manage");

  const loadSchedules = () => {
    setIsScheduleLoading(true);
    fetch("/api/schedule")
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        if (!text) return null;
        const trimmed = text.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return null;
        }
        try {
          return JSON.parse(trimmed);
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (data && data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
          setSchedules(data.schedules);
        }
        if (data && data.source) {
          setScheduleSource(data.source);
        }
      })
      .catch(() => {
        // Silently preserve existing data without throwing raw error to users
      })
      .finally(() => {
        setIsScheduleLoading(false);
      });
  };

  useEffect(() => {
    loadSchedules();

    // Check approvals status
    const checkApprovals = () => {
      fetch("/api/auth/approvals-status")
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        })
        .then((data) => {
          if (data && data.success && typeof data.pendingCount === "number") {
            setPendingApprovalsCount(data.pendingCount);
          }
        })
        .catch(() => {});
    };

    checkApprovals();
    const interval = setInterval(checkApprovals, 8000);

    if (isPushNotificationSupported()) {
      getExistingPushSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
      });
    }

    return () => clearInterval(interval);
  }, []);

  const handleQuickSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const result = await subscribeUserToPush();
      if (result.success) {
        setIsPushSubscribed(true);
      } else {
        setIsNotificationModalOpen(true);
      }
    } catch (err) {
      console.warn("Push subscription failed:", err);
      setIsNotificationModalOpen(true);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleQuickTest = async () => {
    setIsTestingPush(true);
    try {
      const result = await sendTestPushNotification();
      if (!result.success) {
        setIsNotificationModalOpen(true);
      }
    } catch (err) {
      console.warn("Push test failed:", err);
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div id="schedule-view-container" className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold text-blue-200">
            <Truck className="w-3.5 h-3.5 text-blue-300" />
            <span>Penghantaran Terus Ke Pintu Rumah</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Jadual Pergerakan Pasukan
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Semak laluan, masa penghantaran dan status pergerakan kenderaan FrozenBergerak hari ini ({todayInfo.formattedLong}).
              </p>
            </div>

            {/* Team / Admin Login Button */}
            <button
              type="button"
              onClick={() => {
                setEditingSchedule(null);
                setIsTeamModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 flex-shrink-0 self-start sm:self-auto cursor-pointer"
              title="Akses khas Pasukan & Pentadbir"
            >
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Akses Pasukan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Push Notification Opt-in Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isPushSubscribed 
          ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200" 
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPushSubscribed ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
            }`}>
              {isPushSubscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5 animate-bounce" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {isPushSubscribed ? "Notifikasi Telefon Aktif" : "Dapatkan Notifikasi Jadual Terus Ke Telefon"}
                </span>
                {isPushSubscribed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    PWA Push
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isPushSubscribed 
                  ? "Anda akan menerima notifikasi setiap kali pasukan membuat pergerakan atau jadual dikemaskini walaupun aplikasi ditutup." 
                  : "Aktifkan untuk terima notifikasi automatik pada telefon bila pasukan tiba di kawasan anda."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 flex-wrap">
            {isPushSubscribed ? (
              <>
                <button
                  type="button"
                  onClick={handleQuickTest}
                  disabled={isTestingPush}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Hantar notifikasi ujian ke telefon ini sekarang"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingPush ? "Menguji..." : "Uji Notifikasi"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Urus
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleQuickSubscribe}
                disabled={isSubscribing}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>{isSubscribing ? "Mengaktifkan..." : "Aktifkan Notifikasi"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Schedule Content List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg tracking-tight">
                Laluan &amp; Sesi Hari Ini ({todayInfo.formattedShort})
              </h2>
              <span className="text-xs text-slate-500">
                Data diselaraskan secara langsung bersama tab JADUAL Google Sheets.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSchedules}
            disabled={isScheduleLoading}
            className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Muat semula jadual"
          >
            <RefreshCw className={`w-4 h-4 ${isScheduleLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Schedule list */}
        {todaySchedules.length > 0 ? (
          <div className="space-y-3.5">
            {todaySchedules.map((item) => {
              const statusStr = String(item.status || "").toLowerCase();
              const isMoving = statusStr.includes("sedang") || statusStr.includes("bergerak");
              const isDone = statusStr.includes("selesai") || statusStr.includes("tamat");
              const isUpcoming = !isMoving && !isDone;
              const hasTeamName = Boolean(item.teamName && item.teamName.trim());

              return (
                <div 
                  key={item.id} 
                  className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                    isMoving 
                      ? "bg-emerald-50/40 border-emerald-200" 
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Row 1: Tarikh, Team & Status Badge */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                        {item.date}
                      </span>
                      {hasTeamName && (
                        <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          {item.teamName}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isMoving && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          Sedang Bergerak
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Akan Datang
                        </span>
                      )}
                      {isDone && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          Selesai
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Kawasan Pergerakan */}
                  <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 font-semibold bg-white p-3 rounded-xl border border-slate-150">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Kawasan / Laluan Pergerakan:
                      </span>
                      <span className="text-slate-900 font-bold">{item.locations || "Kawasan Perkhidmatan"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800">
              Waktu Operasi &amp; Penghantaran Standard
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Pasukan bersedia membuat penghantaran setiap hari ({storeConfig?.operatingHours || "8:00 PG - 10:00 MLM"}). Sila tempah slot kawasan anda lebih awal.
            </p>
          </div>
        )}

        {/* WhatsApp Slot Booking CTA */}
        <div className="pt-2">
          <a
            href={`https://wa.me/${cleanNumber}?text=${encodeURIComponent("Salam FrozenBergerak, saya ingin membuat pertanyaan jadual pergerakan atau menempah slot penghantaran di kawasan saya.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <MessageSquareQuote className="w-4 h-4" />
            <span>Tempah Slot Kawasan / Chat WhatsApp Pasukan</span>
          </a>
        </div>
      </div>

      {/* Coverage Areas Card */}
      <div className="p-5 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Kawasan Liputan Aktif:</strong> Negeri Sembilan • Selangor • Kuala Lumpur
          </span>
        </div>
        <button
          type="button"
          onClick={onNavigateToCatalog}
          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>Pilih Produk di Katalog ➔</span>
        </button>
      </div>

      {/* Team Schedule Management & Push Trigger Modal */}
      <TeamScheduleModal
        isOpen={isTeamModalOpen}
        initialTab={teamModalInitialTab}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingSchedule(null);
        }}
        onScheduleUpdated={() => {
          loadSchedules();
        }}
        existingSchedule={editingSchedule}
      />

      {/* Customer Push Notification Preferences Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          if (isPushNotificationSupported()) {
            getExistingPushSubscription().then((sub) => {
              setIsPushSubscribed(Boolean(sub));
            });
          }
        }}
      />
    </div>
  );
};
