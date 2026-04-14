import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/timesheets/[id]/submit - Submit timesheet for approval
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;

    const timesheet = await db.timesheet.findUnique({
      where: { id },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    if (timesheet.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT timesheets can be submitted' },
        { status: 400 }
      );
    }

    // Only the employee themselves can submit
    if (timesheet.employeeId !== authUser.userId && authUser.role !== 'ADMIN') {
      return forbiddenResponse('自分の勤務表のみ提出できます');
    }

    const updated = await db.timesheet.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
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
      },
    });

    return NextResponse.json({ data: mapTimesheetEmployee(updated) });
  } catch (error) {
    console.error('Failed to submit timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to submit timesheet' },
      { status: 500 }
    );
  }
}
