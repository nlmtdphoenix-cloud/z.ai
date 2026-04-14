import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// POST /api/divisions/[id]/groups - Create a group under this division
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id: divisionId } = await params;
    const body = await request.json();
    const { name, order, isActive } = body;

    // Verify division exists
    const division = await db.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return NextResponse.json(
        { error: '部門が見つかりません' },
        { status: 404 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'グループ名は必須です' },
        { status: 400 }
      );
    }

    const group = await db.group.create({
      data: {
        name: name.trim(),
        order: typeof order === 'number' ? order : 0,
        isActive: isActive !== undefined ? isActive : true,
        divisionId,
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'グループの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/divisions/[id]/groups - List groups for this division
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { id: divisionId } = await params;

    // Verify division exists
    const division = await db.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return NextResponse.json(
        { error: '部門が見つかりません' },
        { status: 404 }
      );
    }

    const groups = await db.group.findMany({
      where: { divisionId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: groups });
  } catch (error) {
    console.error('Failed to list groups:', error);
    return NextResponse.json(
      { error: 'グループ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
