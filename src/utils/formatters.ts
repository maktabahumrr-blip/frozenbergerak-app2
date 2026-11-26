import { CartItem, CustomerOrderInfo, Product } from "../types";
import { formatIsoDateMalay } from "./scheduleDateHelper";

export function formatCurrency(amount?: number | null | string): string {
  if (amount === undefined || amount === null || amount === "") return "RM 0.00";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "").replace(/[^0-9.-]+/g, ""));
  return `RM ${(isNaN(num) ? 0 : num).toFixed(2)}`;
}

function formatReadableDate(rawDate?: string): string {
  if (!rawDate) return "Belum ditetapkan";
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return formatIsoDateMalay(rawDate.trim());
  }
  return rawDate.trim();
}

export function generateSingleProductWhatsAppUrl(
  product?: Product | null,
  quantity: number = 1,
  whatsappNumber: string = "",
  orderMeta?: {
    area?: string;
    agentName?: string;
    plannedDate?: string;
    notes?: string;
  }
): string {
  const cleanNumber = String(whatsappNumber || "").replace(/[^0-9]/g, "");
  const prodPrice = Number(product?.price) || 0;
  const prodQty = Number(quantity) || 1;
  const subtotal = prodPrice * prodQty;

  const prodName = product?.name || "Produk FrozenBergerak";
  const dateText = formatReadableDate(orderMeta?.plannedDate);

  const details: string[] = [
    `• *Produk:* ${prodName} (${prodQty} pek × ${formatCurrency(prodPrice)})`,
    `• *Jumlah Produk (Subtotal):* *${formatCurrency(subtotal)}*`,
    `• *Caj Penghantaran:* Berasingan (disahkan ikut kawasan)`,
    `• *Tarikh Pilihan:* ${dateText}`,
  ];

  if (orderMeta?.area) {
    details.push(`• *Kawasan:* ${orderMeta.area}`);
  }
  if (orderMeta?.agentName) {
    details.push(`• *Agen Bertugas:* ${orderMeta.agentName}`);
  }
  if (orderMeta?.notes?.trim()) {
    details.push(`• *Nota:* ${orderMeta.notes.trim()}`);
  }

  const text = `Salam sejahtera Team FrozenBergerak!
Ini *Nota Anggaran / Pesanan Awal* saya _(penambahan item secara bersemuka dibenarkan semasa penghantaran)_:

${details.join("\n")}

Mohon sahkan stok serta caj penghantaran bagi tarikh dan kawasan di atas. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateCartWhatsAppUrl(
  items: CartItem[] = [],
  customer: CustomerOrderInfo,
  whatsappNumber: string = ""
): string {
  const targetNumber = customer?.agentPhone || whatsappNumber || "";
  const cleanNumber = String(targetNumber || "").replace(/[^0-9]/g, "");
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce(
    (acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1),
    0
  );

  const itemsList = safeItems
    .map((item, index) => {
      const p = item?.product;
      const itemPrice = Number(p?.price) || 0;
      const itemQty = Number(item?.quantity) || 1;
      return `${index + 1}. ${p?.name || "Produk"} ×${itemQty} — ${formatCurrency(itemPrice * itemQty)}`;
    })
    .join("\n");

  const deliveryText =
    customer?.deliveryType === "penghantaran"
      ? "Penghantaran terus ke rumah (Delivery)"
      : "Pickup Khas (Sebelum jam 11:00 pagi sahaja)";

  const plannedDateText = formatReadableDate(customer?.plannedDate);

  const customerDetails: string[] = [
    `• *Tarikh Pilihan:* ${plannedDateText}`,
    `• *Kaedah:* ${deliveryText}`,
    `• *Kawasan:* ${customer?.deliveryArea || "-"}`,
    `• *Agen Pilihan:* ${customer?.agentName || "-"}`,
    `• *Nama:* ${customer?.name?.trim() || "Pelanggan"}`,
    `• *No. Tel:* ${customer?.phone?.trim() || "-"}`,
  ];

  if (customer?.deliveryType === "penghantaran" && customer?.address?.trim()) {
    customerDetails.push(`• *Alamat:* ${customer.address.trim()}`);
  }
  if (customer?.notes?.trim()) {
    customerDetails.push(`• *Nota:* ${customer.notes.trim()}`);
  }

  const deliveryFeeLine =
    typeof customer?.deliveryFee === "number" && customer.deliveryFee > 0
      ? formatCurrency(customer.deliveryFee)
      : "Berasingan (disahkan ikut kawasan)";

  const text = `Salam sejahtera Team FrozenBergerak!
Berikut *Nota Anggaran / Pesanan Awal* saya _(penambahan produk secara bersemuka/on-the-spot dibenarkan)_:

*SENARAI PRODUK:*
${itemsList || "- Tiada item"}

*RINGKASAN HARGA:*
• *Jumlah Belian Produk (Subtotal):* *${formatCurrency(subtotal)}*
• *Caj Penghantaran:* ${deliveryFeeLine}

*MAKLUMAT TEMPAHAN:*
${customerDetails.join("\n")}

Mohon pihak team sahkan ketersediaan stok dan caj penghantaran untuk tarikh di atas. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateSlotBookingWhatsAppUrl(params: {
  agentPhone: string;
  agentName: string;
  areaName: string;
  plannedDate: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  deliveryType?: "penghantaran" | "ambil_sendiri";
  notes?: string;
}): string {
  const cleanNumber = String(params.agentPhone || "").replace(/[^0-9]/g, "");
  const plannedDateText = formatReadableDate(params.plannedDate);
  const deliveryText =
    params.deliveryType === "ambil_sendiri"
      ? "Pickup Khas (Sebelum jam 11:00 pagi sahaja)"
      : "Penghantaran terus ke rumah (Delivery)";

  const lines: string[] = [
    `• *Tarikh Pilihan:* ${plannedDateText}`,
    `• *Kawasan:* ${params.areaName}`,
    `• *Agen Pilihan:* ${params.agentName}`,
    `• *Kaedah:* ${deliveryText}`,
  ];

  if (params.customerName?.trim()) {
    lines.push(`• *Nama:* ${params.customerName.trim()}`);
  }
  if (params.customerPhone?.trim()) {
    lines.push(`• *No. Tel:* ${params.customerPhone.trim()}`);
  }
  if (params.address?.trim() && params.deliveryType !== "ambil_sendiri") {
    lines.push(`• *Alamat:* ${params.address.trim()}`);
  }
  if (params.notes?.trim()) {
    lines.push(`• *Nota:* ${params.notes.trim()}`);
  }

  const text = `Salam sejahtera ${params.agentName} (Team FrozenBergerak)!
Saya ingin *menempah slot penghantaran / membuat anggaran pesanan awal* seperti berikut:

${lines.join("\n")}

Mohon sahkan slot dan maklumkan caj penghantaran mengikut kawasan saya. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
