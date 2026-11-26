import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CalendarDays,
  Truck,
  Store,
  User,
  Phone,
  MapPin,
  FileText,
  MessageCircle,
  Send,
  AlertCircle,
  Info
} from "lucide-react";
import { AgentContact, DeliveryArea } from "../types";
import { AreaAgentSelector } from "./AreaAgentSelector";
import { generateSlotBookingWhatsAppUrl } from "../utils/formatters";
import { formatIsoDateMalay, getLocalTodayIso } from "../utils/scheduleDateHelper";

interface SlotBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
  isOpen,
  onClose,
  title = "Tempah Slot Anda Sekarang",
  subtitle = "Rancang tarikh penghantaran pilihan anda & pilih agen kawasan bertugas."
}) => {
  const todayIso = getLocalTodayIso();
  const [plannedDate, setPlannedDate] = useState<string>(todayIso);
  const [selectedArea, setSelectedArea] = useState<DeliveryArea | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentContact | null>(null);
  const [deliveryType, setDeliveryType] = useState<"penghantaran" | "ambil_sendiri">("penghantaran");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setPlannedDate(getLocalTodayIso());
      // Explicitly reset agent & area to null so it NEVER defaults to Husna
      setSelectedArea(null);
      setSelectedAgent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = Boolean(plannedDate && selectedArea && selectedAgent);

  const handleSetTomorrow = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    setPlannedDate(getLocalTodayIso(tmr));
  };

  const handleWhatsAppBooking = () => {
    if (!selectedArea || !selectedAgent || !plannedDate) return;
    const url = generateSlotBookingWhatsAppUrl({
      agentPhone: selectedAgent.phone,
      agentName: selectedAgent.name,
      areaName: selectedArea.name,
      plannedDate,
      customerName,
      customerPhone,
      address,
      deliveryType,
      notes
    });
    window.open(url, "_blank");
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[990] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-booking-title"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <h3 id="slot-booking-title" className="text-base sm:text-lg font-extrabold leading-tight flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{title}</span>
            </h3>
            <p className="text-[13px] text-blue-100 leading-snug">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tempahan slot"
            className="p-2 rounded-full text-blue-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4 bg-slate-50/60">
          {/* Operational Note Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-[13px] text-amber-950 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-amber-900">Nota Operasi Penghantaran:</strong>
              <span>Penghantaran terus ke rumah (Delivery). Tiada servis self-pickup bebas. Pickup khas: Sebelum jam 11:00 pagi sahaja.</span>
            </div>
          </div>

          {/* 1. Tarikh Tempahan Pilihan */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label htmlFor="slot-planned-date" className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>1. Pilih Tarikh Rancangan Anda:</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlannedDate(todayIso)}
                  className="px-3 py-1.5 text-[13px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSetTomorrow}
                  className="px-3 py-1.5 text-[13px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Esok
                </button>
              </div>
            </div>

            <input
              id="slot-planned-date"
              type="date"
              min={todayIso}
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {plannedDate && (
              <div className="text-[13px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                Tarikh dipilih: <strong>{formatIsoDateMalay(plannedDate)}</strong>
              </div>
            )}
          </div>

          {/* 2. Kawasan & Pemilihan Agen Manual */}
          <AreaAgentSelector
            selectedArea={selectedArea}
            selectedAgent={selectedAgent}
            onSelectArea={(area) => {
              setSelectedArea(area);
              // Clear agent so customer must manually choose
              setSelectedAgent(null);
            }}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            label="2. Pilih Kawasan & Agen Bertugas (Manual)"
            showRequiredBadge={true}
            idPrefix="slot-booking"
          />

          {/* 3. Kaedah & Maklumat Ringkas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-sm font-bold text-slate-800">
              3. Kaedah &amp; Maklumat Pelanggan (Pilihan):
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType("penghantaran")}
                className={`py-2.5 px-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  deliveryType === "penghantaran"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Delivery ke Rumah</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("ambil_sendiri")}
                className={`py-2.5 px-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  deliveryType === "ambil_sendiri"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Pickup &lt; 11 PG</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nama Anda:</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="cth. Pn. Aisyah"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>No. Telefon:</span>
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="cth. 012-3456789"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {deliveryType === "penghantaran" && (
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Alamat / Taman:</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="cth. Taman Desa Cempaka, Nilai"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Catatan Produk / Anggaran Awal:</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="cth. Nak booking slot hari Sabtu pagi"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
          {!canSubmit && (
            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {!selectedArea
                  ? "Sila pilih Kawasan dan Agen bertugas terlebih dahulu."
                  : !selectedAgent
                  ? "Sila pilih Agen bertugas secara manual di atas."
                  : "Sila pilih Tarikh rancangan anda."}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleWhatsAppBooking}
            disabled={!canSubmit}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>
              {selectedAgent
                ? `Tempah Slot dengan ${selectedAgent.name} di WhatsApp`
                : "Tempah Slot di WhatsApp"}
            </span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
};
