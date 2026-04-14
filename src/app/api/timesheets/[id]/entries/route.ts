import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { TimesheetEntry } from '@/lib/types';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Recalculate timesheet summary from entries
function recalculateSummary(entries: { workType: string; workHours: number; overtimeHours: number; holidayWorkHours: number }[]) {
  let totalWorkDays = 0;
  let totalOvertimeHours = 0;
  let annualLeaveAM = 0;
  let annualLeavePM = 0;
  let annualLeaveFull = 0;
  let holidayWorkDays = 0;
  let holidayWorkHours = 0;
  let specialLeave = 0;
  let absenceDays = 0;
  let totalWorkHours = 0;

  for (const entry of entries) {
    totalOvertimeHours += entry.overtimeHours || 0;
    totalWorkHours += entry.workHours || 0;
    holidayWorkHours += entry.holidayWorkHours || 0;

    switch (entry.workType) {
      case 'REGULAR':
        if (entry.workHours > 0) totalWorkDays += 1;
        break;
      case 'HOLIDAY_WORK':
        if (entry.workHours > 0) holidayWorkDays += 1;
        break;
      case 'ANNUAL_LEAVE_AM':
        annualLeaveAM += 1;
        break;
      case 'ANNUAL_LEAVE_PM':
        annualLeavePM += 1;
        break;
      case 'ANNUAL_LEAVE_FULL':
        annualLeaveFull += 1;
        break;
      case 'SPECIAL_LEAVE':
        specialLeave += 1;
        break;
      case 'ABSENCE':
        absenceDays += 1;
        break;
    }
  }

  return {
    totalWorkDays,
    totalOvertimeHours,
    annualLeaveAM,
    annualLeavePM,
    annualLeaveFull,
    holidayWorkDays,
    holidayWorkHours,
    specialLeave,
    absenceDays,
    totalWorkHours,
  };
}

// GET /api/timesheets/[id]/entries - Get all entries for a timesheet
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const entries = await db.timesheetEntry.findMany({
      where: { timesheetId: id },
      orderBy: { day: 'asc' },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error('Failed to get entries:', error);
    return NextResponse.json(
      { error: 'Failed to get entries' },
      { status: 500 }
    );
  }
}

// PUT /api/timesheets/[id]/entries - Batch update/create entries (upsert)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const { entries } = body as { entries: (TimesheetEntry & { id?: string; tasks?: { project: string; category: string; hours: number }[] })[] };

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'entries array is required' },
        { status: 400 }
      );
    }

    // Verify timesheet exists
    const timesheet = await db.timesheet.findUnique({
      where: { id },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Build summary from incoming entries before DB operations
    const summary = recalculateSummary(entries);

    // Use a transaction: delete all existing, create new ones, update summary
    const result = await db.$transaction(async (tx) => {
      // Delete all existing entries (cascade deletes WorkTasks)
      await tx.timesheetEntry.deleteMany({
        where: { timesheetId: id },
      });

      // Create entries one by one (createMany doesn't work with SQLite FK constraints)
      for (const entry of entries) {
        await tx.timesheetEntry.create({
          data: {
            timesheetId: id,
            day: entry.day,
            workType: entry.workType || 'REGULAR',
            startTime: entry.startTime || '',
            endTime: entry.endTime || '',
            workHours: entry.workHours || 0,
            breakMinutes: entry.breakMinutes || 60,
            overtimeHours: entry.overtimeHours || 0,
            holidayWorkHours: entry.holidayWorkHours || 0,
            workContent: entry.workContent || '',
            overUnder: entry.overUnder || 0,
            ...(entry.tasks && entry.tasks.length > 0
              ? {
                  tasks: {
                    create: entry.tasks.map((t) => ({
                      project: t.project,
                      category: t.category,
                      hours: t.hours,
                    })),
                  },
                }
              : {}),
          },
        });
      }

      // Update timesheet summary
      await tx.timesheet.update({
        where: { id },
        data: summary,
      });

      return { count: entries.length };
    });

    return NextResponse.json({ data: result, summary });
  } catch (error) {
    console.error('Failed to batch update entries:', error);
    return NextResponse.json(
      { error: 'Failed to batch update entries' },
      { status: 500 }
    );
  }
}

// POST /api/timesheets/[id]/entries - Create a single entry
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();

    const {
      day,
      workType,
      startTime,
      endTime,
      workHours,
      breakMinutes,
      overtimeHours,
      holidayWorkHours,
      workContent,
      overUnder,
    } = body;

    if (!day || day < 1 || day > 31) {
      return NextResponse.json(
        { error: 'Valid day (1-31) is required' },
        { status: 400 }
      );
    }

    // Verify timesheet exists
    const timesheet = await db.timesheet.findUnique({
      where: { id },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Check for duplicate entry on the same day
    const existingEntry = await db.timesheetEntry.findUnique({
      where: {
        timesheetId_day: {
          timesheetId: id,
          day,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: `Entry already exists for day ${day}. Use PUT to update.` },
        { status: 409 }
      );
    }

    const entry = await db.timesheetEntry.create({
      data: {
        timesheetId: id,
        day,
        workType: workType || 'REGULAR',
        startTime: startTime || '',
        endTime: endTime || '',
        workHours: workHours || 0,
        breakMinutes: breakMinutes || 60,
        overtimeHours: overtimeHours || 0,
        holidayWorkHours: holidayWorkHours || 0,
        workContent: workContent || '',
        overUnder: overUnder || 0,
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error('Failed to create entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}
