import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function POST() {
  try {
    const seeded = await seedDatabase();
    if (seeded) {
      return NextResponse.json({ success: true, message: 'Seed OK', data: { users: 6, timesheets: 6 } });
    }
    return NextResponse.json({ success: true, message: 'Already seeded' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
