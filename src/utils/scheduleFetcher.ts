import { ScheduleItem } from "../types";
import { fetchSchedulesFromFirestore } from "../lib/firebase";
import { getTodayDateInfo } from "./scheduleDateHelper";

export interface ScheduleFetchResult {
  schedules: ScheduleItem[];
  source: "firebase_database" | "google_apps_script" | "google_sheet_jadual" | "sample_fallback" | "local_cache";
  warning?: string;
  isFallback: boolean;
}

/**
 * Parses raw CSV text into an array of rows (accounting for quotes and commas)
 */
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Extracts a Google Spreadsheet ID from a URL, link, or ID string
 */
export function extractGoogleSheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    return pubMatch[1];
  }
  if (!trimmed.includes("/") && !trimmed.includes("http")) {
    return trimmed;
  }
  return "";
}

/**
 * Generate rich, dynamic sample fallback schedule records matching the 4 delivery teams
 * Always uses today's date so it cleanly passes today-filters and displays active routes.
 */
export function getDynamicFallbackSchedules(): ScheduleItem[] {
  const todayInfo = getTodayDateInfo();
  const todayDateString = todayInfo.formattedLong;

  return [
    {
      id: "JAD-01",
      teamName: "Team Putrajaya & Cyberjaya",
      driverName: "Team Putrajaya & Cyberjaya",
      date: todayDateString,
      timeSlot: "10:00 PG - 1:00 PTG",
      locations: "Kawasan Putrajaya & Cyberjaya (Presint 1-18, Cyberia, Shaftsbury)",
      notes: "Sedia menghantar kambing perap, oden & dim sum panas ke pintu rumah",
      status: "Sedang Bergerak",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "JAD-02",
      teamName: "Team Bangi & Kajang",
      driverName: "Team Bangi & Kajang",
      date: todayDateString,
      timeSlot: "2:00 PTG - 5:00 PTG",
      locations: "Kawasan Bangi & Kajang (Bandar Baru Bangi, Sg Chua, Prima Saujana)",
      notes: "Slot petang dibuka untuk penghantaran kawasan kediaman",
      status: "Akan Datang",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "JAD-03",
      teamName: "Team Shah Alam & Subang",
      driverName: "Team Shah Alam & Subang",
      date: todayDateString,
      timeSlot: "5:30 PTG - 8:30 MLM",
      locations: "Kawasan Shah Alam & Subang (Seksyen 7, 9, 13, USJ, Subang Jaya)",
      notes: "Sesi petang/malam untuk persiapan makan malam & bekalan hujung minggu",
      status: "Akan Datang",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "JAD-04",
      teamName: "Team Seremban & Nilai",
      driverName: "Team Seremban & Nilai",
      date: todayDateString,
      timeSlot: "9:30 PG - 12:30 TGH",
      locations: "Kawasan Seremban & Nilai (Bandar Ainsdale, Senawang, Bandar Baru Nilai)",
      notes: "Laluan sesi pagi telah selesai. Pesanan seterusnya dihantar pada pusingan esok.",
      status: "Selesai",
      lastUpdated: new Date().toISOString()
    }
  ];
}

/**
 * Fetch Google Sheets CSV directly for tab 'JADUAL'
 */
