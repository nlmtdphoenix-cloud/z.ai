import type { WorkType, UserRole, TimesheetStatus, ReportType, TaskCategory, UserGrade } from './types';

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
  ZENHAN: '前半（1〜15日）',
  KOHAN: '後半（16日〜末日）',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  ZENHAN: 'bg-emerald-50 text-emerald-700',
  KOHAN: 'bg-sky-50 text-sky-700',
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

export const GRADE_LABELS: Record<string, string> = {
  '社長': '社長',
  'G2': 'G2（部長）',
  'M1': 'M1（マネージャー）',
  'M2': 'M2（マネージャー）',
  'L1': 'L1（SGL）',
  'L2': 'L2（GL）',
  'TL': 'TL（チームリーダー）',
  'S1': 'S1',
  'S2': 'S2',
  'S3': 'S3',
  'S4': 'S4',
};

export const GRADE_SHORT_LABELS: Record<string, string> = {
  '社長': '社長', 'G2': 'G2', 'M1': 'M1', 'M2': 'M2',
  'L1': 'L1', 'L2': 'L2', 'TL': 'TL',
  'S1': 'S1', 'S2': 'S2', 'S3': 'S3', 'S4': 'S4',
};

export const GRADE_COLORS: Record<string, string> = {
  '社長': 'bg-red-100 text-red-800 border-red-300',
  'G2':   'bg-purple-100 text-purple-800 border-purple-300',
  'M1':   'bg-blue-100 text-blue-800 border-blue-300',
  'M2':   'bg-blue-100 text-blue-800 border-blue-300',
  'L1':   'bg-teal-100 text-teal-800 border-teal-300',
  'L2':   'bg-cyan-100 text-cyan-800 border-cyan-300',
  'TL':   'bg-orange-100 text-orange-800 border-orange-300',
  'S1':   'bg-gray-100 text-gray-700 border-gray-300',
  'S2':   'bg-gray-100 text-gray-700 border-gray-300',
  'S3':   'bg-gray-100 text-gray-600 border-gray-200',
  'S4':   'bg-gray-100 text-gray-600 border-gray-200',
};

// Step numbers → 承認ステップ labels
export const APPROVAL_STEP_LABELS: Record<number, string> = {
  1: 'M承認待ち',
  2: 'G2承認待ち',
  3: '社長承認待ち',
};

export const APPROVAL_STEP_COLORS: Record<number, string> = {
  1: 'bg-amber-50 text-amber-700 border-amber-200',
  2: 'bg-violet-50 text-violet-700 border-violet-200',
  3: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const GRADE_OPTIONS: { value: UserGrade; label: string }[] = [
  { value: '', label: '（なし）' },
  { value: '社長', label: '社長' },
  { value: 'G2', label: 'G2（部長）' },
  { value: 'M1', label: 'M1（マネージャー）' },
  { value: 'M2', label: 'M2（マネージャー）' },
  { value: 'L1', label: 'L1（SGL）' },
  { value: 'L2', label: 'L2（GL）' },
  { value: 'TL', label: 'TL（チームリーダー）' },
  { value: 'S1', label: 'S1' },
  { value: 'S2', label: 'S2' },
  { value: 'S3', label: 'S3' },
  { value: 'S4', label: 'S4' },
];

const HARDCODED_HOLIDAYS: Record<number, Record<number, number[]>> = {
  2025: PUBLIC_HOLIDAYS_2025,
  2026: PUBLIC_HOLIDAYS_2026,
};

export function isPublicHoliday(year: number, month: number, day: number): boolean {
  const holidays = HARDCODED_HOLIDAYS[year];
  if (!holidays) return false;
  return holidays[month]?.includes(day) ?? false;
}
