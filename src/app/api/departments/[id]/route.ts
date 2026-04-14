import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PUT /api/departments/[id] - Update a department (ADMIN only)
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
        { error: 'Department id is required' },
        { status: 400 }
      );
    }

    const existing = await db.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, code, isActive } = body;

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await db.department.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Department with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code;
    if (isActive !== undefined) updateData.isActive = isActive;

    const department = await db.department.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: department });
  } catch (error) {
    console.error('Failed to update department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/[id] - Soft delete or hard delete (ADMIN only)
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
        { error: 'Department id is required' },
        { status: 400 }
      );
    }

    const existing = await db.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            divisions: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    const { employees, divisions } = existing._count;

    // If department has employees or divisions, soft delete
    if (employees > 0 || divisions > 0) {
      const department = await db.department.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        data: department,
        message: 'Department soft-deleted (has employees or divisions)',
      });
    }

    // Otherwise, hard delete
    await db.department.delete({
      where: { id },
    });

    return NextResponse.json({
      data: null,
      message: 'Department deleted',
    });
  } catch (error) {
    console.error('Failed to delete department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