async function fetchGoogleSheetsJadualCsv(sheetId: string): Promise<ScheduleItem[] | null> {
  const tabNames = ["JADUAL", "jadual", "Jadual", "JADUAL_PERGERAKAN", "SCHEDULE"];
  
  for (const tab of tabNames) {
    const enc = encodeURIComponent(tab);
    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${enc}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${enc}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${enc}`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "text/csv, text/plain, */*" },
          signal: AbortSignal.timeout(3500)
        });

        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 10) {
            const rows = parseCSVRows(text);
            if (rows.length >= 2) {
              const headerRow = rows[0].map(h => h.trim().toUpperCase());
              
              const findIndex = (possibleNames: string[]): number => {
                for (const name of possibleNames) {
                  const idx = headerRow.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
                  if (idx !== -1) return idx;
                }
                return -1;
              };

              const idIdx = findIndex(["ID JADUAL", "ID", "KOD", "NO"]);
              const teamIdx = findIndex(["NAMA TEAM", "TEAM", "DRIVER", "PEMANDU", "NAMA"]);
              const dateIdx = findIndex(["TARIKH", "DATE", "HARI"]);
              const timeIdx = findIndex(["MASA", "TIME", "WAKTU", "SLOT"]);
              const locIdx = findIndex(["KAWASAN", "LOCATION", "LOKASI", "LALUAN"]);
              const notesIdx = findIndex(["CATATAN", "NOTES", "NOTA", "INFO"]);
              const statusIdx = findIndex(["STATUS", "KEADAAN"]);

              const parsedItems: ScheduleItem[] = [];
              for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                if (!row || row.length === 0 || row.every(c => !c.trim())) continue;

                const id = (idIdx !== -1 && row[idIdx]) ? row[idIdx].trim() : `JAD-${r.toString().padStart(2, "0")}`;
                const teamName = (teamIdx !== -1 && row[teamIdx]) ? row[teamIdx].trim() : "Team Frozen 1";
                const date = (dateIdx !== -1 && row[dateIdx]) ? row[dateIdx].trim() : "Hari Ini";
                const timeSlot = (timeIdx !== -1 && row[timeIdx]) ? row[timeIdx].trim() : "Waktu Operasi";
                const locations = (locIdx !== -1 && row[locIdx]) ? row[locIdx].trim() : "";
                const notes = (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx].trim() : "";
                
                let rawStatus = (statusIdx !== -1 && row[statusIdx]) ? row[statusIdx].trim() : "Sedang Bergerak";
                let status: "Akan Datang" | "Sedang Bergerak" | "Selesai" = "Sedang Bergerak";
                const lower = rawStatus.toLowerCase();
                if (lower.includes("selesai") || lower.includes("tamat") || lower.includes("done")) {
                  status = "Selesai";
                } else if (lower.includes("akan") || lower.includes("upcoming") || lower.includes("pending")) {
                  status = "Akan Datang";
                }

                if (locations) {
                  parsedItems.push({
                    id,
                    teamName,
                    driverName: teamName,
                    date,
                    timeSlot,
                    locations,
                    notes,
                    status,
                    lastUpdated: new Date().toISOString()
                  });
                }
              }

              if (parsedItems.length > 0) {
                return parsedItems;
              }
            }
          }
        }
      } catch {
        // Try next endpoint
      }
    }
  }

  return null;
}

/**
 * Master Schedule Fetcher complying with:
 * 1. Read Schedule data from Google Sheets API / CSV URL as fallback if Firebase Database is empty.
 * 2. Ensure Firebase initialization does not block public access to fetch 'JADUAL' tab data.
 * 3. Add error handling and console logs so if Google Sheets sync fails, it shows a clear warning
 *    and sample fallback data instead of breaking the entire schedule UI.
 */
export async function fetchScheduleWithFallback(customSheetUrlOrId?: string): Promise<ScheduleFetchResult> {
  console.log("[ScheduleSync] 🔄 Memulakan pengambilan data jadual pergerakan...");

  // RULE 2: Non-blocking Firebase check. Public visitors are NEVER blocked by Firebase.
  try {
    const firestoreSchedules = await fetchSchedulesFromFirestore();
    if (firestoreSchedules && firestoreSchedules.length > 0) {
      console.log(`[ScheduleSync] ✅ Data jadual berjaya dimuatkan dari Firebase Database (${firestoreSchedules.length} rekod).`);
      return {
        schedules: firestoreSchedules,
        source: "firebase_database",
        isFallback: false
      };
    }
    console.warn("[ScheduleSync] ℹ️ Firebase Database tiada rekod atau kosong. Meneruskan ke Google Sheets tab JADUAL sebagai sandaran...");
  } catch (firebaseErr: any) {
    console.warn("[ScheduleSync] ⚠️ Ralat Firebase Database (tidak menghalang akses awam):", firebaseErr?.message || firebaseErr);
  }

  // RULE 1: Read Schedule data directly from Google Sheets API / CSV URL
  let sheetId = "";
  try {
    const customSheet = customSheetUrlOrId || (typeof window !== "undefined" && window.localStorage ? (localStorage.getItem("custom_google_sheet_url") || "") : "");
    sheetId = extractGoogleSheetId(customSheet);
  } catch {}

  // 1. Try server endpoint /api/schedule
  try {
    console.log("[ScheduleSync] 🌐 Mengambil data jadual dari pelayan (/api/schedule)...");
    const queryParam = sheetId ? `?sheet=${encodeURIComponent(sheetId)}` : "";
    const res = await fetch(`/api/schedule${queryParam}`, { signal: AbortSignal.timeout(4000) });
    
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
        console.log(`[ScheduleSync] ✅ Data jadual berjaya disegerakkan dari pelayan (${data.schedules.length} rekod, sumber: ${data.source}).`);
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(data.schedules));
        } catch {}
        return {
          schedules: data.schedules,
          source: (data.source === "google_apps_script" || data.source === "google_sheet_jadual") 
            ? data.source 
            : "local_cache",
          isFallback: false
        };
      }
    }
  } catch (serverErr: any) {
    console.warn("[ScheduleSync] ⚠️ Ralat semasa memanggil /api/schedule:", serverErr?.message || serverErr);
  }

  // 2. Try direct client-side Google Sheets CSV fetch for tab 'JADUAL'
  if (sheetId) {
    try {
      console.log(`[ScheduleSync] 📊 Mencuba membaca tab JADUAL secara terus dari Google Sheet ID: ${sheetId}...`);
      const directItems = await fetchGoogleSheetsJadualCsv(sheetId);
      if (directItems && directItems.length > 0) {
        console.log(`[ScheduleSync] ✅ Berjaya membaca ${directItems.length} rekod dari Google Sheets tab JADUAL secara terus.`);
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(directItems));
        } catch {}
        return {
          schedules: directItems,
          source: "google_sheet_jadual",
          isFallback: false
        };
      }
    } catch (directErr: any) {
      console.warn("[ScheduleSync] ⚠️ Ralat membaca Google Sheets CSV tab JADUAL:", directErr?.message || directErr);
    }
  }

  // Check locally saved schedules from previous sessions
  try {
    const saved = localStorage.getItem("frozen_schedules");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[ScheduleSync] 📦 Menggunakan jadual yang disimpan dalam memori tempatan (${parsed.length} rekod).`);
        return {
          schedules: parsed,
          source: "local_cache",
          isFallback: false
        };
      }
    }
  } catch {}

  // RULE 3: Google Sheets sync failed or unconfigured -> show clear warning and sample fallback data
  console.error("[ScheduleSync] ❌ Penyegerakan Google Sheets tab JADUAL gagal atau tiada URL dikonfigurasi.");
  console.info("[ScheduleSync] 🛡️ Memaparkan sampel data jadual sandaran terkini untuk memastikan antaramuka jadual berfungsi sepenuhnya.");

  const fallbackSchedules = getDynamicFallbackSchedules();
  return {
    schedules: fallbackSchedules,
    source: "sample_fallback",
    isFallback: true,
    warning: "Peringatan: Sambungan ke Google Sheets tab JADUAL sedang diselaraskan. Memaparkan jadual pergerakan sandaran terkini."
  };
}
