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

export function isProductPriceHidden(product?: Product | null): boolean {
  if (!product) return false;
  const catLower = String(product.category || "").toLowerCase();
  const numericPrice = Number(product.price);
  const hasFixedPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  return Boolean(
    product.hidePrice ||
    !hasFixedPrice ||
    catLower.includes("promosi bermusim") ||
    catLower.includes("tawaran terhad") ||
    catLower.includes("seasonal") ||
    catLower.includes("musiman")
  );
}

interface StandardizedOrderMessageParams {
  whatsappNumber: string;
  itemEntries: string[];
  totalText: string;
  deliveryFeeNote?: string;
  plannedDate?: string;
  deliveryType?: "penghantaran" | "ambil_sendiri";
  areaName?: string;
  agentName?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  notes?: string;
}

function buildStandardOrderWhatsAppUrl(params: StandardizedOrderMessageParams): string {
  const cleanNumber = String(params.whatsappNumber || "").replace(/[^0-9]/g, "");
  const safeEntries = params.itemEntries.filter(Boolean);

  const itemLine =
    safeEntries.length <= 1
      ? `📦 *Item:* ${safeEntries[0] || "Pilih semasa penghantaran (Disahkan team)"}`
      : `📦 *Item:*\n${safeEntries.map((entry, idx) => `${idx + 1}. ${entry}`).join("\n")}`;

  const feeNote = params.deliveryFeeNote || "*(+ caj COD ikut kawasan)*";
  const dateText = formatReadableDate(params.plannedDate);
  const deliveryShort = params.deliveryType === "ambil_sendiri" ? "Pickup <11 pagi" : "Delivery";

  const trimmedName = params.customerName?.trim() || "";
  const trimmedPhone = params.customerPhone?.trim() || "";
  const customerLineValue =
    trimmedName && trimmedPhone
      ? `${trimmedName} (${trimmedPhone})`
      : trimmedName || trimmedPhone || "-";

  const lines: string[] = [
    itemLine,
    `💰 *Jumlah:* ${params.totalText} ${feeNote}`,
    `📅 *Tarikh:* ${dateText} (${deliveryShort})`,
    `📍 *Kawasan:* ${params.areaName?.trim() || "-"}`,
    `🧕 *Agen:* ${params.agentName?.trim() || "-"}`,
    `👤 *Nama:* ${customerLineValue}`,
  ];

  if (params.deliveryType !== "ambil_sendiri" && params.address?.trim()) {
    lines.push(`🏠 *Alamat:* ${params.address.trim()}`);
  }
  if (params.notes?.trim()) {
    lines.push(`📝 *Nota:* ${params.notes.trim()}`);
  }

  const text = `Salam Team FrozenBergerak, nak buat pesanan awal:

${lines.join("\n")}

➕ *(Boleh tambah item masa sampai)*
Mohon sahkan stok & caj ya. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function generateSingleProductWhatsAppUrl(
  product?: Product | null,
  quantity: number = 1,
  whatsappNumber: string = "",
  orderMeta?: {
    area?: string;
    agentName?: string;
    plannedDate?: string;
    deliveryType?: "penghantaran" | "ambil_sendiri";
    customerName?: string;
    customerPhone?: string;
    address?: string;
    notes?: string;
  }
): string {
  const prodPrice = Number(product?.price) || 0;
  const prodQty = Number(quantity) || 1;
  const subtotal = prodPrice * prodQty;
  const hidePrice = isProductPriceHidden(product);
  const prodName = product?.name || "Produk FrozenBergerak";

  const itemEntry = hidePrice
    ? `${prodName} ×${prodQty} (Disahkan team)`
    : `${prodName} ×${prodQty} (${formatCurrency(subtotal)})`;

  const totalText = hidePrice ? "Disahkan team" : `*${formatCurrency(subtotal)}*`;

  return buildStandardOrderWhatsAppUrl({
    whatsappNumber,
    itemEntries: [itemEntry],
    totalText,
    plannedDate: orderMeta?.plannedDate,
    deliveryType: orderMeta?.deliveryType || "penghantaran",
    areaName: orderMeta?.area,
    agentName: orderMeta?.agentName,
    customerName: orderMeta?.customerName,
    customerPhone: orderMeta?.customerPhone,
    address: orderMeta?.address,
    notes: orderMeta?.notes,
  });
}

export function generateCartWhatsAppUrl(
  items: CartItem[] = [],
  customer: CustomerOrderInfo,
  whatsappNumber: string = ""
): string {
  const targetNumber = customer?.agentPhone || whatsappNumber || "";
  const safeItems = Array.isArray(items) ? items : [];
  const fixedItems = safeItems.filter((item) => !isProductPriceHidden(item?.product));
  const hasHiddenPriceItems = safeItems.some((item) => isProductPriceHidden(item?.product));
  const subtotal = fixedItems.reduce(
    (acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1),
    0
  );

  const itemEntries = safeItems.map((item) => {
    const p = item?.product;
    const itemPrice = Number(p?.price) || 0;
    const itemQty = Number(item?.quantity) || 1;
    if (isProductPriceHidden(p)) {
      return `${p?.name || "Produk"} ×${itemQty} (Disahkan team)`;
    }
    return `${p?.name || "Produk"} ×${itemQty} (${formatCurrency(itemPrice * itemQty)})`;
  });

  const deliveryFeeNote =
    typeof customer?.deliveryFee === "number" && customer.deliveryFee > 0
      ? `*(+ caj COD ${formatCurrency(customer.deliveryFee)})*`
      : `*(+ caj COD ikut kawasan)*`;

  const totalText =
    fixedItems.length === 0 && hasHiddenPriceItems
      ? "Disahkan team"
      : hasHiddenPriceItems
      ? `*${formatCurrency(subtotal)}* + item pakej (Disahkan team)`
      : `*${formatCurrency(subtotal)}*`;

  return buildStandardOrderWhatsAppUrl({
    whatsappNumber: targetNumber,
    itemEntries,
    totalText,
    deliveryFeeNote,
    plannedDate: customer?.plannedDate,
    deliveryType: customer?.deliveryType || "penghantaran",
    areaName: customer?.deliveryArea,
    agentName: customer?.agentName,
    customerName: customer?.name,
    customerPhone: customer?.phone,
    address: customer?.address,
    notes: customer?.notes,
  });
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
  return buildStandardOrderWhatsAppUrl({
    whatsappNumber: params.agentPhone,
    itemEntries: ["Pilih semasa penghantaran (Disahkan team)"],
    totalText: "Disahkan team",
    plannedDate: params.plannedDate,
    deliveryType: params.deliveryType || "penghantaran",
    areaName: params.areaName,
    agentName: params.agentName,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    address: params.address,
    notes: params.notes,
  });
}
