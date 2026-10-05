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
  ChevronDown,
  UserCheck
} from "lucide-react";
import { CartItem, CustomerOrderInfo, DeliveryAgent } from "../types";
import { formatCurrency, generateCartWhatsAppUrl } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";
import { DELIVERY_AGENTS, DEFAULT_DELIVERY_AGENT } from "../data/deliveryAgents";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  whatsappNumber: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  whatsappNumber,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent>(DEFAULT_DELIVERY_AGENT);
  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: "",
    phone: "",
    address: "",
    deliveryType: "penghantaran",
    deliveryArea: DEFAULT_DELIVERY_AGENT.area,
    agentName: DEFAULT_DELIVERY_AGENT.name,
    agentPhone: DEFAULT_DELIVERY_AGENT.phone,
    notes: "",
  });

  const [showCheckoutForm, setShowCheckoutForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];
  const totalAmount = safeItems.reduce(
    (acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1),
    0
  );
  const totalItemCount = safeItems.reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0);

  const handleAgentChange = (agentId: string) => {
    const found = DELIVERY_AGENTS.find((a) => a.id === agentId) || DEFAULT_DELIVERY_AGENT;
    setSelectedAgent(found);
    setCustomer((prev) => ({
      ...prev,
      deliveryArea: found.area,
      agentName: found.name,
      agentPhone: found.phone,
    }));
  };

  const handleWhatsAppSend = () => {
    const orderCustomer: CustomerOrderInfo = {
      ...customer,
      deliveryArea: selectedAgent.area,
      agentName: selectedAgent.name,
      agentPhone: selectedAgent.phone,
    };
    const targetPhone = selectedAgent.phone || whatsappNumber;
    const url = generateCartWhatsAppUrl(safeItems, orderCustomer, targetPhone);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Senarai Pesanan Anda</h3>
                <p className="text-xs text-slate-400">
                  {totalItemCount} pek dipilih • FrozenBergerak
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
            {items.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Senarai Masih Kosong</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Sila pilih makanan frozen kegemaran anda daripada katalog untuk memulakan pesanan.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700"
                >
                  Lihat Katalog Sekarang
                </button>
              </div>
            ) : (
              <>
                {/* Itemized List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Produk Dipilih ({items.length})
                    </span>
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Kosongkan
                    </button>
                  </div>

                  {safeItems?.map((item) => {
                    if (!item || !item.product) return null;
                    const p = item.product;
                    const pId = p?.id || Math.random().toString();
                    const itemQty = Number(item?.quantity) || 1;
                    const itemPrice = Number(p?.price) || 0;

                    return (
                      <div
                        key={pId}
                        className="flex gap-3 p-3 rounded-xl bg-white border border-slate-200/80 items-center justify-between shadow-2xs"
                      >
                        <img
                          src={formatImageUrl(p?.cookedImageUrl || p?.imageUrl || p?.packagingImageUrl, p?.category, p?.name)}
                          alt={p?.name || "Produk"}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getCategoryFallbackImage(p?.category, p?.name);
                          }}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {p?.name || "Produk"}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {formatCurrency(itemPrice)} / {p?.unit || "1 pek"}
                          </p>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">
                            Jumlah: {formatCurrency(itemPrice * itemQty)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (itemQty > 1) {
                                onUpdateQuantity(pId, itemQty - 1);
                              } else {
                                onRemoveItem(pId);
                              }
                            }}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold shadow-2xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-slate-900">
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(pId, itemQty + 1)}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Customer Information for Faster WhatsApp processing */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutForm(!showCheckoutForm)}
                    className="w-full text-left p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs font-bold text-blue-900"
                  >
                    <span>
                      {showCheckoutForm ? "▼ Sembunyikan Butiran Penghantaran" : "▶ Isi Maklumat Penghantaran (Pilihan)"}
                    </span>
                    <span className="text-[11px] text-blue-600 font-normal">
                      {customer.name ? "✓ Terisi" : "+ Lengkapkan"}
                    </span>
                  </button>

                  {showCheckoutForm && (
                    <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl space-y-3 animate-fadeIn text-xs shadow-2xs">
                      {/* Delivery Option */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">
                          Kaedah Pesanan:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, deliveryType: "penghantaran" })}
                            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                              customer.deliveryType === "penghantaran"
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Penghantaran</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomer({ ...customer, deliveryType: "ambil_sendiri" })}
                            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                              customer.deliveryType === "ambil_sendiri"
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Self-Pickup</span>
                          </button>
                        </div>
                      </div>

                      {/* Delivery Area Dropdown in Form */}
                      <div>
                        <label htmlFor="form-delivery-area-select" className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pilih Kawasan / Agent Penghantaran:</span>
                        </label>
                        <div className="relative">
                          <select
                            id="form-delivery-area-select"
                            value={selectedAgent.id}
                            onChange={(e) => handleAgentChange(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white appearance-none cursor-pointer"
                          >
                            {DELIVERY_AGENTS.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.area} ({agent.name})
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <p className="text-[10px] text-blue-600 mt-1 font-medium">
                          Agent Bertugas: {selectedAgent.name} (WhatsApp: +{selectedAgent.phone})
                        </p>
                      </div>

                      {/* Name input */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nama Anda:</span>
                        </label>
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          placeholder="cth. Ahmad Faris"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      {/* Phone input */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>No. Telefon (WhatsApp):</span>
                        </label>
                        <input
                          type="text"
                          value={customer.phone}
                          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          placeholder="cth. 012-3456789"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>

                      {/* Address if delivery */}
                      {customer.deliveryType === "penghantaran" && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Alamat Penghantaran:</span>
                          </label>
                          <textarea
                            rows={2}
                            value={customer.address}
                            onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                            placeholder="cth. No 25, Jalan Kemboja 4, Seksyen 7, Shah Alam"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                      )}

                      {/* Notes input */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nota Tambahan:</span>
                        </label>
                        <input
                          type="text"
                          value={customer.notes}
                          onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                          placeholder="cth. Hantar selepas jam 2 petang"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer / Checkout button */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3.5 shadow-lg">
              {/* Delivery Area / Agent Selector Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <label 
                  htmlFor="checkout-delivery-area-select" 
                  className="block text-xs font-bold text-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pilih Kawasan / Agent Penghantaran</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Wajib
                  </span>
                </label>
                
                <div className="relative">
                  <select
                    id="checkout-delivery-area-select"
                    value={selectedAgent.id}
                    onChange={(e) => handleAgentChange(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs appearance-none cursor-pointer"
                  >
                    {DELIVERY_AGENTS.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.area} ({agent.name})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Assigned Agent Quick Info Badge */}
                <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Agent: <strong>{selectedAgent.name}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[10px] shrink-0 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-600 fill-current" />
                    +{selectedAgent.phone}
                  </span>
                </div>
                {selectedAgent.coverage && (
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    Liputan: {selectedAgent.coverage}
                  </p>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-xs font-semibold text-slate-500">Anggaran Jumlah Pesanan:</span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                *Pesanan akan dihantar terus ke WhatsApp agent rasmi kawasan anda ({selectedAgent.name}).
              </p>

              {/* Main Green WhatsApp Order Button */}
              <button
                id="drawer-send-whatsapp-btn"
                type="button"
                onClick={handleWhatsAppSend}
                className="w-full py-3.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Hantar Pesanan ke WhatsApp</span>
                <Send className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
