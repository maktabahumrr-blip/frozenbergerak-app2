import { CartItem, CustomerOrderInfo, Product } from "../types";

export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function generateSingleProductWhatsAppUrl(
  product: Product,
  quantity: number = 1,
  whatsappNumber: string
): string {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  const total = product.price * quantity;
  const isPromo = Boolean(product.promoPrice && product.originalPrice && product.promoPrice < product.originalPrice);

  const text = `❄️ *TEMPAHAN FROZENBERGERAK*
--------------------------------
Halo FrozenBergerak! Saya ingin membuat pesanan bagi produk berikut:

📦 *Produk:* ${product.name} (ID: ${product.id})
🏷️ *Kategori:* ${product.category}
💵 *Harga:* ${formatCurrency(product.price)}${isPromo ? " *(Harga Promo)*" : ""}
🔢 *Kuantiti:* ${quantity} pek
💰 *Jumlah Anggaran:* ${formatCurrency(total)}

Mohon pihak FrozenBergerak sahkan ketersediaan stok & maklumat penghantaran. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateCartWhatsAppUrl(
  items: CartItem[],
  customer: CustomerOrderInfo,
  whatsappNumber: string
): string {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const itemsList = items
    .map((item, index) => {
      const isPromo = Boolean(item.product.promoPrice && item.product.originalPrice && item.product.promoPrice < item.product.originalPrice);
      return `${index + 1}. *${item.product.name}* (ID: ${item.product.id})
   - Kuantiti: ${item.quantity} pek
   - Harga: ${formatCurrency(item.product.price * item.quantity)}${isPromo ? " (Promo)" : ""}`;
    })
    .join("\n\n");

  const deliveryText =
    customer.deliveryType === "penghantaran"
      ? "🚚 Penghantaran ke Rumah"
      : "🏬 Ambil Sendiri (Self-Pickup)";

  const text = `❄️ *TEMPAHAN RASMI FROZENBERGERAK*
================================
Halo FrozenBergerak! Saya ingin mengesahkan tempahan produk sejuk beku berikut:

🛒 *SENARAI PESANAN:*
${itemsList}

--------------------------------
💵 *JUMLAH KESELURUHAN:* ${formatCurrency(subtotal)}
--------------------------------

👤 *MAKLUMAT PELANGGAN:*
• *Nama:* ${customer.name || "Pelanggan FrozenBergerak"}
• *No. Telefon:* ${customer.phone || "-"}
• *Pilihan:* ${deliveryText}
${customer.deliveryType === "penghantaran" && customer.address ? `• *Alamat:* ${customer.address}\n` : ""}${customer.notes ? `• *Nota Khas:* ${customer.notes}\n` : ""}
Mohon sahkan tempahan dan butiran pembayaran. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
