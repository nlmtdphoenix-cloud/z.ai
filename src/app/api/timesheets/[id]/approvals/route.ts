import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, canAccessTimesheet } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/timesheets/[id]/approvals - Full approval history (APPROVED/REJECTED events)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;

    const timesheet = await db.timesheet.findUnique({
      where: { id },
      select: { employeeId: true, approvedById: true },
    });
    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }
    const isApprover = timesheet.approvedById === authUser.userId;
    if (!canAccessTimesheet(authUser, timesheet.employeeId) && !isApprover) {
      return forbiddenResponse();
    }

    const approvals = await db.approval.findMany({
      where: { timesheetId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        approver: {
          select: { id: true, name: true, grade: true, role: true },
        },
      },
    });

    return NextResponse.json({ data: approvals });
  } catch (error) {
    console.error('Failed to list approvals:', error);
    return NextResponse.json({ error: 'Failed to list approvals' }, { status: 500 });
  }
}
