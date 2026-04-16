import { db } from '@/lib/db';
import { PUBLIC_HOLIDAYS_2025, PUBLIC_HOLIDAYS_2026 } from '@/lib/constants';

type MonthDays = Record<number, number[]>;

const HARDCODED: Record<number, MonthDays> = {
  2025: PUBLIC_HOLIDAYS_2025,
  2026: PUBLIC_HOLIDAYS_2026,
};

const cache = new Map<number, MonthDays>();

export function getPublicHolidaysSync(year: number): MonthDays {
  if (cache.has(year)) return cache.get(year)!;
  return HARDCODED[year] ?? {};
}

export function isPublicHolidaySync(year: number, month: number, day: number): boolean {
  return getPublicHolidaysSync(year)[month]?.includes(day) ?? false;
}

export async function loadHolidaysForYear(year: number): Promise<MonthDays> {
  try {
    const rows = await db.holiday.findMany({ where: { year } });
    if (rows.length === 0) {
      const fallback = HARDCODED[year] ?? {};
      cache.set(year, fallback);
      return fallback;
    }
    const map: MonthDays = {};
    for (const r of rows) {
      (map[r.month] ||= []).push(r.day);
    }
    cache.set(year, map);
    return map;
  } catch {
    return HARDCODED[year] ?? {};
  }
}

export function registerHolidays(year: number, map: MonthDays) {
  cache.set(year, map);
}

export function clearHolidayCache() {
  cache.clear();
}
