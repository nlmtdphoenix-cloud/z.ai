import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, comparePassword, hashPassword } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Auto-seed: if no users exist, create demo data synchronously
    await seedDatabase();

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

    // Verify password
    let passwordValid = await comparePassword(password, user.password);

    // Backward compatibility: if bcrypt fails AND stored password matches plaintext, allow login
    // and auto-hash the password for future logins
    if (!passwordValid && user.password === password) {
      passwordValid = true;
      // Auto-hash the plaintext password in the background
      try {
        const hashed = await hashPassword(password);
        await db.user.update({
          where: { id: user.id },
          data: { password: hashed },
        });
      } catch {
        // Silently fail auto-hash - user can still login
      }
    }

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
