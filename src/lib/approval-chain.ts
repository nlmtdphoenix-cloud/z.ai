import { db } from '@/lib/db';

export interface ApprovalChainStep {
  step: number;
  approverId: string;
  approverName: string;
  approverGrade: string;
}

/**
 * CrasCAD 承認チェーン解決:
 *
 * CADデザイン事業部:
 *   Step 1 — 同グループの M1/M2 マネージャー（本人除く）
 *   Step 2 — 同部署の G2（本人除く）
 *   Step 3 — ADMIN（社長）
 *
 * 人事総括部:
 *   Step 1 — 同グループの M1/M2 マネージャー（本人除く）
 *   Step 3 — ADMIN（社長）  ← G2 ステップなし
 *
 * マネージャー自身が提出した場合 → 自分のステップをスキップ
 */
export async function resolveApprovalChain(
  employeeUserId: string,
): Promise<ApprovalChainStep[]> {
  const employee = await db.user.findUnique({
    where: { id: employeeUserId },
    include: {
      department: true,
      group: true,
    },
  });

  if (!employee) return [];

  const chain: ApprovalChainStep[] = [];

  // ── Step 1: M1/M2 in same group (primary or secondary) ──────────────────
  if (employee.groupId) {
    const mApprover = await db.user.findFirst({
      where: {
        id: { not: employeeUserId },
        grade: { in: ['M1', 'M2'] },
        OR: [
          { groupId: employee.groupId },
          { secondaryGroups: { some: { groupId: employee.groupId } } },
        ],
      },
    });
    if (mApprover) {
      chain.push({
        step: 1,
        approverId: mApprover.id,
        approverName: mApprover.name,
        approverGrade: mApprover.grade,
      });
    }
  }

  // ── Step 2: G2 in same department (CADデザイン事業部のみ) ──────────────
  const isHR = employee.department?.name === '人事総務部';
  if (!isHR && employee.departmentId) {
    const g2Approver = await db.user.findFirst({
      where: {
        id: { not: employeeUserId },
        grade: 'G2',
        departmentId: employee.departmentId,
      },
    });
    if (g2Approver) {
      chain.push({
        step: 2,
        approverId: g2Approver.id,
        approverName: g2Approver.name,
        approverGrade: g2Approver.grade,
      });
    }
  }

  // ── Step 3: 社長 (ADMIN) ───────────────────────────────────────────────
  const admin = await db.user.findFirst({
    where: {
      id: { not: employeeUserId },
      role: 'ADMIN',
    },
    orderBy: { createdAt: 'asc' },
  });
  if (admin) {
    chain.push({
      step: 3,
      approverId: admin.id,
      approverName: admin.name,
      approverGrade: admin.grade,
    });
  }

  // Safety net: never allow self-approval even if data inconsistency would permit it.
  return chain.filter((s) => s.approverId !== employeeUserId);
}
