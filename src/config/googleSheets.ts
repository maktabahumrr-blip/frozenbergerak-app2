/**
 * Konfigurasi berpusat bagi Google Apps Script Web App & Google Sheets Jadual (Tab JADUAL).
 * Semua fungsi fetch dan post jadual merujuk kepada URL ini.
 */
export const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL?.trim() ||
  "https://script.google.com/macros/s/AKfycbyaZor09_xe666Ii7sa2AR-Z3dYG0H2iOf-fgcxQkrl1vyI99XKJ9cPXJRJX68r1bNM/exec";
