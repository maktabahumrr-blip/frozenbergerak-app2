import { CartItem, CustomerOrderInfo, Product } from "../types";

export function formatCurrency(amount?: number | null | string): string {
  if (amount === undefined || amount === null || amount === "") return "RM 0.00";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "").replace(/[^0-9.-]+/g, ""));
  return `RM ${(isNaN(num) ? 0 : num).toFixed(2)}`;
}

export function generateSingleProductWhatsAppUrl(
  product?: Product | null,
  quantity: number = 1,
  whatsappNumber: string = "60123456789",
  areaInfo?: { area?: string; agentName?: string }
): string {
  const cleanNumber = String(whatsappNumber || "").replace(/[^0-9]/g, "") || "60123456789";
  const prodPrice = Number(product?.price) || 0;
  const prodQty = Number(quantity) || 1;
  const total = prodPrice * prodQty;
  const isPromo = Boolean(product?.promoPrice && product?.originalPrice && product.promoPrice < product.originalPrice);

  const prodName = product?.name || "Produk FrozenBergerak";
  const prodId = product?.id || "N/A";
  const prodCategory = product?.category || "Umum";

  const orderLines: string[] = [
    `• *Produk:* ${prodName}`,
    `• *Kod Produk:* ${prodId}`,
    `• *Kategori:* ${prodCategory}`,
    `• *Harga Seunit:* ${formatCurrency(prodPrice)}${isPromo ? " _(Harga Promosi)_" : ""}`,
    `• *Kuantiti:* ${prodQty} pek`,
    `• *Anggaran Jumlah:* *${formatCurrency(total)}*`,
  ];

  if (areaInfo?.area) {
    orderLines.push(`• *Kawasan:* ${areaInfo.area}`);
  }
  if (areaInfo?.agentName) {
    orderLines.push(`• *Agen Pilihan:* ${areaInfo.agentName}`);
  }

  const text = `Salam sejahtera Team FrozenBergerak!
Saya berminat untuk membuat tempahan produk berikut:

❄️ *BUTIRAN TEMPAHAN*
━━━━━━━━━━━━━━━━━━
${orderLines.join("\n")}
━━━━━━━━━━━━━━━━━━

Mohon pihak Team FrozenBergerak bantu sahkan ketersediaan stok serta maklumat penghantaran bagi tempahan ini ya. Terima kasih banyak!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateCartWhatsAppUrl(
  items: CartItem[] = [],
  customer: CustomerOrderInfo,
  whatsappNumber: string = "60123456789"
): string {
  const targetNumber = customer?.agentPhone || whatsappNumber || "60123456789";
  const cleanNumber = String(targetNumber || "").replace(/[^0-9]/g, "") || "60123456789";
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1), 0);

  const itemsList = safeItems
    .map((item, index) => {
      const p = item?.product;
      const isPromo = Boolean(p?.promoPrice && p?.originalPrice && p.promoPrice < p.originalPrice);
      const itemPrice = Number(p?.price) || 0;
      const itemQty = Number(item?.quantity) || 1;
      return `${index + 1}. *${p?.name || "Produk"}* (${p?.id || "N/A"})
   • Kuantiti: ${itemQty} pek
   • Jumlah: ${formatCurrency(itemPrice * itemQty)}${isPromo ? " _(Harga Promosi)_" : ""}`;
    })
    .join("\n\n");

  const deliveryText =
    customer?.deliveryType === "penghantaran"
      ? "Penghantaran ke Rumah"
      : "Ambil Sendiri (Self-Pickup)";

  const customerDetails: string[] = [
    `• *Nama:* ${customer?.name?.trim() || "Pelanggan FrozenBergerak"}`,
    `• *No. Telefon:* ${customer?.phone?.trim() || "-"}`,
    `• *Kaedah:* ${deliveryText}`,
  ];

  if (customer?.deliveryArea) {
    customerDetails.push(`• *Kawasan:* ${customer.deliveryArea}`);
  }
  if (customer?.agentName) {
    customerDetails.push(`• *Agen Pilihan:* ${customer.agentName}`);
  }
  if (customer?.deliveryType === "penghantaran" && customer?.address?.trim()) {
    customerDetails.push(`• *Alamat:* ${customer.address.trim()}`);
  }
  if (customer?.notes?.trim()) {
    customerDetails.push(`• *Nota Khas:* ${customer.notes.trim()}`);
  }

  const text = `Salam sejahtera Team FrozenBergerak!
Saya ingin membuat tempahan produk sejuk beku seperti butiran di bawah:

🛒 *SENARAI PESANAN*
━━━━━━━━━━━━━━━━━━
${itemsList || "Tiada item"}

━━━━━━━━━━━━━━━━━━
💰 *ANGGARAN JUMLAH:* *${formatCurrency(subtotal)}*
━━━━━━━━━━━━━━━━━━

👤 *MAKLUMAT PELANGGAN*
${customerDetails.join("\n")}

Mohon pihak Team FrozenBergerak bantu sahkan ketersediaan stok, maklumat penghantaran, dan butiran pembayaran. Terima kasih banyak!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
