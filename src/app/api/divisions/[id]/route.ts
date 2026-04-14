import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PUT /api/divisions/[id] - Update division (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id } = await params;
    const body = await request.json();

    const existing = await db.division.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '部門が見つかりません' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const division = await db.division.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: division });
  } catch (error) {
    console.error('Failed to update division:', error);
    return NextResponse.json(
      { error: '部門の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/divisions/[id] - Soft-delete or hard-delete division (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id } = await params;

    const existing = await db.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '部門が見つかりません' },
        { status: 404 }
      );
    }

    if (existing._count.employees > 0) {
      // Soft-delete: set isActive=false
      const division = await db.division.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ data: division });
    } else {
      // Hard-delete
      await db.division.delete({
        where: { id },
      });
      return NextResponse.json({ data: { id } });
    }
  } catch (error) {
    console.error('Failed to delete division:', error);
    return NextResponse.json(
      { error: '部門の削除に失敗しました' },
      { status: 500 }
    );
  }
}
