import type { WorkType, UserRole, TimesheetStatus, ReportType, TaskCategory } from './types';

export const STANDARD_WORK_HOURS = 8;
export const DEFAULT_BREAK_MINUTES = 60;

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  REGULAR: '通常勤務',
  PUBLIC_HOLIDAY: '公休',
  ANNUAL_LEAVE_AM: '年休(午前)',
  ANNUAL_LEAVE_PM: '年休(午後)',
  ANNUAL_LEAVE_FULL: '年休(終日)',
  HOLIDAY_WORK: '休出',
  SPECIAL_LEAVE: '特休',
  ABSENCE: '欠勤',
  COMPENSATORY_LEAVE: '代休',
};

export const WORK_TYPE_COLORS: Record<WorkType, string> = {
  REGULAR: 'bg-blue-50 text-blue-700 border-blue-200',
  PUBLIC_HOLIDAY: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ANNUAL_LEAVE_AM: 'bg-green-50 text-green-700 border-green-200',
  ANNUAL_LEAVE_PM: 'bg-green-50 text-green-700 border-green-200',
  ANNUAL_LEAVE_FULL: 'bg-green-100 text-green-800 border-green-300',
  HOLIDAY_WORK: 'bg-orange-50 text-orange-700 border-orange-200',
  SPECIAL_LEAVE: 'bg-purple-50 text-purple-700 border-purple-200',
  ABSENCE: 'bg-red-50 text-red-700 border-red-200',
  COMPENSATORY_LEAVE: 'bg-teal-50 text-teal-700 border-teal-200',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '管理者',
  MANAGER: 'マネージャー',
  EMPLOYEE: '社員',
};

export const STATUS_LABELS: Record<TimesheetStatus, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済',
  APPROVED: '承認済',
  REJECTED: '差戻し',
};

export const STATUS_COLORS: Record<TimesheetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export const DAY_OF_WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];

export const MONTHS_JA = [
  '', '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

// Japanese public holidays 2025
export const PUBLIC_HOLIDAYS_2025: Record<number, number[]> = {
  1: [1, 13],    // 元日, 成人の日
  2: [11],       // 建国記念の日
  3: [20, 21],   // 春分の日, 振替休日
  4: [29],       // 昭和の日
  5: [3, 4, 5, 6], // 憲法記念日, 緑の日, こどもの日, 振替休日
  7: [21],       // 海の日
  8: [11],       // 山の日
  9: [15, 16, 23], // 敬老の日, 振替休日, 秋分の日
  10: [13],      // スポーツの日
  11: [3, 24],   // 文化の日, 振替休日
  12: [31],      // 大晦日
};

export const PUBLIC_HOLIDAYS_2026: Record<number, number[]> = {
  1: [1, 12],    // 元日, 成人の日
  2: [11],       // 建国記念の日
  3: [20, 21],   // 春分の日, 振替休日
  4: [29],       // 昭和の日
  5: [3, 4, 5, 6], // 憲法記念日, 緑の日, こどもの日, 振替休日
  7: [20],       // 海の日
  8: [11],       // 山の日
  9: [21, 22, 23], // 敬老の日, 振替休日, 秋分の日
  10: [12],      // スポーツの日
  11: [3, 23],   // 文化の日, 勤労感謝の日
  12: [31],      // 大晦日
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  FULL: '月末（全月）',
  HALF: '月半',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  FULL: 'bg-emerald-50 text-emerald-700',
  HALF: 'bg-sky-50 text-sky-700',
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  DESIGN: '設計業務',
  DRAFTING: '作図業務',
  MEETING: '打合せ',
  REVIEW: 'レビュー',
  OTHER: 'その他',
};

export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  DESIGN: 'bg-violet-50 text-violet-700 border-violet-200',
  DRAFTING: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  MEETING: 'bg-amber-50 text-amber-700 border-amber-200',
  REVIEW: 'bg-pink-50 text-pink-700 border-pink-200',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function isPublicHoliday(year: number, month: number, day: number): boolean {
  const holidays = year === 2025 ? PUBLIC_HOLIDAYS_2025 : PUBLIC_HOLIDAYS_2026;
  return holidays[month]?.includes(day) ?? false;
}
