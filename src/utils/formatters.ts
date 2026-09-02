import { CartItem, CustomerOrderInfo, Product } from "../types";

export function formatCurrency(amount?: number | null | string): string {
  if (amount === undefined || amount === null) return "RM 0.00";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ""));
  return `RM ${(isNaN(num) ? 0 : num).toFixed(2)}`;
}

export function generateSingleProductWhatsAppUrl(
  product?: Product | null,
  quantity: number = 1,
  whatsappNumber: string = "60123456789"
): string {
  const cleanNumber = String(whatsappNumber || "").replace(/[^0-9]/g, "") || "60123456789";
  const prodPrice = Number(product?.price) || 0;
  const prodQty = Number(quantity) || 1;
  const total = prodPrice * prodQty;
  const isPromo = Boolean(product?.promoPrice && product?.originalPrice && product.promoPrice < product.originalPrice);

  const prodName = product?.name || "Produk FrozenBergerak";
  const prodId = product?.id || "N/A";
  const prodCategory = product?.category || "Umum";

  const text = `❄️ *TEMPAHAN FROZENBERGERAK*
--------------------------------
Halo FrozenBergerak! Saya ingin membuat pesanan bagi produk berikut:

📦 *Produk:* ${prodName} (ID: ${prodId})
🏷️ *Kategori:* ${prodCategory}
💵 *Harga:* ${formatCurrency(prodPrice)}${isPromo ? " *(Harga Promo)*" : ""}
🔢 *Kuantiti:* ${prodQty} pek
💰 *Jumlah Anggaran:* ${formatCurrency(total)}

Mohon pihak FrozenBergerak sahkan ketersediaan stok & maklumat penghantaran. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateCartWhatsAppUrl(
  items: CartItem[] = [],
  customer: CustomerOrderInfo,
  whatsappNumber: string = "60123456789"
): string {
  const cleanNumber = String(whatsappNumber || "").replace(/[^0-9]/g, "") || "60123456789";
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1), 0);

  const itemsList = safeItems
    .map((item, index) => {
      const p = item?.product;
      const isPromo = Boolean(p?.promoPrice && p?.originalPrice && p.promoPrice < p.originalPrice);
      const itemPrice = Number(p?.price) || 0;
      const itemQty = Number(item?.quantity) || 1;
      return `${index + 1}. *${p?.name || "Produk"}* (ID: ${p?.id || "N/A"})
   - Kuantiti: ${itemQty} pek
   - Harga: ${formatCurrency(itemPrice * itemQty)}${isPromo ? " (Promo)" : ""}`;
    })
    .join("\n\n");

  const deliveryText =
    customer?.deliveryType === "penghantaran"
      ? "🚚 Penghantaran ke Rumah"
      : "🏬 Ambil Sendiri (Self-Pickup)";

  const text = `❄️ *TEMPAHAN RASMI FROZENBERGERAK*
================================
Halo FrozenBergerak! Saya ingin mengesahkan tempahan produk sejuk beku berikut:

🛒 *SENARAI PESANAN:*
${itemsList || "Tiada item"}

--------------------------------
💵 *JUMLAH KESELURUHAN:* ${formatCurrency(subtotal)}
--------------------------------

👤 *MAKLUMAT PELANGGAN:*
• *Nama:* ${customer?.name || "Pelanggan FrozenBergerak"}
• *No. Telefon:* ${customer?.phone || "-"}
• *Pilihan:* ${deliveryText}
${customer?.deliveryType === "penghantaran" && customer?.address ? `• *Alamat:* ${customer.address}\n` : ""}${customer?.notes ? `• *Nota Khas:* ${customer.notes}\n` : ""}
Mohon sahkan tempahan dan butiran pembayaran. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
