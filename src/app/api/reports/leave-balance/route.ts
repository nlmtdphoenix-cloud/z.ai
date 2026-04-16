import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/reports/leave-balance?year=2026
// Returns all active employees with their annual leave usage for the given year.
// MANAGER or ADMIN only.
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role === 'EMPLOYEE') return forbiddenResponse('権限がありません');

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

  const employees = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      employeeId: true,
      grade: true,
      departmentName: true,
      divisionName: true,
      groupName: true,
      annualLeaveGranted: true,
    },
    orderBy: [{ departmentName: 'asc' }, { groupName: 'asc' }, { name: 'asc' }],
  });

  // All timesheets for the year, selecting leave day counts
  const timesheets = await db.timesheet.findMany({
    where: { year },
    select: {
      employeeId: true,
      annualLeaveAM: true,
      annualLeavePM: true,
      annualLeaveFull: true,
    },
  });

  // Sum leave by employeeId
  const leaveMap = new Map<string, { am: number; pm: number; full: number }>();
  for (const ts of timesheets) {
    const cur = leaveMap.get(ts.employeeId) || { am: 0, pm: 0, full: 0 };
    cur.am   += ts.annualLeaveAM;
    cur.pm   += ts.annualLeavePM;
    cur.full += ts.annualLeaveFull;
    leaveMap.set(ts.employeeId, cur);
  }

  const rows = employees.map((emp) => {
    const leave = leaveMap.get(emp.id) || { am: 0, pm: 0, full: 0 };
    // AM and PM half-days each count as 0.5 days
    const usedDays = leave.full + (leave.am + leave.pm) * 0.5;
    return {
      employee: emp,
      granted: emp.annualLeaveGranted,
      usedDays,
      remainingDays: Math.max(0, emp.annualLeaveGranted - usedDays),
      detail: { am: leave.am, pm: leave.pm, full: leave.full },
    };
  });

  return NextResponse.json({ data: { year, rows } });
}
