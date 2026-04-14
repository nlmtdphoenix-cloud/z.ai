import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PUT /api/departments/groups/[id] - Update a group (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Group id is required' },
        { status: 400 }
      );
    }

    const existing = await db.group.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, divisionId, order, isActive } = body;

    // Verify new division exists if changing
    if (divisionId && divisionId !== existing.divisionId) {
      const division = await db.division.findUnique({
        where: { id: divisionId },
      });
      if (!division) {
        return NextResponse.json(
          { error: 'Division not found' },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (divisionId !== undefined) updateData.divisionId = divisionId;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const group = await db.group.update({
      where: { id },
      data: updateData,
      include: {
        division: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error('Failed to update group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/groups/[id] - Delete a group (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Group id is required' },
        { status: 400 }
      );
    }

    const existing = await db.group.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    await db.group.delete({
      where: { id },
    });

    return NextResponse.json({
      data: null,
      message: 'Group deleted',
    });
  } catch (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
