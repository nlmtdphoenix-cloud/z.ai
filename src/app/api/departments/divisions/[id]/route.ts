import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PUT /api/departments/divisions/[id] - Update a division (ADMIN only)
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
        { error: 'Division id is required' },
        { status: 400 }
      );
    }

    const existing = await db.division.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Division not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, departmentId, order, isActive } = body;

    // Verify new department exists if changing
    if (departmentId && departmentId !== existing.departmentId) {
      const department = await db.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const division = await db.division.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            groups: true,
            employees: true,
          },
        },
      },
    });

    return NextResponse.json({ data: division });
  } catch (error) {
    console.error('Failed to update division:', error);
    return NextResponse.json(
      { error: 'Failed to update division' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/divisions/[id] - Delete a division (ADMIN only)
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
        { error: 'Division id is required' },
        { status: 400 }
      );
    }

    const existing = await db.division.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Division not found' },
        { status: 404 }
      );
    }

    // Cascade delete will remove groups automatically
    await db.division.delete({
      where: { id },
    });

    return NextResponse.json({
      data: null,
      message: 'Division deleted (groups cascade deleted)',
    });
  } catch (error) {
    console.error('Failed to delete division:', error);
    return NextResponse.json(
      { error: 'Failed to delete division' },
      { status: 500 }
    );
  }
}
