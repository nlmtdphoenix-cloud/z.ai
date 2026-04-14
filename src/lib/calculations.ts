import { STANDARD_WORK_HOURS } from './constants';

export function calculateWorkHours(startTime: string, endTime: string, breakMinutes: number): number {
  if (!startTime || !endTime) return 0;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  totalMinutes -= breakMinutes;

  if (totalMinutes < 0) return 0;
  return Math.round((totalMinutes / 60) * 100) / 100;
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
