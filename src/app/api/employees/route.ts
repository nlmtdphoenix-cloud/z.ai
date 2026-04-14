import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapEmployeeFields } from '@/lib/map-employee';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

// GET /api/employees - List all employees with optional filtering
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const departmentId = searchParams.get('departmentId');
    const role = searchParams.get('role');
    const active = searchParams.get('active');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (department) {
      where.departmentName = department;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (role) {
      where.role = role;
    }
    if (active !== null && active !== undefined && active !== '') {
      where.isActive = active === 'true';
    }

    const employees = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        departmentId: true,
        divisionId: true,
        groupId: true,
        departmentName: true,
        divisionName: true,
        groupName: true,
        isActive: true,
        createdAt: true,
        department: {
          select: { id: true, name: true },
        },
        division: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: employees.map(mapEmployeeFields) });
  } catch (error) {
    console.error('Failed to list employees:', error);
    return NextResponse.json(
      { error: 'Failed to list employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create a new employee (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse('社員追加は管理者のみ可能です');

    const body = await request.json();
    const {
      name,
      email,
      role,
      employeeId,
      department,
      division,
      group,
      departmentId,
      divisionId,
      groupId,
    } = body;

    // Support both legacy field names and new field names
    const deptId = departmentId || '';
    const divId = divisionId || '';
    const grpId = groupId || '';
    const deptName = department || '';
    const divName = division || '';
    const grpName = group || '';

    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Resolve and validate department
    let resolvedDeptName = deptName;
    if (deptId) {
      const dept = await db.department.findUnique({
        where: { id: deptId },
        select: { name: true },
      });
      if (!dept) {
        return NextResponse.json({ error: '指定された部署が存在しません' }, { status: 400 });
      }
      if (!deptName) resolvedDeptName = dept.name;
    }

    // Resolve and validate division
    let resolvedDivName = divName;
    if (divId) {
      const div = await db.division.findUnique({
        where: { id: divId },
        select: { name: true },
      });
      if (!div) {
        return NextResponse.json({ error: '指定された室が存在しません' }, { status: 400 });
      }
      if (!divName) resolvedDivName = div.name;
    }

    // Resolve and validate group
    let resolvedGrpName = grpName;
    if (grpId) {
      const grp = await db.group.findUnique({
        where: { id: grpId },
        select: { name: true },
      });
      if (!grp) {
        return NextResponse.json({ error: '指定されたグループが存在しません' }, { status: 400 });
      }
      if (!grpName) resolvedGrpName = grp.name;
    }

    const hashedPassword = await hashPassword('demo123');

    const employee = await db.user.create({
      data: {
        name,
        email,
        role: role || 'EMPLOYEE',
        employeeId: employeeId || '',
        departmentId: deptId || null,
        divisionId: divId || null,
        groupId: grpId || null,
        departmentName: resolvedDeptName,
        divisionName: resolvedDivName,
        groupName: resolvedGrpName,
        password: hashedPassword,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        departmentId: true,
        divisionId: true,
        groupId: true,
        departmentName: true,
        divisionName: true,
        groupName: true,
        isActive: true,
        department: {
          select: { id: true, name: true },
        },
        division: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: mapEmployeeFields(employee) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees - Update an existing employee (ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorizedResponse();
    if (authUser.role !== 'ADMIN') return forbiddenResponse('社員更新は管理者のみ可能です');

    const body = await request.json();
    const {
      id,
      name,
      email,
      role,
      employeeId,
      department,
      division,
      group,
      departmentId,
      divisionId,
      groupId,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Support both legacy field names and new field names
    const deptId = departmentId ?? '';
    const divId = divisionId ?? '';
    const grpId = groupId ?? '';
    const deptName = department;
    const divName = division;
    const grpName = group;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle department with validation and name resolution
    if (deptId !== undefined) {
      if (deptId) {
        const dept = await db.department.findUnique({
          where: { id: deptId },
          select: { name: true },
        });
        if (!dept) {
          return NextResponse.json({ error: '指定された部署が存在しません' }, { status: 400 });
        }
        updateData.departmentId = deptId;
        if (deptName === undefined) updateData.departmentName = dept.name;
      } else {
        // Clearing department
        updateData.departmentId = null;
        if (deptName === undefined) updateData.departmentName = '';
      }
    } else if (deptName !== undefined) {
      updateData.departmentName = deptName;
    }

    // Handle division with validation and name resolution
    if (divId !== undefined) {
      if (divId) {
        const div = await db.division.findUnique({
          where: { id: divId },
          select: { name: true },
        });
        if (!div) {
          return NextResponse.json({ error: '指定された室が存在しません' }, { status: 400 });
        }
        updateData.divisionId = divId;
        if (divName === undefined) updateData.divisionName = div.name;
      } else {
        // Clearing division
        updateData.divisionId = null;
        if (divName === undefined) updateData.divisionName = '';
      }
    } else if (divName !== undefined) {
      updateData.divisionName = divName;
    }

    // Handle group with validation and name resolution
    if (grpId !== undefined) {
      if (grpId) {
        const grp = await db.group.findUnique({
          where: { id: grpId },
          select: { name: true },
        });
        if (!grp) {
          return NextResponse.json({ error: '指定されたグループが存在しません' }, { status: 400 });
        }
        updateData.groupId = grpId;
        if (grpName === undefined) updateData.groupName = grp.name;
      } else {
        // Clearing group
        updateData.groupId = null;
        if (grpName === undefined) updateData.groupName = '';
      }
    } else if (grpName !== undefined) {
      updateData.groupName = grpName;
    }

    const employee = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        departmentId: true,
        divisionId: true,
        groupId: true,
        departmentName: true,
        divisionName: true,
        groupName: true,
        isActive: true,
        department: {
          select: { id: true, name: true },
        },
        division: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: mapEmployeeFields(employee) });
  } catch (error) {
    console.error('Failed to update employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}
