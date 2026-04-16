import { STANDARD_WORK_HOURS } from './constants';

export function calculateWorkHours(startTime: string, endTime: string, breakMinutes: number): number {
  if (!startTime || !endTime) return 0;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  // Reject end <= start: caller should surface this as a validation error upstream
  if (endMin <= startMin) return 0;

  const totalMinutes = endMin - startMin - (breakMinutes || 0);
  if (totalMinutes <= 0) return 0;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
  return eh * 60 + em > sh * 60 + sm;
}

export function calculateOvertime(workHours: number, standard: number = STANDARD_WORK_HOURS): number {
  const overtime = workHours - standard;
  return overtime > 0 ? Math.round(overtime * 100) / 100 : 0;
}

export function calculateOverUnder(workHours: number, standard: number = STANDARD_WORK_HOURS): number {
  return Math.round((workHours - standard) * 100) / 100;
}

export function calculateMonthlyCumulative(entries: { day: number; workHours: number; overUnder: number }[], currentDay: number): number {
  return entries
    .filter(e => e.day <= currentDay && e.workHours > 0)
    .reduce((sum, e) => sum + e.overUnder, 0);
}
