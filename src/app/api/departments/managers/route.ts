import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/departments/managers - List all department managers
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const managers = await db.departmentManager.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeId: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: managers });
  } catch (error) {
    console.error('Failed to list department managers:', error);
    return NextResponse.json(
      { error: 'Failed to list department managers' },
      { status: 500 }
    );
  }
}

// POST /api/departments/managers - Assign a manager to a department (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const body = await request.json();
    const { departmentId, userId } = body;

    if (!departmentId) {
      return NextResponse.json(
        { error: 'departmentId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify department exists
    const department = await db.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
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
        { error: 'User is already a manager of this department' },
        { status: 409 }
      );
    }

    const manager = await db.departmentManager.create({
      data: {
        departmentId,
        userId,
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeId: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ data: manager }, { status: 201 });
  } catch (error) {
    console.error('Failed to assign department manager:', error);
    return NextResponse.json(
      { error: 'Failed to assign department manager' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/managers - Unassign a manager from a department (ADMIN only)
export async function DELETE(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const body = await request.json();
    const { departmentId, userId } = body;

    if (!departmentId) {
      return NextResponse.json(
        { error: 'departmentId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

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
        { error: 'Manager assignment not found' },
        { status: 404 }
      );
    }

    await db.departmentManager.delete({
      where: {
        departmentId_userId: {
          departmentId,
          userId,
        },
      },
    });

    return NextResponse.json({
      data: null,
      message: 'Manager unassigned from department',
    });
  } catch (error) {
    console.error('Failed to unassign department manager:', error);
    return NextResponse.json(
      { error: 'Failed to unassign department manager' },
      { status: 500 }
    );
  }
}
