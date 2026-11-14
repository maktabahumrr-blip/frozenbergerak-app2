/**
 * Konfigurasi berpusat bagi Google Apps Script Web App & Google Sheets Jadual (Tab JADUAL).
 * Semua fungsi fetch dan post jadual merujuk kepada URL ini.
 */
export const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL?.trim() ||
  "https://script.google.com/macros/s/AKfycbwqmpIZqNqpSxLGW-baulbHN-6Z7iJbVzzAn_yyB8ytNag32l_1ksoAVRZqLBEAEyOw/exec";
