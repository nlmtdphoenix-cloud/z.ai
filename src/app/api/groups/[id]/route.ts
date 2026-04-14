import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PUT /api/groups/[id] - Update group (ADMIN only)
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

    const existing = await db.group.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'グループが見つかりません' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const group = await db.group.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error('Failed to update group:', error);
    return NextResponse.json(
      { error: 'グループの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - Delete group (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id } = await params;

    const existing = await db.group.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'グループが見つかりません' },
        { status: 404 }
      );
    }

    await db.group.delete({
      where: { id },
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json(
      { error: 'グループの削除に失敗しました' },
      { status: 500 }
    );
  }
}
