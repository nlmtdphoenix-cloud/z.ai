import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/timesheets - List timesheets with filtering
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const includeEntries = searchParams.get('includeEntries') === 'true';

    const where: Record<string, unknown> = {};

    // Scope query by role: EMPLOYEE may only see their own timesheets.
    // MANAGER/ADMIN may filter by any employeeId or see all.
    if (authUser.role === 'EMPLOYEE') {
      where.employeeId = authUser.userId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (year) {
      where.year = parseInt(year, 10);
    }
    if (month) {
      where.month = parseInt(month, 10);
    }
    if (status) {
      where.status = status;
    }

    const timesheets = await db.timesheet.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            grade: true,
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
            grade: true,
            employeeId: true,
            departmentName: true,
            divisionName: true,
            groupName: true,
            isActive: true,
          },
        },
        ...(includeEntries
          ? {
              entries: {
                orderBy: { day: 'asc' },
                include: {
                  tasks: {
                    orderBy: { createdAt: 'asc' },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ data: timesheets.map(mapTimesheetEmployee) });
  } catch (error) {
    console.error('Failed to list timesheets:', error);
    return NextResponse.json(
      { error: 'Failed to list timesheets' },
      { status: 500 }
    );
  }
}

// POST /api/timesheets - Create a new DRAFT timesheet
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const { employeeId, year, month, reportType } = body;

    if (!employeeId || !year || !month) {
      return NextResponse.json(
        { error: 'employeeId, year, and month are required' },
        { status: 400 }
      );
    }

    // EMPLOYEE may only create their own timesheets.
    if (authUser.role === 'EMPLOYEE' && employeeId !== authUser.userId) {
      return forbiddenResponse('自分の勤務表のみ作成できます');
    }

    if (year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month (must be 1-12)' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.timesheet.findFirst({
      where: {
        employeeId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        reportType: (reportType || 'ZENHAN'),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Timesheet already exists for this employee, year, and month' },
        { status: 409 }
      );
    }

    // Verify employee exists
    const employee = await db.user.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const timesheet = await db.timesheet.create({
      data: {
        employeeId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        status: 'DRAFT',
        reportType: reportType || 'FULL',
      },
      include: {
        employee: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            grade: true,
            employeeId: true,
            departmentName: true,
            divisionName: true,
            groupName: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ data: mapTimesheetEmployee(timesheet) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to create timesheet' },
      { status: 500 }
    );
  }
}
