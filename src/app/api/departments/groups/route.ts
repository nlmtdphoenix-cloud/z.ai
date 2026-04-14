import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/departments/groups - List all groups
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId');

    const where: Record<string, unknown> = {};
    if (divisionId) {
      where.divisionId = divisionId;
    }

    const groups = await db.group.findMany({
      where,
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
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: groups });
  } catch (error) {
    console.error('Failed to list groups:', error);
    return NextResponse.json(
      { error: 'Failed to list groups' },
      { status: 500 }
    );
  }
}

// POST /api/departments/groups - Create a new group (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse();

    const body = await request.json();
    const { name, divisionId, order } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (!divisionId) {
      return NextResponse.json(
        { error: 'divisionId is required' },
        { status: 400 }
      );
    }

    // Verify division exists
    const division = await db.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return NextResponse.json(
        { error: 'Division not found' },
        { status: 404 }
      );
    }

    const group = await db.group.create({
      data: {
        name: name.trim(),
        divisionId,
        order: typeof order === 'number' ? order : 0,
        isActive: true,
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}
