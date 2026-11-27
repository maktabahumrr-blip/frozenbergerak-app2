import React, { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Send,
  Truck,
  Store,
  User,
  Phone,
  MapPin,
  FileText,
  UserCheck,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Info,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { AgentContact, CartItem, CustomerOrderInfo, DeliveryArea } from "../types";
import { formatCurrency, generateCartWhatsAppUrl, isProductPriceHidden } from "../utils/formatters";
import { formatImageUrl, handleOptimizedImageError } from "../utils/googleDrive";
import { formatIsoDateMalay, getLocalTodayIso } from "../utils/scheduleDateHelper";
import { AreaAgentSelector } from "./AreaAgentSelector";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  whatsappNumber?: string;
}

const STEPS = [
  { id: 1, title: "Troli" },
  { id: 2, title: "Pelanggan" },
  { id: 3, title: "Tarikh" },
  { id: 4, title: "Agen" },
  { id: 5, title: "Hantar" }
] as const;

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const todayIso = getLocalTodayIso();
  const [step, setStep] = useState<number>(1);
  // IMPORTANT: Start with null area and null agent so it NEVER silently defaults to Husna
  const [selectedArea, setSelectedArea] = useState<DeliveryArea | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentContact | null>(null);
  const [plannedDate, setPlannedDate] = useState<string>(todayIso);

  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: "",
    phone: "",
    address: "",
    deliveryType: "penghantaran",
    deliveryArea: "",
    agentName: "",
    agentPhone: "",
    plannedDate: todayIso,
    notes: "",
  });

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];
  const fixedPriceItems = safeItems.filter((item) => !isProductPriceHidden(item?.product));
  const hasHiddenPriceItems = safeItems.some((item) => isProductPriceHidden(item?.product));
  const allItemsHiddenPrice = safeItems.length > 0 && fixedPriceItems.length === 0;
  const productSubtotal = fixedPriceItems.reduce(
    (acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1),
    0
  );
  const totalItemCount = safeItems.reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0);

  const handleAreaChange = (foundArea: DeliveryArea) => {
    setSelectedArea(foundArea);
    // Reset selectedAgent to null whenever area changes -> customer MUST choose manually!
    setSelectedAgent(null);
    setCustomer((prev) => ({
      ...prev,
      deliveryArea: foundArea.name,
      agentName: "",
      agentPhone: "",
    }));
  };

  const handleAgentChange = (foundAgent: AgentContact) => {
    setSelectedAgent(foundAgent);
    setCustomer((prev) => ({
      ...prev,
      deliveryArea: selectedArea?.name || "",
      agentName: foundAgent.name,
      agentPhone: foundAgent.phone,
    }));
  };

  const handleSetTomorrow = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrIso = getLocalTodayIso(tmr);
    setPlannedDate(tmrIso);
    setCustomer((prev) => ({ ...prev, plannedDate: tmrIso }));
  };

  const canSendWhatsApp = Boolean(
    safeItems.length > 0 &&
    selectedArea &&
    selectedAgent &&
    plannedDate
  );

  const handleWhatsAppSend = () => {
    if (!canSendWhatsApp || !selectedArea || !selectedAgent) return;
    const orderCustomer: CustomerOrderInfo = {
      ...customer,
      deliveryArea: selectedArea.name,
      agentName: selectedAgent.name,
      agentPhone: selectedAgent.phone,
      plannedDate,
    };
    const url = generateCartWhatsAppUrl(safeItems, orderCustomer, selectedAgent.phone);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 text-white shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Senarai Pesanan Anda</h3>
                  <p className="text-[13px] text-slate-300">
                    {totalItemCount} pek dipilih • Langkah {step} / 5
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup Troli"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5-Step Progress Navigation */}
            {safeItems.length > 0 && (
              <div className="grid grid-cols-5 gap-1">
                {STEPS.map((s) => {
                  const isActive = step === s.id;
                  const isDone = step > s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStep(s.id)}
                      className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white font-bold shadow-xs"
                          : isDone
                          ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="text-[11px] font-extrabold leading-none">{s.id}</div>
                      <div className="text-[11px] truncate mt-0.5">{s.title}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 bg-slate-50/60">
            {safeItems.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Senarai Masih Kosong</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Sila pilih makanan frozen kegemaran anda daripada katalog untuk memulakan pesanan.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  Lihat Katalog Sekarang
                </button>
              </div>
            ) : (
              <>
                {/* ========================================================= */}
                {/* LANGKAH 1: SEMAK PRODUK DALAM TROLI                       */}
                {/* ========================================================= */}
                {step === 1 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-[13px] pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800">
                        Langkah 1: Semak Produk ({safeItems.length} item)
                      </span>
                      <button
                        type="button"
                        onClick={onClearCart}
                        className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 text-[13px] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Kosongkan
                      </button>
                    </div>

                    {safeItems.map((item) => {
                      if (!item || !item.product) return null;
                      const p = item.product;
                      const pId = p?.id || Math.random().toString();
                      const itemQty = Number(item?.quantity) || 1;
                      const itemPrice = Number(p?.price) || 0;
                      const itemHidePrice = isProductPriceHidden(p);

                      return (
                        <div
                          key={pId}
                          className="flex gap-3 p-3 rounded-xl bg-white border border-slate-200/80 items-center justify-between shadow-2xs"
                        >
                          <img
                            src={formatImageUrl(p?.cookedImageUrl || p?.imageUrl || p?.packagingImageUrl, p?.category, p?.name, "thumb")}
                            alt={p?.name || "Produk"}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              handleOptimizedImageError(e.currentTarget, p?.category, p?.name, "thumb");
                            }}
                            className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {p?.name || "Produk"}
                            </h4>
                            {!itemHidePrice ? (
                              <>
                                <p className="text-[13px] text-slate-500">
                                  {formatCurrency(itemPrice)} / {p?.unit || "1 pek"}
                                </p>
                                <p className="text-[13px] font-bold text-blue-600 mt-0.5">
                                  Subtotal: {formatCurrency(itemPrice * itemQty)}
                                </p>
                              </>
                            ) : (
                              <p className="text-[13px] text-slate-500 mt-0.5">
                                Item pakej / random ({itemQty} pek)
                              </p>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (itemQty > 1) {
                                  onUpdateQuantity(pId, itemQty - 1);
                                } else {
                                  onRemoveItem(pId);
                                }
                              }}
                              className="w-7 h-7 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-2xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-900">
                              {itemQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(pId, itemQty + 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-[13px] text-blue-900 leading-relaxed">
                      <strong>Pesanan Fleksibel:</strong> Ini adalah Nota Anggaran / Pesanan Awal. Anda juga boleh membuat penambahan produk secara bersemuka (on the spot) ketika penghantaran.
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* LANGKAH 2: MAKLUMAT PELANGGAN & PILIHAN KAWASAN           */}
                {/* ========================================================= */}
                {step === 2 && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      Langkah 2: Maklumat Pelanggan &amp; Kawasan
                    </div>

                    {/* Area dropdown selector (agent selection kept for Langkah 4) */}
                    <AreaAgentSelector
                      selectedArea={selectedArea}
                      selectedAgent={selectedAgent}
                      onSelectArea={handleAreaChange}
                      onSelectAgent={handleAgentChange}
                      label="Pilih Kawasan Penghantaran"
                      showRequiredBadge={true}
                      hideAgentList={true}
                      idPrefix="cart-step2"
                    />

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                          Kaedah Pesanan:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, deliveryType: "penghantaran" })}
                            className={`py-2.5 px-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              customer.deliveryType === "penghantaran"
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Truck className="w-4 h-4" />
                            <span>Penghantaran</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, deliveryType: "ambil_sendiri" })}
                            className={`py-2.5 px-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              customer.deliveryType === "ambil_sendiri"
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Store className="w-4 h-4" />
                            <span>Pickup &lt; 11 PG</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Nama Anda:</span>
                        </label>
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          placeholder="cth. Ahmad Faris"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>No. Telefon (WhatsApp):</span>
                        </label>
                        <input
                          type="text"
                          value={customer.phone}
                          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          placeholder="cth. 012-3456789"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      {customer.deliveryType === "penghantaran" && (
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>Alamat Penghantaran:</span>
                          </label>
                          <textarea
                            rows={2}
                            value={customer.address}
                            onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                            placeholder="cth. No 25, Jalan Kemboja 4, Seksyen 7, Shah Alam"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>Nota Tambahan:</span>
                        </label>
                        <input
                          type="text"
                          value={customer.notes}
                          onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                          placeholder="cth. Hantar selepas jam 2 petang"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* LANGKAH 3: PEMILIHAN TARIKH & NOTA OPERASI                */}
                {/* ========================================================= */}
                {step === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      Langkah 3: Tarikh Pilihan &amp; Nota Operasi
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label htmlFor="cart-planned-date" className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-blue-600" />
                          <span>Pilih Tarikh Rancangan Anda:</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPlannedDate(todayIso);
                              setCustomer((prev) => ({ ...prev, plannedDate: todayIso }));
                            }}
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
                        id="cart-planned-date"
                        type="date"
                        min={todayIso}
                        value={plannedDate}
                        onChange={(e) => {
                          setPlannedDate(e.target.value);
                          setCustomer((prev) => ({ ...prev, plannedDate: e.target.value }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />

                      {plannedDate && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[13px] text-blue-900 font-semibold">
                          Tarikh Rancangan: <strong>{formatIsoDateMalay(plannedDate)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Nota Operasi Wajib */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-[13px] text-amber-950 leading-relaxed">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Nota Operasi FrozenBergerak:</span>
                      </div>
                      <p>
                        Penghantaran terus ke rumah (Delivery). Tiada servis self-pickup bebas. Pickup khas: Sebelum jam 11:00 pagi sahaja.
                      </p>
                      <p className="text-amber-800 text-xs">
                        Operasi penghantaran bergerak mengikut pesanan pelanggan. Sila pastikan tarikh yang dipilih bersesuaian.
                      </p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* LANGKAH 4: PEMILIHAN AGEN MANUAL (TIADA DEFAULT HUSNA)    */}
                {/* ========================================================= */}
                {step === 4 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      Langkah 4: Pemilihan Agen Manual
                    </div>

                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      Sila pilih kawasan anda dan <strong>tekan nama agen bertugas secara manual</strong> untuk memastikan pesanan dihantar ke WhatsApp agen yang tepat.
                    </p>

                    <AreaAgentSelector
                      selectedArea={selectedArea}
                      selectedAgent={selectedAgent}
                      onSelectArea={handleAreaChange}
                      onSelectAgent={handleAgentChange}
                      label="Kawasan & Pilihan Agen Manual"
                      showRequiredBadge={true}
                      idPrefix="cart-step4"
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* LANGKAH 5: RINGKASAN & HANTAR KE WHATSAPP                 */}
                {/* ========================================================= */}
                {step === 5 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      Langkah 5: Semakan Akhir &amp; Hantar ke WhatsApp
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <span className="text-slate-500">Tarikh Pilihan:</span>
                        <span className="font-bold text-slate-900 text-right">
                          {plannedDate ? formatIsoDateMalay(plannedDate) : "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <span className="text-slate-500">Kawasan:</span>
                        <span className="font-bold text-slate-900 text-right max-w-[60%] break-words">
                          {selectedArea ? selectedArea.name : "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <span className="text-slate-500">Agen Bertugas:</span>
                        <span className="font-bold text-emerald-700 text-right">
                          {selectedAgent ? `${selectedAgent.name} (+${selectedAgent.phone})` : "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <span className="text-slate-500">Jumlah Item:</span>
                        <span className="font-bold text-slate-900">{totalItemCount} pek ({safeItems.length} jenis)</span>
                      </div>

                      {/* Separated Prices */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-slate-600">Jumlah Belian Produk (Subtotal):</span>
                          <span className="text-base font-black text-slate-900">
                            {allItemsHiddenPrice
                              ? "Item pakej / random"
                              : hasHiddenPriceItems
                              ? `${formatCurrency(productSubtotal)} + pakej`
                              : formatCurrency(productSubtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                          <span className="text-[13px] font-semibold text-slate-600">Caj Penghantaran:</span>
                          <span className="text-[13px] font-bold text-blue-700">Berasingan (disahkan agen)</span>
                        </div>
                      </div>
                    </div>

                    {(!selectedArea || !selectedAgent || !plannedDate) && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-900 flex items-start gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span>Sila lengkapkan pilihan berikut sebelum menghantar:</span>
                          {!selectedArea && <div className="text-xs">• Pilih Kawasan di Langkah 2 / 4</div>}
                          {!plannedDate && <div className="text-xs">• Pilih Tarikh di Langkah 3</div>}
                          {!selectedAgent && <div className="text-xs">• Pilih Agen secara manual di Langkah 4</div>}
                        </div>
                      </div>
                    )}

                    {canSendWhatsApp && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-900 flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Pesanan bersedia dihantar kepada {selectedAgent?.name}!</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          {safeItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3 shadow-lg shrink-0">
              {/* Separated Pricing Summary */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-slate-600">Subtotal Produk:</span>
                  <span className="text-xl font-black text-slate-900">
                    {allItemsHiddenPrice
                      ? "Disahkan team"
                      : hasHiddenPriceItems
                      ? `${formatCurrency(productSubtotal)} + pakej`
                      : formatCurrency(productSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Caj Penghantaran:</span>
                  <span className="font-semibold text-slate-700">Berasingan (ikut kawasan)</span>
                </div>
              </div>

              {/* Agent Badge Summary */}
              {selectedArea && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700">
                  <div className="flex items-start gap-1.5 min-w-0 flex-1">
                    <UserCheck className={`w-4 h-4 shrink-0 mt-0.5 ${selectedAgent ? "text-emerald-600" : "text-amber-600"}`} />
                    <span className="whitespace-normal break-words leading-snug">
                      {selectedArea.name} •{" "}
                      <strong>{selectedAgent ? selectedAgent.name : "Agen belum dipilih"}</strong>
                    </span>
                  </div>
                  {selectedAgent && (
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                      +{selectedAgent.phone}
                    </span>
                  )}
                </div>
              )}

              {/* Step Navigation / Final WhatsApp CTA */}
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="py-3 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Undur</span>
                  </button>
                )}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Seterusnya: {STEPS[step]?.title}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="drawer-send-whatsapp-btn"
                    type="button"
                    onClick={handleWhatsAppSend}
                    disabled={!canSendWhatsApp}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:text-slate-500 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Hantar ke WhatsApp</span>
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
