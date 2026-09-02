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
  FileText 
} from "lucide-react";
import { CartItem, CustomerOrderInfo } from "../types";
import { formatCurrency, generateCartWhatsAppUrl } from "../utils/formatters";
import { formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";

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
  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: "",
    phone: "",
    address: "",
    deliveryType: "penghantaran",
    notes: "",
  });

  const [showCheckoutForm, setShowCheckoutForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalAmount = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleWhatsAppSend = () => {
    const url = generateCartWhatsAppUrl(items, customer, whatsappNumber);
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

                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-3 p-3 rounded-xl bg-white border border-slate-200/80 items-center justify-between shadow-2xs"
                    >
                      <img
                        src={formatImageUrl(item.product.cookedImageUrl || item.product.imageUrl || item.product.packagingImageUrl, item.product.category, item.product.name)}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCategoryFallbackImage(item.product.category, item.product.name);
                        }}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {formatCurrency(item.product.price)} / {item.product.unit}
                        </p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">
                          Jumlah: {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              onUpdateQuantity(item.product.id, item.quantity - 1);
                            } else {
                              onRemoveItem(item.product.id);
                            }
                          }}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
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
            <div className="p-5 border-t border-slate-200 bg-white space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-500">Anggaran Jumlah Pesanan:</span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                *Caj penghantaran sebenar akan disahkan terus oleh pihak FrozenBergerak melalui WhatsApp.
              </p>

              {/* Main Green WhatsApp Order Button */}
              <button
                id="drawer-send-whatsapp-btn"
                type="button"
                onClick={handleWhatsAppSend}
                className="w-full py-3.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-xs flex items-center justify-center gap-2 transition-all"
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
