import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/reports/compensatory?year=2026&month=4
// Returns all active employees with their compensatory leave balances
// from the latest timesheet up to (year, month).
// MANAGER or ADMIN only.
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role === 'EMPLOYEE') return forbiddenResponse('権限がありません');

  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);

  const employees = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, employeeId: true, grade: true,
      departmentName: true, divisionName: true, groupName: true,
    },
    orderBy: [{ departmentName: 'asc' }, { groupName: 'asc' }, { name: 'asc' }],
  });

  // Get the most recent KOHAN timesheet at or before (year, month) per employee,
  // because KOHAN carries the running compensatory balance.
  // Fall back to ZENHAN if no KOHAN exists.
  const timesheets = await db.timesheet.findMany({
    where: {
      OR: [
        { year: { lt: year } },
        { year, month: { lte: month } },
      ],
    },
    select: {
      employeeId: true,
      year: true,
      month: true,
      reportType: true,
      compensatoryCurrent: true,
      compensatoryNext: true,
      compensatoryAfter: true,
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  // For each employee, find the most recent timesheet
  const latestMap = new Map<string, typeof timesheets[number]>();
  for (const ts of timesheets) {
    if (!latestMap.has(ts.employeeId)) {
      latestMap.set(ts.employeeId, ts);
    }
  }

  const rows = employees.map((emp) => {
    const ts = latestMap.get(emp.id);
    return {
      employee: emp,
      asOf: ts ? { year: ts.year, month: ts.month, reportType: ts.reportType } : null,
      compensatoryCurrent: ts?.compensatoryCurrent ?? 0,
      compensatoryNext:    ts?.compensatoryNext    ?? 0,
      compensatoryAfter:   ts?.compensatoryAfter   ?? 0,
      total: (ts?.compensatoryCurrent ?? 0) + (ts?.compensatoryNext ?? 0) + (ts?.compensatoryAfter ?? 0),
    };
  });

  return NextResponse.json({ data: { year, month, rows } });
}
