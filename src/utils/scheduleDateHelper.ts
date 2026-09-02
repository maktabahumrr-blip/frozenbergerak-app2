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
  // Malay
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
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

/**
 * Get dynamic formatted strings for today's date in Malay
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
 * Checks if a schedule item strictly matches TODAY's dynamic date.
 * Automatically excludes past dates (e.g. yesterday, 20 Ogos when today is 21 Ogos).
 */
export function isTodaySchedule(item: ScheduleItem, targetDate: Date = new Date()): boolean {
  if (!item || !item.date) return false;

  const todayInfo = getTodayDateInfo(targetDate);
  const rawDateStr = item.date.trim();
  const lower = rawDateStr.toLowerCase();

  // 1. Match ISO dates YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = rawDateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return y === todayInfo.year && m === todayInfo.monthIndex && d === todayInfo.day;
  }

  // 2. Match DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const slashMatch = rawDateStr.match(/(\d{1,2})[-/](\d{1,2})(?:[-/](\d{4}))?/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    const y = slashMatch[3] ? parseInt(slashMatch[3], 10) : todayInfo.year;
    return d === todayInfo.day && m === todayInfo.monthIndex && y === todayInfo.year;
  }

  // 3. Match named month e.g. "20 Ogos 2026", "21 Ogos", "21 August 2026"
  const textMonthMatch = lower.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (textMonthMatch) {
    const d = parseInt(textMonthMatch[1], 10);
    const monthKey = textMonthMatch[2];
    const y = textMonthMatch[3] ? parseInt(textMonthMatch[3], 10) : todayInfo.year;

    if (monthKey in MONTHS_MAP) {
      const m = MONTHS_MAP[monthKey];
      return d === todayInfo.day && m === todayInfo.monthIndex && y === todayInfo.year;
    }
  }

  // 4. If string contains literal "hari ini" or "today" without specific dates
  if (lower.includes("hari ini") || lower.includes("today")) {
    // If it also contains numbers that didn't match above, it might be an outdated "Hari Ini (20 Ogos)"
    // Check if any numbers exist in the string:
    const anyDigits = rawDateStr.match(/\b\d{1,2}\b/);
    if (anyDigits) {
      const num = parseInt(anyDigits[0], 10);
      // If the number doesn't match today's day, it's stale
      if (num !== todayInfo.day) {
        return false;
      }
    }

    // Check lastUpdated timestamp freshness if available
    if (item.lastUpdated) {
      try {
        const lastUpdatedDate = new Date(item.lastUpdated);
        if (!isNaN(lastUpdatedDate.getTime())) {
          const isSameDay =
            lastUpdatedDate.getDate() === todayInfo.day &&
            lastUpdatedDate.getMonth() === todayInfo.monthIndex &&
            lastUpdatedDate.getFullYear() === todayInfo.year;
          return isSameDay;
        }
      } catch {
        // Fallback to true if unparseable
      }
    }
    return true;
  }

  // If no date patterns matched and doesn't say "hari ini", check lastUpdated timestamp
  if (item.lastUpdated) {
    try {
      const lastUpdatedDate = new Date(item.lastUpdated);
      if (!isNaN(lastUpdatedDate.getTime())) {
        return (
          lastUpdatedDate.getDate() === todayInfo.day &&
          lastUpdatedDate.getMonth() === todayInfo.monthIndex &&
          lastUpdatedDate.getFullYear() === todayInfo.year
        );
      }
    } catch {
      // Fallback
    }
  }

  return false;
}

/**
 * Filter schedules to only show active items for TODAY, up to a maximum of 3 items.
 */
export function getFilteredTodaySchedules(
  schedules: ScheduleItem[],
  maxCount: number = 3,
  targetDate: Date = new Date()
): ScheduleItem[] {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return [];
  }

  // Filter only schedules matching today
  const todayItems = schedules.filter((item) => isTodaySchedule(item, targetDate));

  // Return maximum of 3 items
  return todayItems.slice(0, maxCount);
}
