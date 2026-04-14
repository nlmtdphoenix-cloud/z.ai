import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApprovalAction } from '@/lib/types';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/timesheets/[id]/approve - Approve or reject timesheet
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    // Only MANAGER or ADMIN can approve/reject
    if (authUser.role !== 'MANAGER' && authUser.role !== 'ADMIN') {
      return forbiddenResponse('承認権限がありません');
    }

    const { id } = await params;

    let body: { action?: string; comment?: string; approverId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { action, comment } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    if (action !== 'APPROVED' && action !== 'REJECTED') {
      return NextResponse.json(
        { error: 'action must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Verify timesheet exists and is in SUBMITTED status
    const timesheet = await db.timesheet.findUnique({
      where: { id },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    if (timesheet.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot ${action.toLowerCase()}: timesheet status is ${timesheet.status}, expected SUBMITTED` },
        { status: 400 }
      );
    }

    // Use transaction to create approval record and update timesheet
    const result = await db.$transaction(async (tx) => {
      // Create the approval record
      const approval = await tx.approval.create({
        data: {
          timesheetId: id,
          approverId: authUser.userId,
          action,
          comment: comment || '',
        },
      });

      // Update the timesheet
      const updated = await tx.timesheet.update({
        where: { id },
        data: {
          status: action,
          approvedAt: new Date(),
          approvedById: authUser.userId,
          managerComment: comment || '',
        },
        include: {
          employee: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              employeeId: true,
              departmentName: true,
              divisionName: true,
              groupName: true,
              isActive: true,
            },
          },
          approver: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              employeeId: true,
              departmentName: true,
              divisionName: true,
              groupName: true,
              isActive: true,
            },
          },
        },
      });

      return { approval, timesheet: mapTimesheetEmployee(updated as unknown as Record<string, unknown>) as typeof updated };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Failed to approve/reject timesheet:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to approve/reject timesheet', details: message },
      { status: 500 }
    );
  }
}
