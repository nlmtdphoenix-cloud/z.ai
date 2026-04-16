import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { calculateWorkHours, calculateOverUnder } from '@/lib/calculations';
import { STANDARD_WORK_HOURS, DEFAULT_BREAK_MINUTES, PUBLIC_HOLIDAYS_2025, PUBLIC_HOLIDAYS_2026 } from '@/lib/constants';

// ============ Demo ReportTask data ============

const DEMO_REPORT_TASKS = [
  { taskName: 'TMC インパネ設計', prevAccum: 120.0 },
  { taskName: '東海電化 内装', prevAccum: 80.0 },
  { taskName: '豊田合成 エアバッグ', prevAccum: 60.0 },
  { taskName: '社内検討・打合せ', prevAccum: 20.0 },
];

interface SeedEntry {
  day: number; workType: string; startTime: string; endTime: string;
  breakMinutes: number; workHours: number; overtimeHours: number;
  holidayWorkHours: number; workContent: string; overUnder: number;
}

function genEntries(y: number, m: number, seedBase: number): SeedEntry[] {
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
      result.push({ day: d, workType: 'REGULAR', startTime: st, endTime: et, breakMinutes: DEFAULT_BREAK_MINUTES, workHours: wh, overtimeHours: ot, holidayWorkHours: 0, workContent: '業務遂行', overUnder: ou });
    }
  }
  return result;
}

function calcSummary(entries: SeedEntry[]) {
  let tw = 0, to = 0, hwd = 0, ho = 0, al = 0, alpm = 0, sl = 0, ab = 0, cwh = 0;
  for (const e of entries) {
    if (e.workType === 'REGULAR') { tw++; cwh += e.workHours; to += e.overtimeHours; }
    if (e.workType === 'HOLIDAY_WORK') { hwd++; ho += e.holidayWorkHours; cwh += e.workHours; tw++; }
    if (e.workType === 'ANNUAL_LEAVE_FULL') al++;
    if (e.workType === 'ANNUAL_LEAVE_AM') alpm++;
    if (e.workType === 'SPECIAL_LEAVE') sl++;
    if (e.workType === 'ABSENCE') ab++;
  }
  return { totalWorkDays: Math.round(tw * 100) / 100, totalOvertimeHours: Math.round(to * 100) / 100, annualLeaveAM: alpm, annualLeavePM: 0, annualLeaveFull: al, holidayWorkDays: hwd, holidayWorkHours: Math.round(ho * 100) / 100, compensatoryCurrent: 0, compensatoryNext: 0, compensatoryAfter: 0, specialLeave: sl, absenceDays: ab, totalWorkHours: Math.round(cwh * 100) / 100 };
}

function buildEntriesData(entries: SeedEntry[]) {
  return entries.map(e => ({
    day: e.day, workType: e.workType, startTime: e.startTime, endTime: e.endTime,
    breakMinutes: e.breakMinutes, workHours: e.workHours, overtimeHours: e.overtimeHours,
    holidayWorkHours: e.holidayWorkHours, workContent: e.workContent, overUnder: e.overUnder,
  }));
}

async function seedReportTasks(timesheetId: string, entries: SeedEntry[]) {
  const workDays = entries.filter(e => e.workType === 'REGULAR' && e.workHours > 0);
  for (let i = 0; i < DEMO_REPORT_TASKS.length; i++) {
    const t = DEMO_REPORT_TASKS[i];
    // Distribute hours evenly across work days
    const hoursPerDay = Math.round((t.prevAccum * 0.2 / Math.max(workDays.length, 1)) * 2) / 2;
    const monthlyTotal = Math.round(hoursPerDay * workDays.length * 100) / 100;
    const task = await db.reportTask.create({
      data: {
        timesheetId,
        rowNumber: i + 1,
        taskName: t.taskName,
        prevAccum: t.prevAccum,
        monthlyTotal,
        cumulative: Math.round((t.prevAccum + monthlyTotal) * 100) / 100,
      },
    });
    for (const day of workDays) {
      await db.reportTaskDaily.create({
        data: { reportTaskId: task.id, day: day.day, hours: hoursPerDay },
      });
    }
  }
}

// ============ Main Seed ============

