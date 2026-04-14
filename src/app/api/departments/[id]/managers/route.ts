import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/departments/[id]/managers - List managers for this department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id: departmentId } = await params;

    // Verify department exists
    const department = await db.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: '部署が見つかりません' },
        { status: 404 }
      );
    }

    const managers = await db.departmentManager.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: managers });
  } catch (error) {
    console.error('Failed to list managers:', error);
    return NextResponse.json(
      { error: '管理者一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST /api/departments/[id]/managers - Add a manager to this department (ADMIN only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id: departmentId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdは必須です' },
        { status: 400 }
      );
    }

    // Verify department exists
    const department = await db.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: '部署が見つかりません' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existing = await db.departmentManager.findUnique({
      where: {
        departmentId_userId: {
          departmentId,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'このユーザーは既にこの部署の管理者です' },
        { status: 409 }
      );
    }

    const manager = await db.departmentManager.create({
      data: {
        departmentId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    return NextResponse.json({ data: manager }, { status: 201 });
  } catch (error) {
    console.error('Failed to add manager:', error);
    return NextResponse.json(
      { error: '管理者の追加に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/[id]/managers - Remove a manager (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id: departmentId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdは必須です' },
        { status: 400 }
      );
    }

    // Find the DepartmentManager record
    const existing = await db.departmentManager.findUnique({
      where: {
        departmentId_userId: {
          departmentId,
          userId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'この管理者の紐付けが見つかりません' },
        { status: 404 }
      );
    }

    await db.departmentManager.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ data: { id: existing.id } });
  } catch (error) {
    console.error('Failed to remove manager:', error);
    return NextResponse.json(
      { error: '管理者の削除に失敗しました' },
      { status: 500 }
    );
  }
}
