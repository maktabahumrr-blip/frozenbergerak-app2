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

function isProductPriceHidden(product?: Product | null): boolean {
  if (!product) return false;
  const catLower = String(product.category || "").toLowerCase();
  return Boolean(
    product.hidePrice ||
    catLower.includes("promosi bermusim") ||
    catLower.includes("seasonal") ||
    catLower.includes("musiman")
  );
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
  const hidePrice = isProductPriceHidden(product);

  const prodName = product?.name || "Produk FrozenBergerak";
  const dateText = formatReadableDate(orderMeta?.plannedDate);

  const itemLine = hidePrice
    ? `📦 *Item:* ${prodName} ×${prodQty} (Disahkan team)`
    : `📦 *Item:* ${prodName} ×${prodQty} (${formatCurrency(subtotal)})`;

  const totalLine = hidePrice
    ? `💰 *Jumlah:* Disahkan team *(+ caj COD ikut kawasan)*`
    : `💰 *Jumlah:* *${formatCurrency(subtotal)}* *(+ caj COD ikut kawasan)*`;

  const lines: string[] = [
    itemLine,
    totalLine,
    `📅 *Tarikh:* ${dateText} (Delivery)`,
  ];

  if (orderMeta?.area) {
    lines.push(`📍 *Kawasan:* ${orderMeta.area}`);
  }
  if (orderMeta?.agentName) {
    lines.push(`🧕 *Agen:* ${orderMeta.agentName}`);
  }
  if (orderMeta?.notes?.trim()) {
    lines.push(`📝 *Nota:* ${orderMeta.notes.trim()}`);
  }

  const text = `Salam Team FrozenBergerak, nak buat pesanan awal:

${lines.join("\n")}

➕ *(Boleh tambah item masa sampai)*
Mohon sahkan stok & caj ya. Terima kasih!`;

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
  const fixedItems = safeItems.filter((item) => !isProductPriceHidden(item?.product));
  const hasHiddenPriceItems = safeItems.some((item) => isProductPriceHidden(item?.product));
  const subtotal = fixedItems.reduce(
    (acc, item) => acc + (Number(item?.product?.price) || 0) * (Number(item?.quantity) || 1),
    0
  );

  const formattedItems = safeItems.map((item) => {
    const p = item?.product;
    const itemPrice = Number(p?.price) || 0;
    const itemQty = Number(item?.quantity) || 1;
    if (isProductPriceHidden(p)) {
      return `${p?.name || "Produk"} ×${itemQty} (Disahkan team)`;
    }
    return `${p?.name || "Produk"} ×${itemQty} (${formatCurrency(itemPrice * itemQty)})`;
  });

  const itemLine =
    formattedItems.length <= 1
      ? `📦 *Item:* ${formattedItems[0] || "- Tiada item"}`
      : `📦 *Item:*\n${formattedItems.map((entry, idx) => `${idx + 1}. ${entry}`).join("\n")}`;

  const deliveryFeeNote =
    typeof customer?.deliveryFee === "number" && customer.deliveryFee > 0
      ? `*(+ caj COD ${formatCurrency(customer.deliveryFee)})*`
      : `*(+ caj COD ikut kawasan)*`;

  const totalAmountText =
    fixedItems.length === 0 && hasHiddenPriceItems
      ? "Disahkan team"
      : hasHiddenPriceItems
      ? `*${formatCurrency(subtotal)}* + item pakej`
      : `*${formatCurrency(subtotal)}*`;

  const deliveryShort =
    customer?.deliveryType === "ambil_sendiri" ? "Pickup <11 pagi" : "Delivery";

  const plannedDateText = formatReadableDate(customer?.plannedDate);

  const lines: string[] = [
    itemLine,
    `💰 *Jumlah:* ${totalAmountText} ${deliveryFeeNote}`,
    `📅 *Tarikh:* ${plannedDateText} (${deliveryShort})`,
    `📍 *Kawasan:* ${customer?.deliveryArea || "-"}`,
    `🧕 *Agen:* ${customer?.agentName || "-"}`,
  ];

  const customerName = customer?.name?.trim();
  const customerPhone = customer?.phone?.trim();
  if (customerName && customerPhone) {
    lines.push(`👤 *Nama:* ${customerName} (${customerPhone})`);
  } else if (customerName) {
    lines.push(`👤 *Nama:* ${customerName}`);
  } else if (customerPhone) {
    lines.push(`👤 *Pelanggan:* ${customerPhone}`);
  }

  if (customer?.deliveryType === "penghantaran" && customer?.address?.trim()) {
    lines.push(`🏠 *Alamat:* ${customer.address.trim()}`);
  }
  if (customer?.notes?.trim()) {
    lines.push(`📝 *Nota:* ${customer.notes.trim()}`);
  }

  const text = `Salam Team FrozenBergerak, nak buat pesanan awal:

${lines.join("\n")}

➕ *(Boleh tambah item masa sampai)*
Mohon sahkan stok & caj ya. Terima kasih!`;

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
  const deliveryShort =
    params.deliveryType === "ambil_sendiri" ? "Pickup <11 pagi" : "Delivery";

  const lines: string[] = [
    `📦 *Item:* Pilih semasa penghantaran (Disahkan team)`,
    `💰 *Jumlah:* Disahkan team *(+ caj COD ikut kawasan)*`,
    `📅 *Tarikh:* ${plannedDateText} (${deliveryShort})`,
    `📍 *Kawasan:* ${params.areaName}`,
    `🧕 *Agen:* ${params.agentName}`,
  ];

  const customerName = params.customerName?.trim();
  const customerPhone = params.customerPhone?.trim();
  if (customerName && customerPhone) {
    lines.push(`👤 *Nama:* ${customerName} (${customerPhone})`);
  } else if (customerName) {
    lines.push(`👤 *Nama:* ${customerName}`);
  } else if (customerPhone) {
    lines.push(`👤 *Pelanggan:* ${customerPhone}`);
  }

  if (params.address?.trim() && params.deliveryType !== "ambil_sendiri") {
    lines.push(`🏠 *Alamat:* ${params.address.trim()}`);
  }
  if (params.notes?.trim()) {
    lines.push(`📝 *Nota:* ${params.notes.trim()}`);
  }

  const text = `Salam Team FrozenBergerak, nak tempah slot pesanan awal:

${lines.join("\n")}

➕ *(Boleh tambah item masa sampai)*
Mohon sahkan slot & caj ya. Terima kasih!`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
