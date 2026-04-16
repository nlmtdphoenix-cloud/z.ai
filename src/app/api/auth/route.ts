import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, comparePassword } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';
import { rateLimit, clientIdFromRequest } from '@/lib/rate-limit';
import { isSameOriginRequest, originForbiddenResponse } from '@/lib/origin-check';

const ALLOW_AUTO_SEED = process.env.ALLOW_AUTO_SEED === 'true';
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) return originForbiddenResponse();

    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Rate limit by client IP + email to blunt credential brute-force while
    // still letting legitimate users retry from a shared NAT.
    const rateKey = `login:${clientIdFromRequest(request)}:${String(email).toLowerCase()}`;
    const rl = rateLimit(rateKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'ログイン試行回数が多すぎます。しばらくしてからお試しください' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    // Auto-seed is opt-in via env flag (dev/demo only). In production this must be
    // done via the explicit /api/seed endpoint, never on the login path.
    if (ALLOW_AUTO_SEED && process.env.NODE_ENV !== 'production') {
      await seedDatabase();
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    // Verify password (bcrypt only — no plaintext fallback)
    const passwordValid = await comparePassword(password, user.password);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      grade: user.grade,
      clientSide: user.clientSide,
      employeeId: user.employeeId,
      department: user.departmentName,
      division: user.divisionName,
      group: user.groupName,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
