import { ScheduleItem } from "../types";
import { fetchSchedulesFromFirestore } from "../lib/firebase";
import { GOOGLE_APPS_SCRIPT_WEB_APP_URL } from "../config/googleSheets";

export interface ScheduleFetchResult {
  schedules: ScheduleItem[];
  source: "firebase_database" | "google_apps_script" | "google_sheet_jadual" | "sync_error";
  warning?: string;
  error?: string;
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
      if (currentRow.some((c) => c.length > 0)) {
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
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeStatus(rawStatus: string): "Akan Datang" | "Sedang Bergerak" | "Selesai" {
  const lower = String(rawStatus || "").toLowerCase();
  if (lower.includes("selesai") || lower.includes("tamat") || lower.includes("done")) {
    return "Selesai";
  }
  if (lower.includes("akan") || lower.includes("upcoming") || lower.includes("pending")) {
    return "Akan Datang";
  }
  return "Sedang Bergerak";
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
 * Parses schedule rows from a CSV matrix into ScheduleItem[]
 */
function parseScheduleRowsFromMatrix(rows: string[][]): ScheduleItem[] {
  if (!rows || rows.length < 2) return [];
  const headerRow = rows[0].map((h) => String(h).trim().toUpperCase());

  const findIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = headerRow.findIndex((h) => h === name.toUpperCase() || h.includes(name.toUpperCase()));
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
    if (!row || row.length === 0 || row.every((c) => !String(c).trim())) continue;

    const id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `JAD-${r.toString().padStart(2, "0")}`;
    const teamName = teamIdx !== -1 && row[teamIdx] ? String(row[teamIdx]).trim() : "Team Frozen 1";
    const date = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : "Hari Ini";
    const timeSlot = timeIdx !== -1 && row[timeIdx] ? String(row[timeIdx]).trim() : "Waktu Operasi";
    const locations = locIdx !== -1 && row[locIdx] ? String(row[locIdx]).trim() : "";
    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : "";
    const rawStatus = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "Sedang Bergerak";

    if (locations) {
      parsedItems.push({
        id,
        teamName,
        driverName: teamName,
        date,
        timeSlot,
        locations,
        notes,
        status: normalizeStatus(rawStatus),
        lastUpdated: new Date().toISOString()
      });
    }
  }

  return parsedItems;
}

/**
 * Fetch Google Sheets CSV directly for tab 'JADUAL'
 */
async function fetchGoogleSheetsJadualCsv(sheetId: string): Promise<ScheduleItem[] | null> {
  const tabNames = ["JADUAL", "jadual", "Jadual", "JADUAL_PERGERAKAN", "SCHEDULE"];
  const cacheBuster = Date.now();

  for (const tab of tabNames) {
    const enc = encodeURIComponent(tab);
    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${enc}&_t=${cacheBuster}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${enc}&_t=${cacheBuster}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${enc}&_t=${cacheBuster}`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "text/csv, text/plain, */*" },
          cache: "no-store",
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 5) {
            const rows = parseCSVRows(text);
            if (rows.length >= 1) {
              return parseScheduleRowsFromMatrix(rows);
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
 * Direct client-side fetch to the configured Google Apps Script Web App URL (Tab JADUAL)
 */
async function fetchDirectFromAppsScript(): Promise<{ schedules: ScheduleItem[]; connected: boolean }> {
  if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
    return { schedules: [], connected: false };
  }

  const cacheBuster = Date.now();
  const tryUrls = [
    `${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=getSchedules&sheet=JADUAL&_t=${cacheBuster}`,
    `${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?_t=${cacheBuster}`
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json, text/plain, */*" },
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) continue;

      const text = (await res.text()).trim();
      if (!text || text.startsWith("<") || text.toLowerCase().includes("<html") || text.includes("accounts.google.com")) {
        continue;
      }

      if (text.startsWith("{") || text.startsWith("[")) {
        const json = JSON.parse(text);
        let rawItems: any[] | null = null;

        if (Array.isArray(json)) {
          rawItems = json;
        } else if (json && typeof json === "object") {
          if (Array.isArray(json.schedules)) rawItems = json.schedules;
          else if (Array.isArray(json.data)) rawItems = json.data;
          else if (Array.isArray(json.records)) rawItems = json.records;
          else if (Array.isArray(json.rows)) rawItems = json.rows;
          else if (Array.isArray(json.JADUAL)) rawItems = json.JADUAL;
          else if (Array.isArray(json.jadual)) rawItems = json.jadual;
        }

        if (rawItems !== null) {
          if (rawItems.length === 0) {
            return { schedules: [], connected: true };
          }
          if (Array.isArray(rawItems[0])) {
            return { schedules: parseScheduleRowsFromMatrix(rawItems as string[][]), connected: true };
          }
          const parsed: ScheduleItem[] = [];
          for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i];
            if (!item || typeof item !== "object") continue;
            const id = String(item["ID JADUAL"] || item["ID"] || item.id || item.idJadual || `JAD-${(i + 1).toString().padStart(2, "0")}`).trim();
            const teamName = String(item["NAMA TEAM"] || item["TEAM"] || item.teamName || item.namaTeam || item.driverName || "Team Frozen 1").trim();
            const date = String(item["TARIKH"] || item["DATE"] || item.date || item.tarikh || "Hari Ini").trim();
            const timeSlot = String(item["MASA"] || item["TIME"] || item.timeSlot || item.masa || "Waktu Operasi").trim();
            const locations = String(item["KAWASAN"] || item["LOCATION"] || item.locations || item.kawasan || "").trim();
            const notes = String(item["CATATAN"] || item["NOTES"] || item.notes || item.catatan || "").trim();
            const status = normalizeStatus(item["STATUS"] || item.status || "Sedang Bergerak");

            if (locations) {
              parsed.push({
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
          return { schedules: parsed, connected: true };
        }
      }
    } catch {
      // Try next URL
    }
  }

  return { schedules: [], connected: false };
}

/**
 * Strict Live Schedule Fetcher:
 * Only renders live schedule data from Google Sheets (Apps Script / JADUAL CSV) or Firebase Database.
 * Never falls back to hardcoded mock data or stale offline schedules.
 */
export async function fetchScheduleWithFallback(customSheetUrlOrId?: string): Promise<ScheduleFetchResult> {
  console.log("[ScheduleSync] 🔄 Menyegerakkan data jadual langsung dari Google Sheets / Firebase...");

  let sheetId = "";
  try {
    const customSheet =
      customSheetUrlOrId ||
      (typeof window !== "undefined" && window.localStorage ? localStorage.getItem("custom_google_sheet_url") || "" : "");
    sheetId = extractGoogleSheetId(customSheet);
  } catch {}

  let serverDeletedIds: string[] = [];

  // 1. Fetch live schedule state from server endpoint (/api/schedule -> Google Apps Script Web App / JADUAL tab)
  try {
    const params = new URLSearchParams();
    if (sheetId) params.set("sheet", sheetId);
    params.set("_t", String(Date.now()));

    const res = await fetch(`/api/schedule?${params.toString()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(9000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deletedIds)) {
        serverDeletedIds = data.deletedIds;
      }

      if (
        data &&
        Array.isArray(data.schedules) &&
        (data.source === "google_apps_script" || data.source === "google_sheet_jadual")
      ) {
        const filtered = data.schedules.filter((s: any) => !serverDeletedIds.includes(s.id));
        if (filtered.length > 0) {
          console.log(`[ScheduleSync] ✅ Data jadual langsung dimuatkan (${filtered.length} rekod, sumber: ${data.source}).`);
          return {
            schedules: filtered,
            source: data.source,
            isFallback: false
          };
        }

        // If Google Sheets returned 0 rows, check Firebase Database for any live records before returning empty
        try {
          const firestoreSchedules = await fetchSchedulesFromFirestore();
          const filteredFirestore = firestoreSchedules.filter((s) => !serverDeletedIds.includes(s.id));
          if (filteredFirestore.length > 0) {
            return {
              schedules: filteredFirestore,
              source: "firebase_database",
              isFallback: false
            };
          }
        } catch {}

        return {
          schedules: [],
          source: data.source,
          isFallback: false
        };
      }
    }
  } catch (serverErr: any) {
    console.warn("[ScheduleSync] ⚠️ Ralat /api/schedule, mencuba sambungan langsung ke Google Apps Script:", serverErr?.message || serverErr);
  }

  // 2. Direct client-side fetch to Google Apps Script Web App URL (Tab JADUAL)
  try {
    const directAppsScript = await fetchDirectFromAppsScript();
    if (directAppsScript.connected) {
      const filteredDirect = directAppsScript.schedules.filter((s) => !serverDeletedIds.includes(s.id));
      if (filteredDirect.length > 0) {
        console.log(`[ScheduleSync] ✅ Data jadual langsung dari Apps Script Web App (${filteredDirect.length} rekod).`);
        return {
          schedules: filteredDirect,
          source: "google_apps_script",
          isFallback: false
        };
      }

      // Check Firebase Database if Apps Script sheet currently has 0 rows
      try {
        const firestoreSchedules = await fetchSchedulesFromFirestore();
        const filteredFirestore = firestoreSchedules.filter((s) => !serverDeletedIds.includes(s.id));
        if (filteredFirestore.length > 0) {
          return {
            schedules: filteredFirestore,
            source: "firebase_database",
            isFallback: false
          };
        }
      } catch {}

      return {
        schedules: [],
        source: "google_apps_script",
        isFallback: false
      };
    }
  } catch (gasErr: any) {
    console.warn("[ScheduleSync] ⚠️ Ralat sambungan langsung Google Apps Script:", gasErr?.message || gasErr);
  }

  // 3. Direct client-side Google Sheets CSV fetch for tab 'JADUAL' (if custom sheet ID configured)
  if (sheetId) {
    try {
      const directItems = await fetchGoogleSheetsJadualCsv(sheetId);
      if (directItems !== null) {
        const filteredDirect = directItems.filter((s) => !serverDeletedIds.includes(s.id));
        return {
          schedules: filteredDirect,
          source: "google_sheet_jadual",
          isFallback: false
        };
      }
    } catch (directErr: any) {
      console.warn("[ScheduleSync] ⚠️ Ralat membaca Google Sheets CSV tab JADUAL:", directErr?.message || directErr);
    }
  }

  // 4. Live Firebase Database fallback (only live cloud records, never mock data)
  try {
    const firestoreSchedules = await fetchSchedulesFromFirestore();
    if (firestoreSchedules && firestoreSchedules.length > 0) {
      const filteredFirestore = firestoreSchedules.filter((s) => !serverDeletedIds.includes(s.id));
      if (filteredFirestore.length > 0) {
        console.log(`[ScheduleSync] ✅ Data jadual dimuatkan dari Firebase Database (${filteredFirestore.length} rekod).`);
        return {
          schedules: filteredFirestore,
          source: "firebase_database",
          isFallback: false
        };
      }
    }
  } catch (firebaseErr: any) {
    console.warn("[ScheduleSync] ⚠️ Ralat Firebase Database:", firebaseErr?.message || firebaseErr);
  }

  // 5. All live sources failed — return strict sync_error (NEVER hardcoded mock data)
  console.error("[ScheduleSync] ❌ Gagal menyegerakkan jadual langsung daripada Google Sheets atau Firebase.");
  return {
    schedules: [],
    source: "sync_error",
    isFallback: false,
    error: "Gagal memuatkan jadual langsung dari Google Sheets / Firebase. Sila semak sambungan internet dan tekan Cuba Lagi."
  };
}
