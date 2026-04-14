import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { calculateWorkHours, calculateOverUnder } from '@/lib/calculations';
import { STANDARD_WORK_HOURS, DEFAULT_BREAK_MINUTES, PUBLIC_HOLIDAYS_2025, PUBLIC_HOLIDAYS_2026 } from '@/lib/constants';

// ============ Work Task Seed Data ============

/** Realistic projects per department */
const CAD_PROJECTS = [
  { project: '新東京タワー', categories: ['DESIGN', 'DRAFTING', 'MEETING'] },
  { project: '横浜新都市開発', categories: ['DESIGN', 'REVIEW', 'MEETING'] },
  { project: '名古屋駅リノベーション', categories: ['DRAFTING', 'REVIEW'] },
  { project: '大阪MRT延伸', categories: ['DESIGN', 'DRAFTING'] },
  { project: '社内検討業務', categories: ['MEETING', 'OTHER'] },
  { project: '福岡都市計画', categories: ['DESIGN', 'MEETING'] },
  { project: '札幌再開発', categories: ['DRAFTING', 'REVIEW'] },
];

const DEV_PROJECTS = [
  { project: '勤怠システム開発', categories: ['DESIGN', 'MEETING', 'OTHER'] },
  { project: '社内ポータル改修', categories: ['DESIGN', 'OTHER'] },
  { project: '顧客管理システム', categories: ['MEETING', 'OTHER'] },
  { project: '社内インフラ整備', categories: ['OTHER'] },
  { project: 'モバイルアプリ開発', categories: ['DESIGN', 'MEETING'] },
];

