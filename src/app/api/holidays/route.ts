import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET /api/holidays?year=2026
export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');

  const where = year ? { year: parseInt(year, 10) } : {};
  const holidays = await db.holiday.findMany({
    where,
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { day: 'asc' }],
  });

  return NextResponse.json({ data: holidays });
}

// POST /api/holidays — ADMIN only
export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role !== 'ADMIN') return forbiddenResponse('ADMIN権限が必要です');

  let body: { year?: number; month?: number; day?: number; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { year, month, day, name } = body;
  if (!year || !month || !day) {
    return NextResponse.json({ error: 'year, month, day are required' }, { status: 400 });
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return NextResponse.json({ error: 'Invalid month or day' }, { status: 400 });
  }

  try {
    const holiday = await db.holiday.upsert({
      where: { year_month_day: { year, month, day } },
      create: { year, month, day, name: name || '' },
      update: { name: name || '' },
    });
    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error) {
    console.error('Failed to create holiday:', error);
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}
