import { buildUnifiedAppsScriptCode } from "./appsScriptTemplate";

/**
 * Konfigurasi berpusat bagi Google Apps Script Web App & Google Sheets Jadual (Tab JADUAL).
 * Semua fungsi fetch dan post jadual merujuk kepada URL ini.
 */
export const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  import.meta.env?.VITE_GOOGLE_APPS_SCRIPT_URL?.trim() ||
  "https://script.google.com/macros/s/AKfycbwjh60yvGtO627Nc5zs24IThg_yHUVSEA2V60KK5ObQ7b2hM7OBPbojXJcHvVCjC620/exec";

/**
 * Kod Google Apps Script lengkap (1 fail menguruskan doGet & doPost untuk 2 fail Google Sheets):
 * 1. Fail "Frozen Bergerak" -> Produk, Promo Bermusim (Seasonal), Promo All-Time (Alltimepromo)
 * 2. Fail "Jadual Team"     -> Jadual Pergerakan (JADUAL)
 */
export const UNIFIED_APPS_SCRIPT_CODE = buildUnifiedAppsScriptCode();