/** Deterministic pseudo-random based on seed number */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function pickRandomItems<T>(arr: T[], seed: number, count: number): T[] {
  const shuffled = [...arr].sort(() => seededRandom(seed++) - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function generateTasksForDay(
  employeeId: string,
  day: number,
  month: number,
  workHours: number,
  seedBase: number
) {
  const projects = employeeId === '202503' || employeeId === '202504'
    ? CAD_PROJECTS
    : DEV_PROJECTS;

  // Pick 1-3 projects for this day
  const numProjects = 1 + Math.floor(seededRandom(seedBase + day) * 2.5); // 1-3
  const selectedProjects = pickRandomItems(projects, seedBase + day * 7, numProjects);

  const tasks: { project: string; category: string; hours: number }[] = [];
  let remainingHours = workHours;

  for (let i = 0; i < selectedProjects.length; i++) {
    const proj = selectedProjects[i];
    const cat = pickRandom(proj.categories, seedBase + day * 13 + i * 31);

    let hours: number;
    if (i === selectedProjects.length - 1) {
      // Last project gets remaining hours
      hours = Math.round(remainingHours * 10) / 10;
    } else {
      // Random split: 1.5h minimum, leave at least 1h for remaining
      const maxHours = remainingHours - (selectedProjects.length - i - 1) * 1;
      const minHours = 1;
      hours = minHours + seededRandom(seedBase + day * 17 + i * 53) * (maxHours - minHours);
      hours = Math.round(hours * 2) / 2; // Round to 0.5 increments
      if (hours < minHours) hours = minHours;
      if (hours > remainingHours - 1) hours = remainingHours - 1;
    }

    tasks.push({ project: proj.project, category: cat, hours });
    remainingHours -= hours;
  }

  // Ensure no negative or zero hours
  return tasks.filter(t => t.hours > 0.1);
}

// ============ Entry Generation ============

interface SeedEntry {
  day: number;
  workType: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workHours: number;
  overtimeHours: number;
  holidayWorkHours: number;
  workContent: string;
  overUnder: number;
  tasks?: { project: string; category: string; hours: number }[];
}

function genEntriesWithTasks(y: number, m: number, employeeId: string, seedBase: number): SeedEntry[] {
  const days = new Date(y, m, 0).getDate();
  const result: SeedEntry[] = [];
  const monthHolidays = (y === 2025 ? PUBLIC_HOLIDAYS_2025 : PUBLIC_HOLIDAYS_2026)[m] || [];

  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    const isWe = dow === 0 || dow === 6;
    const isHol = monthHolidays.includes(d);

    if (isWe || isHol) {
      result.push({ day: d, workType: 'PUBLIC_HOLIDAY', startTime: '', endTime: '', breakMinutes: 0, workHours: 0, overtimeHours: 0, holidayWorkHours: 0, workContent: '', overUnder: 0 });
    } else {
      const st = '08:30';
      const et = d % 5 === 4 ? '19:00' : '17:30';
      const wh = calculateWorkHours(st, et, DEFAULT_BREAK_MINUTES);
      const ou = calculateOverUnder(wh, STANDARD_WORK_HOURS);
      const ot = ou > 0 ? ou : 0;
      const tasks = generateTasksForDay(employeeId, d, m, wh, seedBase + d);
      result.push({ day: d, workType: 'REGULAR', startTime: st, endTime: et, breakMinutes: DEFAULT_BREAK_MINUTES, workHours: wh, overtimeHours: ot, holidayWorkHours: 0, workContent: '業務遂行', overUnder: ou, tasks });
    }
  }
  return result;
}

function calcSummary(entries: { workType: string; workHours: number; overtimeHours: number; holidayWorkHours: number }[]) {
  let tw = 0, to = 0, hw = 0, ho = 0, hwd = 0, al = 0, alpm = 0, sl = 0, ab = 0, cwh = 0;
  for (const e of entries) {
    if (e.workType === 'REGULAR') { tw++; cwh += e.workHours; to += e.overtimeHours; }
    if (e.workType === 'HOLIDAY_WORK') { hwd++; ho += e.holidayWorkHours; cwh += e.workHours; tw++; }
    if (e.workType === 'ANNUAL_LEAVE_FULL') al++;
    if (e.workType === 'ANNUAL_LEAVE_AM') alpm++;
    if (e.workType === 'SPECIAL_LEAVE') sl++;
    if (e.workType === 'ABSENCE') ab++;
  }
  return { totalWorkDays: Math.round(tw * 100) / 100, totalOvertimeHours: Math.round(to * 100) / 100, annualLeaveAM: alpm, annualLeavePM: 0, holidayWorkDays: hwd, holidayWorkHours: Math.round(ho * 100) / 100, compensatoryCurrent: 0, compensatoryNext: 0, compensatoryAfter: 0, specialLeave: sl, absenceDays: ab, totalWorkHours: Math.round(cwh * 100) / 100 };
}

/** Create timesheet entries with nested WorkTask via Prisma nested create */
function buildEntriesData(entries: SeedEntry[]) {
  return entries.map(entry => ({
    day: entry.day,
    workType: entry.workType,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes,
    workHours: entry.workHours,
    overtimeHours: entry.overtimeHours,
    holidayWorkHours: entry.holidayWorkHours,
    workContent: entry.workContent,
    overUnder: entry.overUnder,
    tasks: entry.tasks && entry.tasks.length > 0
      ? { create: entry.tasks.map(t => ({ project: t.project, category: t.category, hours: t.hours })) }
      : undefined,
  }));
}

/** Count total WorkTasks in entries */
function countTasks(entries: SeedEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.tasks?.length || 0), 0);
}

// ============ Main Seed Function ============

