/**
 * Map Prisma schema field names (departmentName, divisionName, groupName)
 * to frontend field names (department, division, group).
 *
 * This ensures consistency across all API routes that return employee data.
 */
export function mapEmployeeFields(emp: Record<string, unknown>) {
  return {
    ...emp,
    department: emp.departmentName ?? '',
    division: emp.divisionName ?? '',
    group: emp.groupName ?? '',
    departmentName: undefined,
    divisionName: undefined,
    groupName: undefined,
  };
}

/**
 * Map nested employee/approver objects in a timesheet response.
 * Used by timesheet API routes where employee is a nested relation.
 */
export function mapTimesheetEmployee(ts: Record<string, unknown>): Record<string, unknown> {
  return {
    ...ts,
    employee: ts.employee ? mapEmployeeFields(ts.employee as Record<string, unknown>) : undefined,
    approver: ts.approver ? mapEmployeeFields(ts.approver as Record<string, unknown>) : undefined,
  };
}
