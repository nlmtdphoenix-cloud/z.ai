import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { resolveApprovalChain } from '@/lib/approval-chain';

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
      include: { entries: { select: { workType: true, workHours: true } } },
    });

    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Only the employee themselves can submit (no ADMIN impersonation; keeps audit trail honest)
    if (timesheet.employeeId !== authUser.userId) {
      return forbiddenResponse('自分の勤務表のみ提出できます');
    }

    // Only DRAFT may be submitted. REJECTED must be reverted to DRAFT after edits first.
    if (timesheet.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'DRAFT状態の勤務表のみ提出できます' },
        { status: 400 }
      );
    }

    // Require at least one actual work/leave entry before submission
    const hasMeaningfulEntry = timesheet.entries.some(
      (e) => e.workType !== 'PUBLIC_HOLIDAY' && (e.workHours > 0 || e.workType !== 'REGULAR'),
    );
    if (!hasMeaningfulEntry) {
      return NextResponse.json(
        { error: '勤務表が未入力です。提出前に勤務内容を入力してください' },
        { status: 400 }
      );
    }

    // Resolve the approval chain and snapshot it so later re-assignments of the
    // employee don't change who is authorized to approve this submission.
    const chain = await resolveApprovalChain(timesheet.employeeId);
    const firstStep = chain.length > 0 ? chain[0].step : 3;
    const chainJson = JSON.stringify(chain);

    // If chain is empty (CEO submits own), auto-approve
    if (chain.length === 0) {
      const updated = await db.timesheet.update({
        where: { id },
        data: {
          status: 'APPROVED',
          currentApprovalStep: 0,
          submittedAt: new Date(),
          approvedAt: new Date(),
          approvedById: authUser.userId,
          approvalChainJson: chainJson,
        },
        include: {
          employee: {
            select: {
              id: true, email: true, name: true, role: true, grade: true,
              employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
            },
          },
        },
      });
      return NextResponse.json({ data: mapTimesheetEmployee(updated) });
    }

    const updated = await db.timesheet.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        currentApprovalStep: firstStep,
        submittedAt: new Date(),
        approvalChainJson: chainJson,
      },
      include: {
        employee: {
          select: {
            id: true, email: true, name: true, role: true, grade: true,
            employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
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