/** Seed the database with demo data. Returns true if seeded, false if data already exists. */
export async function seedDatabase(): Promise<boolean> {
  try {
    // Check if users already exist
    const count = await db.user.count();
    if (count > 0) return false;

    // Clear all
    await db.departmentManager.deleteMany();
    await db.group.deleteMany();
    await db.division.deleteMany();
    await db.department.deleteMany();
    await db.approval.deleteMany();
    await db.timesheetEntry.deleteMany();
    await db.timesheet.deleteMany();
    await db.systemSettings.deleteMany();
    await db.user.deleteMany();

    // Create departments
    const cadDept = await db.department.create({ data: { name: 'CADデザイン事業部', code: 'CAD', order: 1 } });
    const sysDept = await db.department.create({ data: { name: 'システム開発部', code: 'SYS', order: 2 } });
    const adminDept = await db.department.create({ data: { name: '総務部', code: 'ADM', order: 3 } });

    // Create divisions for CAD
    const cadDiv1 = await db.division.create({ data: { name: '第1CADデザイン室', order: 1, departmentId: cadDept.id } });
    const cadDiv2 = await db.division.create({ data: { name: '第2CADデザイン室', order: 2, departmentId: cadDept.id } });

    // Create divisions for SYS
    const sysDiv1 = await db.division.create({ data: { name: '第1開発室', order: 1, departmentId: sysDept.id } });
    const sysDiv2 = await db.division.create({ data: { name: '第2開発室', order: 2, departmentId: sysDept.id } });

    // Create groups
    const cadG4 = await db.group.create({ data: { name: '技術第4G', order: 1, divisionId: cadDiv1.id } });
    const cadG5 = await db.group.create({ data: { name: '技術第5G', order: 2, divisionId: cadDiv2.id } });
    const devG1 = await db.group.create({ data: { name: '開発第1G', order: 1, divisionId: sysDiv1.id } });
    const devG2 = await db.group.create({ data: { name: '開発第2G', order: 2, divisionId: sysDiv2.id } });

    // Create users (manager first, needed for departmentManager)
    const hashedPassword = await hashPassword('demo123');
    const admin = await db.user.create({ data: { email: 'admin@company.com', name: '管理者 太郎', password: hashedPassword, role: 'ADMIN', employeeId: 'A001', departmentName: '総務部', divisionName: '', groupName: '', departmentId: adminDept.id, isActive: true } });
    const manager = await db.user.create({ data: { email: 'manager@company.com', name: '鈴木 一郎', password: hashedPassword, role: 'MANAGER', employeeId: 'M001', departmentName: 'CADデザイン事業部', divisionName: '第1CADデザイン室', groupName: '技術第4G', departmentId: cadDept.id, divisionId: cadDiv1.id, groupId: cadG4.id, isActive: true } });

    // Department manager (manager manages CAD dept)
    await db.departmentManager.create({ data: { departmentId: cadDept.id, userId: manager.id } });

    const tanaka = await db.user.create({ data: { email: 'tanaka@company.com', name: '田中 次郎', password: hashedPassword, role: 'EMPLOYEE', employeeId: '202503', departmentName: 'CADデザイン事業部', divisionName: '第1CADデザイン室', groupName: '技術第4G', departmentId: cadDept.id, divisionId: cadDiv1.id, groupId: cadG4.id, isActive: true } });
    const suzuki = await db.user.create({ data: { email: 'suzuki@company.com', name: '佐藤 花子', password: hashedPassword, role: 'EMPLOYEE', employeeId: '202504', departmentName: 'CADデザイン事業部', divisionName: '第2CADデザイン室', groupName: '技術第5G', departmentId: cadDept.id, divisionId: cadDiv2.id, groupId: cadG5.id, isActive: true } });
    const yamada = await db.user.create({ data: { email: 'yamada@company.com', name: '山田 三郎', password: hashedPassword, role: 'EMPLOYEE', employeeId: '202505', departmentName: 'システム開発部', divisionName: '第1開発室', groupName: '開発第1G', departmentId: sysDept.id, divisionId: sysDiv1.id, groupId: devG1.id, isActive: true } });
    const watanabe = await db.user.create({ data: { email: 'watanabe@company.com', name: '渡辺 四郎', password: hashedPassword, role: 'EMPLOYEE', employeeId: '202506', departmentName: 'システム開発部', divisionName: '第2開発室', groupName: '開発第2G', departmentId: sysDept.id, divisionId: sysDiv2.id, groupId: devG2.id, isActive: true } });

    // Settings
    await db.systemSettings.upsert({ where: { key: 'STANDARD_WORK_HOURS' }, update: { value: '8' }, create: { key: 'STANDARD_WORK_HOURS', value: '8', description: '標準勤務時間' } });
    await db.systemSettings.upsert({ where: { key: 'DEFAULT_BREAK_MINUTES' }, update: { value: '60' }, create: { key: 'DEFAULT_BREAK_MINUTES', value: '60', description: 'デフォルト休憩時間' } });

    // ---- Create timesheets with WorkTask data ----

    let totalTasks = 0;

    // 1. Tanaka Feb 2026 (DRAFT, FULL, with tasks)
    const tanakaFebEntries = genEntriesWithTasks(2026, 2, tanaka.employeeId!, 100);
    await db.timesheet.create({
      data: {
        employeeId: tanaka.id, year: 2026, month: 2, status: 'DRAFT', reportType: 'FULL',
        ...calcSummary(tanakaFebEntries), managerComment: '',
        entries: { create: buildEntriesData(tanakaFebEntries) },
      },
    });
    totalTasks += countTasks(tanakaFebEntries);

    // 2. Suzuki Jan 2026 (SUBMITTED, with tasks)
    const suzJanEntries = genEntriesWithTasks(2026, 1, suzuki.employeeId!, 200);
    await db.timesheet.create({
      data: {
        employeeId: suzuki.id, year: 2026, month: 1, status: 'SUBMITTED', submittedAt: new Date('2026-02-01T09:00:00'),
        ...calcSummary(suzJanEntries), managerComment: '',
        entries: { create: buildEntriesData(suzJanEntries) },
      },
    });
    totalTasks += countTasks(suzJanEntries);

    // 3. Yamada Jan 2026 (APPROVED, with tasks)
    const yamJanEntries = genEntriesWithTasks(2026, 1, yamada.employeeId!, 300);
    await db.timesheet.create({
      data: {
        employeeId: yamada.id, year: 2026, month: 1, status: 'APPROVED',
        submittedAt: new Date('2026-01-30T10:00:00'), approvedAt: new Date('2026-02-02T14:00:00'),
        approvedById: manager.id, managerComment: 'よく頑張りました。',
        ...calcSummary(yamJanEntries),
        entries: { create: buildEntriesData(yamJanEntries) },
      },
    });
    totalTasks += countTasks(yamJanEntries);

    // 4. Watanabe Jan 2026 (REJECTED, with tasks)
    const watJanEntries = genEntriesWithTasks(2026, 1, watanabe.employeeId!, 400);
    await db.timesheet.create({
      data: {
        employeeId: watanabe.id, year: 2026, month: 1, status: 'REJECTED',
        submittedAt: new Date('2026-01-31T11:00:00'), approvedAt: new Date('2026-02-03T16:00:00'),
        approvedById: manager.id, managerComment: '欠勤日について理由を記載してください。',
        ...calcSummary(watJanEntries),
        entries: { create: buildEntriesData(watJanEntries) },
      },
    });
    totalTasks += countTasks(watJanEntries);

    // 5. Tanaka Jan 2026 (APPROVED, with tasks)
    const tanJanEntries = genEntriesWithTasks(2026, 1, tanaka.employeeId!, 500);
    await db.timesheet.create({
      data: {
        employeeId: tanaka.id, year: 2026, month: 1, status: 'APPROVED',
        submittedAt: new Date('2026-01-28T09:30:00'), approvedAt: new Date('2026-02-01T15:00:00'),
        approvedById: manager.id, managerComment: '',
        ...calcSummary(tanJanEntries),
        entries: { create: buildEntriesData(tanJanEntries) },
      },
    });
    totalTasks += countTasks(tanJanEntries);

    // 6. Suzuki Feb 2026 (DRAFT, HALF, with tasks)
    const suzFebEntries = genEntriesWithTasks(2026, 2, suzuki.employeeId!, 600);
    await db.timesheet.create({
      data: {
        employeeId: suzuki.id, year: 2026, month: 2, status: 'DRAFT', reportType: 'HALF',
        ...calcSummary(suzFebEntries), managerComment: '',
        entries: { create: buildEntriesData(suzFebEntries) },
      },
    });
    totalTasks += countTasks(suzFebEntries);

    console.log(`[seed] Created 6 users, 6 timesheets, ${totalTasks} work tasks`);
    return true;
  } catch (error) {
    console.error('Seed error:', error);
    return false;
  }
}
