import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/holidays/[id] — ADMIN only
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role !== 'ADMIN') return forbiddenResponse('ADMIN権限が必要です');

  const { id } = await params;

  const existing = await db.holiday.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
  }

  await db.holiday.delete({ where: { id } });
  return NextResponse.json({ message: 'Deleted' });
}