export async function seedDatabase(): Promise<boolean> {
  try {
    const count = await db.user.count();
    if (count > 0) return false;

    // Clear all
    await db.userSecondaryGroup.deleteMany();
    await db.departmentManager.deleteMany();
    await db.reportTaskDaily.deleteMany();
    await db.reportTask.deleteMany();
    await db.workTask.deleteMany();
    await db.timesheetEntry.deleteMany();
    await db.approval.deleteMany();
    await db.timesheet.deleteMany();
    await db.user.deleteMany();
    await db.group.deleteMany();
    await db.division.deleteMany();
    await db.department.deleteMany();
    await db.systemSettings.deleteMany();

    const pw = await hashPassword('password123');

    // ── Departments ──────────────────────────────────────────────────────
    const cadDept = await db.department.create({ data: { name: 'CADデザイン事業部', code: 'CAD', order: 1 } });
    const hrDept  = await db.department.create({ data: { name: '人事総務部', code: 'HR', order: 2 } });

    // ── Divisions ────────────────────────────────────────────────────────
    const cadDiv = await db.division.create({ data: { name: '第1CADデザイン室', order: 1, departmentId: cadDept.id } });
    // 人事総務部 has no real 室 — create a virtual one
    const hrDiv  = await db.division.create({ data: { name: '人事総務', order: 1, isVirtual: true, departmentId: hrDept.id } });

    // ── Groups ───────────────────────────────────────────────────────────
    const g1 = await db.group.create({ data: { name: '技術第1G', order: 1, divisionId: cadDiv.id } });
    const g2 = await db.group.create({ data: { name: '技術第2G', order: 2, divisionId: cadDiv.id } });
    const g3 = await db.group.create({ data: { name: '技術第3G', order: 3, divisionId: cadDiv.id } });
    const g4 = await db.group.create({ data: { name: '技術第4G', order: 4, divisionId: cadDiv.id } });
    const g5 = await db.group.create({ data: { name: '技術第5G', order: 5, divisionId: cadDiv.id } });
    const hrG  = await db.group.create({ data: { name: '人事総務部G', order: 1, divisionId: hrDiv.id } });
    const ikuG = await db.group.create({ data: { name: '育休対応G', order: 2, divisionId: hrDiv.id } });

    // ── Helper ───────────────────────────────────────────────────────────
    type UserInput = {
      name: string; email: string; role: string; grade: string; clientSide?: string;
      employeeId?: string; dept: typeof cadDept; div: typeof cadDiv; grp: typeof g1;
    };
    async function createUser(u: UserInput) {
      return db.user.create({
        data: {
          name: u.name, email: u.email, password: pw, role: u.role, grade: u.grade,
          clientSide: u.clientSide || '', employeeId: u.employeeId || null,
          departmentId: u.dept.id, divisionId: u.div.id, groupId: u.grp.id,
          departmentName: u.dept.name, divisionName: u.div.name, groupName: u.grp.name,
          isActive: true,
        },
      });
    }

    // ── CEO ──────────────────────────────────────────────────────────────
    const uemura = await createUser({ name: '植木 宏次', email: 'koji.ueki@crascad.co.jp', role: 'ADMIN', grade: '社長', employeeId: 'C001', dept: cadDept, div: cadDiv, grp: g3 });

    // ── 第1CADデザイン室長 / 技術第3G Manager (G2) ────────────────────
    const yamashita = await createUser({ name: '山下 博', email: 'hiroshi.yamashita@crascad.co.jp', role: 'MANAGER', grade: 'G2', employeeId: 'C002', dept: cadDept, div: cadDiv, grp: g3 });

    // ── 技術第1G (11人) ─────────────────────────────────────────────────
    const yamaguchi = await createUser({ name: '山原 孝史', email: 'takashi.yamahara@crascad.co.jp', role: 'MANAGER', grade: 'M1', employeeId: 'G101', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '拡永 貴史', email: 'takashi.hironaga@crascad.co.jp', role: 'EMPLOYEE', grade: 'L1', clientSide: 'TMC側', employeeId: 'G102', dept: cadDept, div: cadDiv, grp: g1 });
    const take_g1 = await createUser({ name: '竹 岳史', email: 'takeshi.take@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', clientSide: '東海電化側', employeeId: 'G103', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '遠藤 光平', email: 'kohei.endo@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', clientSide: 'TMC側', employeeId: 'G104', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '岩田 武佐', email: 'takesa.iwata@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TMC側', employeeId: 'G105', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '竹中 孝浩', email: 'takahiro.takenaka@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'TMC側', employeeId: 'G106', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '加 裕貴', email: 'hiroki.ka@crascad.co.jp', role: 'EMPLOYEE', grade: 'S4', clientSide: 'TMC側', employeeId: 'G107', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '尾上 貴保', email: 'takaho.onoe@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', clientSide: '東海電化側', employeeId: 'G108', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '西秋 裕佐', email: 'yusuke.nishiaki@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: '東海電化側', employeeId: 'G109', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '伊藤 修平', email: 'shuhei.ito@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TMEJ側', employeeId: 'G110', dept: cadDept, div: cadDiv, grp: g1 });
    await createUser({ name: '石山 庄源', email: 'shoichiro.ishiyama@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TMEJ側', employeeId: 'G111', dept: cadDept, div: cadDiv, grp: g1 });

    // ── 技術第2G (7人) ─────────────────────────────────────────────────
    // 向山 亨: primary = 人事総務部G (兼任), secondary = 技術第2G
    // → primaryを先にhrGで作り、secondaryGroupでg2に繋げる
    const maeyama = await createUser({ name: '向山 亨', email: 'toru.mukoyama@crascad.co.jp', role: 'MANAGER', grade: 'M1', employeeId: 'G201', dept: hrDept, div: hrDiv, grp: hrG });
    // secondary: 技術第2G
    await db.userSecondaryGroup.create({ data: { userId: maeyama.id, groupId: g2.id } });

    await createUser({ name: '竹田 彰之', email: 'akiyuki.takeda@crascad.co.jp', role: 'EMPLOYEE', grade: 'L1', employeeId: 'G202', dept: cadDept, div: cadDiv, grp: g2 });
    await createUser({ name: '山本 信大', email: 'nobuhiro.yamamoto@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', employeeId: 'G203', dept: cadDept, div: cadDiv, grp: g2 });
    await createUser({ name: '遠澤 武', email: 'takeshi.tosawa@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TMC側', employeeId: 'G204', dept: cadDept, div: cadDiv, grp: g2 });
    await createUser({ name: '松壁 省輝', email: 'kiyoteru.matsukabe@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'TMC側', employeeId: 'G205', dept: cadDept, div: cadDiv, grp: g2 });
    await createUser({ name: '高尾 奈未', email: 'nami.takao@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'TMC側', employeeId: 'G206', dept: cadDept, div: cadDiv, grp: g2 });
    await createUser({ name: '多賀 武裕', email: 'takehiro.taga@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', clientSide: 'Valeo側', employeeId: 'G207', dept: cadDept, div: cadDiv, grp: g2 });

    // ── 技術第3G (12人 + 山下 博 G2) ──────────────────────────────────
    await createUser({ name: '遠山 孝太', email: 'kota.toyama@crascad.co.jp', role: 'EMPLOYEE', grade: 'L1', employeeId: 'G301', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '山田 正春', email: 'masaharu.yamada@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', employeeId: 'G302', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '岡田 礼衣', email: 'rei.okada@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', employeeId: 'G303', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '松本 伸夫', email: 'nobuo.matsumoto@crascad.co.jp', role: 'EMPLOYEE', grade: 'TL', clientSide: '豊田合成側', employeeId: 'G304', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '遠壁 章', email: 'akira.tokabe@crascad.co.jp', role: 'EMPLOYEE', grade: 'TL', clientSide: 'シートレイン側', employeeId: 'G305', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '大橋 彩太', email: 'aita.ohashi@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: '豊田合成側', employeeId: 'G306', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '梶尾 帆', email: 'ho.kajio@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: '豊田合成側', employeeId: 'G307', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: 'ユーレー', email: 'yuure@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: '豊田合成側', employeeId: 'G308', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '宮本 巧', email: 'takumi.miyamoto@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'TMC(インパネ)側', employeeId: 'G309', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '森下 正太', email: 'shota.morishita@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'TMC(インパネ)側', employeeId: 'G310', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '佐々木 駿', email: 'shun.sasaki@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TMC(インパネ)側', employeeId: 'G311', dept: cadDept, div: cadDiv, grp: g3 });
    await createUser({ name: '丹羽 豊', email: 'yutaka.niwa@crascad.co.jp', role: 'EMPLOYEE', grade: 'S4', clientSide: 'シートレイン側', employeeId: 'G312', dept: cadDept, div: cadDiv, grp: g3 });

    // ── 技術第4G (11人) ────────────────────────────────────────────────
    const amowatari = await createUser({ name: '網戸 康文', email: 'yasufumi.amodo@crascad.co.jp', role: 'MANAGER', grade: 'M2', employeeId: 'G401', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '渡辺 信夫', email: 'nobuo.watanabe@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', clientSide: 'TCE側', employeeId: 'G402', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '丹後 義智', email: 'yoshitomo.tango@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', clientSide: 'トルコ側', employeeId: 'G403', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '福川 和仁', email: 'kazuhito.fukugawa@crascad.co.jp', role: 'EMPLOYEE', grade: 'TL', clientSide: 'HCE側', employeeId: 'G404', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '平本 省輝', email: 'kiyoteru.hiramoto@crascad.co.jp', role: 'EMPLOYEE', grade: 'TL', clientSide: 'AB/DU側', employeeId: 'G405', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '前多 明之', email: 'akiyuki.maeta@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'TCE側', employeeId: 'G406', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '武田 一市', email: 'kazuichi.takeda@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', clientSide: 'TCE側', employeeId: 'G407', dept: cadDept, div: cadDiv, grp: g4 });
    const zey = await createUser({ name: 'ゼイ', email: 'zey@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'HCE側', employeeId: 'G408', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: 'ナイル', email: 'nairu@crascad.co.jp', role: 'EMPLOYEE', grade: 'S4', clientSide: 'HCE側', employeeId: 'G409', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '西森 豊', email: 'yutaka.nishimori@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'AB/DU側', employeeId: 'G410', dept: cadDept, div: cadDiv, grp: g4 });
    await createUser({ name: '岩渡 和乃', email: 'kazuno.iwawatari@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'トルコ側', employeeId: 'G411', dept: cadDept, div: cadDiv, grp: g4 });

    // ── 技術第5G (8人) ─────────────────────────────────────────────────
    const okada_miya = await createUser({ name: '岡田 陽史', email: 'harufumi.okada@crascad.co.jp', role: 'MANAGER', grade: 'M2', employeeId: 'G501', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '福川 善太', email: 'zenta.fukugawa@crascad.co.jp', role: 'EMPLOYEE', grade: 'L1', clientSide: 'トヨタ+DBC側', employeeId: 'G502', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '永田 和代', email: 'kazuyo.nagata@crascad.co.jp', role: 'EMPLOYEE', grade: 'L1', clientSide: 'トヨタ九州側', employeeId: 'G503', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '渡笠 信貴', email: 'nobutaka.watakasa@crascad.co.jp', role: 'EMPLOYEE', grade: 'L2', clientSide: 'トヨタ側', employeeId: 'G504', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '後藤 一輝', email: 'kazuki.goto@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', clientSide: 'トヨタ側', employeeId: 'G505', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '森本 流', email: 'ryu.morimoto@crascad.co.jp', role: 'EMPLOYEE', grade: 'S4', clientSide: 'トヨタ側', employeeId: 'G506', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '土方 佐直', email: 'saichi.hijikata@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', clientSide: 'DBC側', employeeId: 'G507', dept: cadDept, div: cadDiv, grp: g5 });
    await createUser({ name: '岡村 雅定', email: 'masasada.okamura@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', clientSide: 'トヨタ九州側', employeeId: 'G508', dept: cadDept, div: cadDiv, grp: g5 });

    // ── 人事総務部G (5人) ─────────────────────────────────────────────
    // 向山 亨は既に作成済み（hrGが主グループ）
    await createUser({ name: '安藤 信羅', email: 'shinra.ando@crascad.co.jp', role: 'EMPLOYEE', grade: 'S2', employeeId: 'H101', dept: hrDept, div: hrDiv, grp: hrG });
    await createUser({ name: 'テー', email: 'the@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', employeeId: 'H102', dept: hrDept, div: hrDiv, grp: hrG });
    await createUser({ name: '岡田 流', email: 'ryu.okada@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', employeeId: 'H103', dept: hrDept, div: hrDiv, grp: hrG });
    await createUser({ name: 'ポー', email: 'poe@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', employeeId: 'H104', dept: hrDept, div: hrDiv, grp: hrG });
    await createUser({ name: 'リン', email: 'lin@crascad.co.jp', role: 'EMPLOYEE', grade: 'S1', employeeId: 'H105', dept: hrDept, div: hrDiv, grp: hrG });

    // ── 育休対応G ─────────────────────────────────────────────────────
    await createUser({ name: '植村 幸代', email: 'yukinori.uemura@crascad.co.jp', role: 'EMPLOYEE', grade: 'TL', employeeId: 'H201', dept: hrDept, div: hrDiv, grp: ikuG });
    await createUser({ name: '中根 純', email: 'jun.nakane@crascad.co.jp', role: 'EMPLOYEE', grade: 'S3', employeeId: 'H202', dept: hrDept, div: hrDiv, grp: ikuG });

    // ── DepartmentManagers ─────────────────────────────────────────────
    await db.departmentManager.create({ data: { departmentId: cadDept.id, userId: yamashita.id } });
    await db.departmentManager.create({ data: { departmentId: hrDept.id, userId: maeyama.id } });

    // ── SystemSettings ────────────────────────────────────────────────
    await db.systemSettings.upsert({ where: { key: 'STANDARD_WORK_HOURS' }, update: { value: '8' }, create: { key: 'STANDARD_WORK_HOURS', value: '8', description: '標準勤務時間' } });
    await db.systemSettings.upsert({ where: { key: 'DEFAULT_BREAK_MINUTES' }, update: { value: '60' }, create: { key: 'DEFAULT_BREAK_MINUTES', value: '60', description: 'デフォルト休憩時間' } });

    // ── Timesheets for demo ──────────────────────────────────────────────
    // 1. ゼイ (技術第4G / HCE側) — 2026年1月 SUBMITTED 待ちステップ1(網渡)
    const zeyJan = genEntries(2026, 1, 400);
    const zeyTs = await db.timesheet.create({
      data: {
        employeeId: zey.id, year: 2026, month: 1, status: 'SUBMITTED',
        currentApprovalStep: 1, reportType: 'ZENHAN',
        submittedAt: new Date('2026-02-01T09:00:00'),
        ...calcSummary(zeyJan), managerComment: '',
        entries: { create: buildEntriesData(zeyJan) },
      },
    });
    await seedReportTasks(zeyTs.id, zeyJan);

    // 2. 竹 岳史 (技術第1G) — 2026年1月 SUBMITTED 待ちステップ1(山口)
    const takeJan = genEntries(2026, 1, 103);
    const takeTs = await db.timesheet.create({
      data: {
        employeeId: take_g1.id, year: 2026, month: 1, status: 'SUBMITTED',
        currentApprovalStep: 1, reportType: 'ZENHAN',
        submittedAt: new Date('2026-01-31T11:00:00'),
        ...calcSummary(takeJan), managerComment: '',
        entries: { create: buildEntriesData(takeJan) },
      },
    });
    await seedReportTasks(takeTs.id, takeJan);

    // 3. 山原 孝史 (技術第1G Manager) — 2026年1月 SUBMITTED ステップ2(山下)
    const yamaguchiJan = genEntries(2026, 1, 101);
    const yamaguchiTs = await db.timesheet.create({
      data: {
        employeeId: yamaguchi.id, year: 2026, month: 1, status: 'SUBMITTED',
        currentApprovalStep: 2, reportType: 'ZENHAN',
        submittedAt: new Date('2026-01-30T09:00:00'),
        ...calcSummary(yamaguchiJan), managerComment: '',
        entries: { create: buildEntriesData(yamaguchiJan) },
      },
    });
    await seedReportTasks(yamaguchiTs.id, yamaguchiJan);

    // 4. 向山 亨 (人事総務部G Manager) — 2026年1月 SUBMITTED ステップ3(植木)
    const maeyamaJan = genEntries(2026, 1, 201);
    const maeyamaTs = await db.timesheet.create({
      data: {
        employeeId: maeyama.id, year: 2026, month: 1, status: 'SUBMITTED',
        currentApprovalStep: 3, reportType: 'ZENHAN',
        submittedAt: new Date('2026-01-31T17:00:00'),
        ...calcSummary(maeyamaJan), managerComment: '',
        entries: { create: buildEntriesData(maeyamaJan) },
      },
    });
    await seedReportTasks(maeyamaTs.id, maeyamaJan);

    // 5. 網戸 康文 (技術第4G Manager) — 2026年2月 DRAFT
    const amowatariFeb = genEntries(2026, 2, 401);
    const amowatariTs = await db.timesheet.create({
      data: {
        employeeId: amowatari.id, year: 2026, month: 2, status: 'DRAFT',
        currentApprovalStep: 0, reportType: 'ZENHAN',
        ...calcSummary(amowatariFeb), managerComment: '',
        entries: { create: buildEntriesData(amowatariFeb) },
      },
    });
    await seedReportTasks(amowatariTs.id, amowatariFeb);

    // 6. 岡田 陽史 (技術第5G Manager) — 2026年1月 APPROVED
    const okadaJan = genEntries(2026, 1, 501);
    const okadaTs = await db.timesheet.create({
      data: {
        employeeId: okada_miya.id, year: 2026, month: 1, status: 'APPROVED',
        currentApprovalStep: 3, reportType: 'ZENHAN',
        submittedAt: new Date('2026-01-29T10:00:00'),
        approvedAt: new Date('2026-02-03T14:00:00'),
        approvedById: uemura.id, managerComment: 'お疲れ様でした。',
        ...calcSummary(okadaJan),
        entries: { create: buildEntriesData(okadaJan) },
      },
    });
    await seedReportTasks(okadaTs.id, okadaJan);

    console.log('[seed] CrasCAD organization seeded successfully');
    return true;
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}
