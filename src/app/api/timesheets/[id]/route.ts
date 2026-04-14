import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/timesheets/[id] - Get single timesheet with entries and relations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;

    const timesheet = await db.timesheet.findUnique({
      where: { id },
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
        entries: {
          orderBy: { day: 'asc' },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: mapTimesheetEmployee(timesheet) });
  } catch (error) {
    console.error('Failed to get timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to get timesheet' },
      { status: 500 }
    );
  }
}

// PUT /api/timesheets/[id] - Update timesheet fields
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();

    const existing = await db.timesheet.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Build update data - only allow summary and comment fields
    const allowedFields = [
      'status',
      'totalWorkDays',
      'totalOvertimeHours',
      'annualLeaveAM',
      'annualLeavePM',
      'holidayWorkDays',
      'holidayWorkHours',
      'compensatoryCurrent',
      'compensatoryNext',
      'compensatoryAfter',
      'specialLeave',
      'absenceDays',
      'totalWorkHours',
      'managerComment',
      'reportType',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const timesheet = await db.timesheet.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ data: mapTimesheetEmployee(timesheet) });
  } catch (error) {
    console.error('Failed to update timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to update timesheet' },
      { status: 500 }
    );
  }
}

// DELETE /api/timesheets/[id] - Delete timesheet (only if DRAFT)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;

    const existing = await db.timesheet.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT timesheets can be deleted' },
        { status: 400 }
      );
    }

    await db.timesheet.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Failed to delete timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete timesheet' },
      { status: 500 }
    );
  }
}
