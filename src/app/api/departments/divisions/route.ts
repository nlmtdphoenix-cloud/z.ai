import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/departments/divisions - List all divisions
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

    const divisions = await db.division.findMany({
      where,
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
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: divisions });
  } catch (error) {
    console.error('Failed to list divisions:', error);
    return NextResponse.json(
      { error: 'Failed to list divisions' },
      { status: 500 }
    );
  }
}

// POST /api/departments/divisions - Create a new division (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const body = await request.json();
    const { name, departmentId, order } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Division name is required' },
        { status: 400 }
      );
    }

    if (!departmentId) {
      return NextResponse.json(
        { error: 'departmentId is required' },
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

    const division = await db.division.create({
      data: {
        name: name.trim(),
        departmentId,
        order: typeof order === 'number' ? order : 0,
        isActive: true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: division }, { status: 201 });
  } catch (error) {
    console.error('Failed to create division:', error);
    return NextResponse.json(
      { error: 'Failed to create division' },
      { status: 500 }
    );
  }
}
