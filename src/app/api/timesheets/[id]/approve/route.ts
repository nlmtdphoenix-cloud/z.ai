import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApprovalAction } from '@/lib/types';
import { mapTimesheetEmployee } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { resolveApprovalChain, type ApprovalChainStep } from '@/lib/approval-chain';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/timesheets/[id]/approve - Approve or reject timesheet (multi-step)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    // Only MANAGER or ADMIN can approve/reject
    if (authUser.role !== 'MANAGER' && authUser.role !== 'ADMIN') {
      return forbiddenResponse('承認権限がありません');
    }

    const { id } = await params;

    let body: { action?: string; comment?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, comment } = body;

    if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
      return NextResponse.json(
        { error: 'action must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    const timesheet = await db.timesheet.findUnique({ where: { id } });

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    if (timesheet.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot ${action.toLowerCase()}: timesheet status is ${timesheet.status}, expected SUBMITTED` },
        { status: 400 }
      );
    }

    // Use the chain snapshotted at submission time; fall back to recalculating
    // for legacy timesheets created before this field was added.
    let chain: ApprovalChainStep[] = [];
    if (timesheet.approvalChainJson) {
      try {
        chain = JSON.parse(timesheet.approvalChainJson) as ApprovalChainStep[];
      } catch {
        chain = [];
      }
    }
    if (chain.length === 0) {
      chain = await resolveApprovalChain(timesheet.employeeId);
    }
    const currentStepDef = chain.find(c => c.step === timesheet.currentApprovalStep);

    // Authorization: must be the expected approver OR ADMIN can override
    if (authUser.role !== 'ADMIN') {
      if (!currentStepDef || currentStepDef.approverId !== authUser.userId) {
        const expectedName = currentStepDef?.approverName ?? '不明';
        return forbiddenResponse(`このステップは ${expectedName} が承認する必要があります`);
      }
    }

    // ── Handle REJECTED ───────────────────────────────────────────────────
    if (action === 'REJECTED') {
      const result = await db.$transaction(async (tx) => {
        const approval = await tx.approval.create({
          data: {
            timesheetId: id,
            approverId: authUser.userId,
            action: 'REJECTED',
            comment: comment || '',
            approvalStep: timesheet.currentApprovalStep,
          },
        });

        const updated = await tx.timesheet.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedAt: new Date(),
            approvedById: authUser.userId,
            managerComment: comment || '',
          },
          include: {
            employee: {
              select: {
                id: true, email: true, name: true, role: true, grade: true,
                employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
              },
            },
            approver: {
              select: {
                id: true, email: true, name: true, role: true, grade: true,
                employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
              },
            },
          },
        });

        return { approval, timesheet: mapTimesheetEmployee(updated as unknown as Record<string, unknown>) };
      });

      return NextResponse.json({ data: result });
    }

    // ── Handle APPROVED — advance to next step or finalize ────────────────
    const currentStepIndex = chain.findIndex(c => c.step === timesheet.currentApprovalStep);
    const nextStep = chain[currentStepIndex + 1];

    const isLastStep = !nextStep;
    const newStatus = isLastStep ? 'APPROVED' : 'SUBMITTED';
    const newStep = isLastStep ? timesheet.currentApprovalStep : nextStep.step;

    const result = await db.$transaction(async (tx) => {
      const approval = await tx.approval.create({
        data: {
          timesheetId: id,
          approverId: authUser.userId,
          action: 'APPROVED' as ApprovalAction,
          comment: comment || '',
          approvalStep: timesheet.currentApprovalStep,
        },
      });

      const updated = await tx.timesheet.update({
        where: { id },
        data: {
          status: newStatus,
          currentApprovalStep: newStep,
          ...(isLastStep ? {
            approvedAt: new Date(),
            approvedById: authUser.userId,
            managerComment: comment || '',
          } : {}),
        },
        include: {
          employee: {
            select: {
              id: true, email: true, name: true, role: true, grade: true,
              employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
            },
          },
          approver: {
            select: {
              id: true, email: true, name: true, role: true, grade: true,
              employeeId: true, departmentName: true, divisionName: true, groupName: true, isActive: true,
            },
          },
        },
      });

      return { approval, timesheet: mapTimesheetEmployee(updated as unknown as Record<string, unknown>) };
    });

    const stepMsg = isLastStep
      ? '最終承認完了'
      : `ステップ${timesheet.currentApprovalStep}承認 → 次はステップ${newStep}へ`;

    return NextResponse.json({ data: result, message: stepMsg });
  } catch (error) {
    console.error('Failed to approve/reject timesheet:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to approve/reject timesheet', details: message },
      { status: 500 }
    );
  }
}
