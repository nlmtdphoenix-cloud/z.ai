import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/departments - List all departments with nested data
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const includeDivisions = searchParams.get('includeDivisions') !== 'false';
    const includeGroups = searchParams.get('includeGroups') !== 'false';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const departments = await db.department.findMany({
      where,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
        ...(includeDivisions
          ? {
              divisions: {
                where: activeOnly ? { isActive: true } : undefined,
                orderBy: [{ order: 'asc' }, { name: 'asc' }],
                include: {
                  ...(includeGroups
                    ? {
                        groups: {
                          where: activeOnly ? { isActive: true } : undefined,
                          orderBy: [{ order: 'asc' }, { name: 'asc' }],
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: departments });
  } catch (error) {
    console.error('Failed to list departments:', error);
    return NextResponse.json(
      { error: 'Failed to list departments' },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a new department (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse('部署の作成は管理者のみ可能です');

    const body = await request.json();
    const { name, code } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await db.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Department with this name already exists' },
        { status: 409 }
      );
    }

    const department = await db.department.create({
      data: {
        name: name.trim(),
        code: code || '',
        isActive: true,
      },
    });

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    console.error('Failed to create department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
