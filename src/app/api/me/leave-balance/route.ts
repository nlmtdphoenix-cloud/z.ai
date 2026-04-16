import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// GET /api/me/leave-balance?year=2026
// Returns the authenticated user's own annual leave balance for the year.
// Accessible by any role.
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

  const user = await db.user.findUnique({
    where: { id: authUser.userId },
    select: { annualLeaveGranted: true },
  });

  const timesheets = await db.timesheet.findMany({
    where: { employeeId: authUser.userId, year },
    select: { annualLeaveAM: true, annualLeavePM: true, annualLeaveFull: true },
  });

  const usedAM   = timesheets.reduce((s, t) => s + t.annualLeaveAM, 0);
  const usedPM   = timesheets.reduce((s, t) => s + t.annualLeavePM, 0);
  const usedFull = timesheets.reduce((s, t) => s + t.annualLeaveFull, 0);
  const usedDays = usedFull + (usedAM + usedPM) * 0.5;
  const granted  = user?.annualLeaveGranted ?? 20;

  return NextResponse.json({
    data: {
      year,
      granted,
      usedDays,
      usedAM,
      usedPM,
      usedFull,
      remainingDays: Math.max(0, granted - usedDays),
    },
  });
}
