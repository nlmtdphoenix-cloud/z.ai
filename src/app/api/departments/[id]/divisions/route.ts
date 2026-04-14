import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// POST /api/departments/[id]/divisions - Create a division under this department (ADMIN only)
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
    const { name, order, isActive } = body;

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

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: '部門名は必須です' },
        { status: 400 }
      );
    }

    const division = await db.division.create({
      data: {
        name: name.trim(),
        order: typeof order === 'number' ? order : 0,
        isActive: isActive !== undefined ? isActive : true,
        departmentId,
      },
    });

    return NextResponse.json({ data: division }, { status: 201 });
  } catch (error) {
    console.error('Failed to create division:', error);
    return NextResponse.json(
      { error: '部門の作成に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/departments/[id]/divisions - List divisions for this department
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

    const divisions = await db.division.findMany({
      where: { departmentId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        groups: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    return NextResponse.json({ data: divisions });
  } catch (error) {
    console.error('Failed to list divisions:', error);
    return NextResponse.json(
      { error: '部門一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
