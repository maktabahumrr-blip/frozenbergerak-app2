import { ScheduleItem } from "../types";

const MALAY_MONTHS = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember"
];

const MALAY_DAYS = [
  "Ahad",
  "Isnin",
  "Selasa",
  "Rabu",
  "Khamis",
  "Jumaat",
  "Sabtu"
];

const MONTHS_MAP: Record<string, number> = {
  // Malay & English
  januari: 0,
  jan: 0,
  january: 0,
  februari: 1,
  feb: 1,
  february: 1,
  mac: 2,
  mar: 2,
  march: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  jun: 5,
  june: 5,
  julai: 6,
  jul: 6,
  july: 6,
  ogos: 7,
  ogo: 7,
  aug: 7,
  august: 7,
  september: 8,
  sep: 8,
  sept: 8,
  oktober: 9,
  okt: 9,
  oct: 9,
  october: 9,
  november: 10,
  nov: 10,
  disember: 11,
  dis: 11,
  dec: 11,
  december: 11
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Get dynamic formatted strings for a given date in Malay
 */
export function getTodayDateInfo(targetDate: Date = new Date()) {
  const day = targetDate.getDate();
  const monthIndex = targetDate.getMonth();
  const year = targetDate.getFullYear();
  const dayIndex = targetDate.getDay();

  const dayName = MALAY_DAYS[dayIndex] || "Hari Ini";
  const monthName = MALAY_MONTHS[monthIndex] || "";

  return {
    day,
    monthIndex,
    year,
    dayName,
    monthName,
    formattedMalay: `${dayName}, ${day} ${monthName} ${year}`,
    formattedLong: `${dayName}, ${day} ${monthName} ${year}`,
    formattedShort: `${day} ${monthName} ${year}`,
    formattedHeading: `Hari Ini (${dayName}, ${day} ${monthName} ${year})`
  };
}

/**
 * Format YYYY-MM-DD ISO string into readable Malay date string
 */
export function formatIsoDateMalay(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const match = isoDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return isoDateStr;
  const parsed = new Date(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10)
  );
  if (isNaN(parsed.getTime())) return isoDateStr;
  return getTodayDateInfo(parsed).formattedMalay;
}

/**
 * Returns local today's ISO date string YYYY-MM-DD
 */
export function getLocalTodayIso(targetDate: Date = new Date()): string {
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a schedule item's date string (and optional lastUpdated fallback) into a local midnight Date.
 * Supports:
 * - YYYY-MM-DD / YYYY/MM/DD
 * - DD/MM/YYYY / DD-MM-YYYY
 * - Named Malay/English dates e.g. "Rabu, 26 Ogos 2026", "19 Nov 2026"
 * - Relative keywords ("hari ini", "today", "esok", "tomorrow")
 */
export function parseScheduleDate(
  rawDateStr?: string,
  lastUpdated?: string,
  referenceDate: Date = new Date()
): Date | null {
  const str = String(rawDateStr || "").trim();
  const refStart = startOfLocalDay(referenceDate);

  if (str) {
    const lower = str.toLowerCase();

    // 1. ISO dates YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return startOfLocalDay(parsed);
    }

    // 2. Named month e.g. "26 Ogos 2026", "19 November", "Sabtu, 21 Mac 2026"
    const textMonthMatch = lower.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);
    if (textMonthMatch) {
      const d = parseInt(textMonthMatch[1], 10);
      const monthKey = textMonthMatch[2];
      const y = textMonthMatch[3] ? parseInt(textMonthMatch[3], 10) : refStart.getFullYear();
      if (monthKey in MONTHS_MAP) {
        const parsed = new Date(y, MONTHS_MAP[monthKey], d);
        if (!isNaN(parsed.getTime())) return startOfLocalDay(parsed);
      }
    }

    // 3. DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
    const slashMatch = str.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
    if (slashMatch) {
      const d = parseInt(slashMatch[1], 10);
      const m = parseInt(slashMatch[2], 10) - 1;
      let y = refStart.getFullYear();
      if (slashMatch[3]) {
        const rawY = parseInt(slashMatch[3], 10);
        y = rawY < 100 ? 2000 + rawY : rawY;
      }
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return startOfLocalDay(parsed);
    }

    // 4. Relative "esok" / "tomorrow"
    if (lower.includes("esok") || lower.includes("tomorrow")) {
      const tomorrow = new Date(refStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return startOfLocalDay(tomorrow);
    }

    // 5. Relative "hari ini" / "today" without explicit parseable date above
    if (lower.includes("hari ini") || lower.includes("today")) {
      const anyDayNum = str.match(/\b(\d{1,2})\b/);
      if (anyDayNum) {
        const num = parseInt(anyDayNum[1], 10);
        if (num !== refStart.getDate()) {
          // Stale text such as "Hari Ini (18)" when today is 19 -> treat as yesterday/past
          const stale = new Date(refStart.getFullYear(), refStart.getMonth(), num);
          return startOfLocalDay(stale);
        }
      }
      if (lastUpdated) {
        const upd = new Date(lastUpdated);
        if (!isNaN(upd.getTime())) {
          return startOfLocalDay(upd);
        }
      }
      return refStart;
    }
  }

  // Fallback to lastUpdated only when date string is empty/unrecognized
  if (lastUpdated) {
    const upd = new Date(lastUpdated);
    if (!isNaN(upd.getTime())) {
      return startOfLocalDay(upd);
    }
  }

  return null;
}

/**
 * Checks if a schedule item strictly matches TODAY's dynamic date.
 */
export function isTodaySchedule(item: ScheduleItem, targetDate: Date = new Date()): boolean {
  if (!item || !item.date) return false;
  const parsed = parseScheduleDate(item.date, item.lastUpdated, targetDate);
  if (!parsed) return false;
  return parsed.getTime() === startOfLocalDay(targetDate).getTime();
}

/**
 * Returns true if the schedule date is TODAY or in the FUTURE (>= today 00:00 local time).
 * Past-dated schedules (< today) return false so they are automatically hidden.
 */
export function isTodayOrUpcomingSchedule(item: ScheduleItem, targetDate: Date = new Date()): boolean {
  if (!item || !item.date) return false;
  const parsed = parseScheduleDate(item.date, item.lastUpdated, targetDate);
  if (!parsed) return false;
  const todayStart = startOfLocalDay(targetDate);
  return parsed.getTime() >= todayStart.getTime();
}

/**
 * Returns only TODAY and FUTURE schedules, sorted chronologically (today first, upcoming ascending).
 */
export function getTodayAndUpcomingSchedules(
  schedules: ScheduleItem[],
  targetDate: Date = new Date()
): ScheduleItem[] {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return [];
  }

  const todayStart = startOfLocalDay(targetDate).getTime();

  return schedules
    .filter((item) => isTodayOrUpcomingSchedule(item, targetDate))
    .sort((a, b) => {
      const da = parseScheduleDate(a.date, a.lastUpdated, targetDate)?.getTime() ?? todayStart;
      const db = parseScheduleDate(b.date, b.lastUpdated, targetDate)?.getTime() ?? todayStart;
      return da - db;
    });
}

/**
 * Filter schedules to only show active items for TODAY, up to a maximum count.
 */
export function getFilteredTodaySchedules(
  schedules: ScheduleItem[],
  maxCount: number = 10,
  targetDate: Date = new Date()
): ScheduleItem[] {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return [];
  }
  const todayItems = schedules.filter((item) => isTodaySchedule(item, targetDate));
  return todayItems.slice(0, maxCount);
}
