import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Never expose this endpoint in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Require an authenticated ADMIN user even in non-production environments.
  const authUser = getAuthUser(request);
  if (!authUser) return unauthorizedResponse();
  if (authUser.role !== 'ADMIN') return forbiddenResponse('ADMIN権限が必要です');

  try {
    const seeded = await seedDatabase();
    if (seeded) {
      return NextResponse.json({ success: true, message: 'CrasCAD seed OK', data: { users: 58, timesheets: 6 } });
    }
    return NextResponse.json({ success: true, message: 'Already seeded' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
