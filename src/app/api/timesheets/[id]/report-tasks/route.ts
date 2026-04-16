import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, canAccessTimesheet } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/timesheets/[id]/report-tasks
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

    const tasks = await db.reportTask.findMany({
      where: { timesheetId: id },
      orderBy: { rowNumber: 'asc' },
      include: { dailyHours: { orderBy: { day: 'asc' } } },
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error('Failed to get report tasks:', error);
    return NextResponse.json({ error: 'Failed to get report tasks' }, { status: 500 });
  }
}

// PUT /api/timesheets/[id]/report-tasks
// Body: { tasks: Array<{ rowNumber, taskName, prevAccum, dailyHours: { day, hours }[] }> }
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;

    const timesheet = await db.timesheet.findUnique({
      where: { id },
      select: { employeeId: true, status: true },
    });
    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }
    if (timesheet.employeeId !== authUser.userId && authUser.role !== 'ADMIN') {
      return forbiddenResponse();
    }
    if (timesheet.status !== 'DRAFT' && authUser.role !== 'ADMIN') {
      return forbiddenResponse('提出済みの勤務表は編集できません');
    }

    let body: { tasks?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(body.tasks)) {
      return NextResponse.json({ error: 'tasks must be an array' }, { status: 400 });
    }

    if (body.tasks.length > 15) {
      return NextResponse.json({ error: 'Maximum 15 tasks per report' }, { status: 400 });
    }

    type TaskInput = {
      rowNumber: number;
      taskName: string;
      prevAccum: number;
      dailyHours: { day: number; hours: number }[];
    };

    const tasks = body.tasks as TaskInput[];

    // Validate rows
    for (const t of tasks) {
      if (!Number.isInteger(t.rowNumber) || t.rowNumber < 1 || t.rowNumber > 15) {
        return NextResponse.json({ error: `rowNumber must be 1-15, got ${t.rowNumber}` }, { status: 400 });
      }
    }

    const result = await db.$transaction(async (tx) => {
      const saved: Awaited<ReturnType<typeof tx.reportTask.upsert>>[] = [];
      for (const t of tasks) {
        const monthlyTotal = (t.dailyHours || []).reduce((s, d) => s + (d.hours || 0), 0);
        const roundedMonthly = Math.round(monthlyTotal * 100) / 100;
        const prevAccum = t.prevAccum ?? 0;
        const cumulative = Math.round((prevAccum + roundedMonthly) * 100) / 100;

        const task = await tx.reportTask.upsert({
          where: { timesheetId_rowNumber: { timesheetId: id, rowNumber: t.rowNumber } },
          create: {
            timesheetId: id,
            rowNumber: t.rowNumber,
            taskName: t.taskName || '',
            prevAccum,
            monthlyTotal: roundedMonthly,
            cumulative,
          },
          update: {
            taskName: t.taskName || '',
            prevAccum,
            monthlyTotal: roundedMonthly,
            cumulative,
          },
        });

        // Upsert daily hours
        for (const d of (t.dailyHours || [])) {
          if (!Number.isInteger(d.day) || d.day < 1 || d.day > 31) continue;
          await tx.reportTaskDaily.upsert({
            where: { reportTaskId_day: { reportTaskId: task.id, day: d.day } },
            create: { reportTaskId: task.id, day: d.day, hours: d.hours || 0 },
            update: { hours: d.hours || 0 },
          });
        }

        saved.push(task);
      }
      return saved;
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Failed to update report tasks:', error);
    return NextResponse.json({ error: 'Failed to update report tasks' }, { status: 500 });
  }
}
