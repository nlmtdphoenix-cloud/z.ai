import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/reports/monthly-status?year=2026&month=1
// Returns all active employees with their timesheet status for the given month.
// MANAGER or ADMIN only.
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role === 'EMPLOYEE') return forbiddenResponse('権限がありません');

  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  // All active employees
  const employees = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, employeeId: true, role: true, grade: true,
      departmentName: true, divisionName: true, groupName: true,
    },
    orderBy: [{ departmentName: 'asc' }, { groupName: 'asc' }, { name: 'asc' }],
  });

  // Timesheets for this month (both ZENHAN and KOHAN)
  const timesheets = await db.timesheet.findMany({
    where: { year, month },
    select: {
      id: true, employeeId: true, status: true, reportType: true,
      currentApprovalStep: true, submittedAt: true, approvedAt: true,
      totalOvertimeHours: true,
      approver: { select: { name: true } },
    },
  });

  // Group timesheets by employeeId
  const tsMap = new Map<string, typeof timesheets>();
  for (const ts of timesheets) {
    if (!tsMap.has(ts.employeeId)) tsMap.set(ts.employeeId, []);
    tsMap.get(ts.employeeId)!.push(ts);
  }

  const rows = employees.map((emp) => {
    const empTs = tsMap.get(emp.id) || [];
    return {
      employee: emp,
      timesheets: empTs,
      // Convenience flags
      hasZenhan:   empTs.some((t) => t.reportType === 'ZENHAN'),
      hasKohan:    empTs.some((t) => t.reportType === 'KOHAN'),
      allApproved: empTs.length > 0 && empTs.every((t) => t.status === 'APPROVED'),
      anyRejected: empTs.some((t) => t.status === 'REJECTED'),
      anyPending:  empTs.some((t) => t.status === 'SUBMITTED'),
      anyDraft:    empTs.some((t) => t.status === 'DRAFT'),
      notSubmitted: empTs.length === 0,
      totalOvertime: empTs.reduce((s, t) => s + (t.totalOvertimeHours || 0), 0),
    };
  });

  // Summary counts
  const summary = {
    total:        rows.length,
    notSubmitted: rows.filter((r) => r.notSubmitted).length,
    draft:        rows.filter((r) => r.anyDraft && !r.notSubmitted).length,
    pending:      rows.filter((r) => r.anyPending).length,
    approved:     rows.filter((r) => r.allApproved).length,
    rejected:     rows.filter((r) => r.anyRejected).length,
  };

  return NextResponse.json({ data: { year, month, summary, rows } });
}
