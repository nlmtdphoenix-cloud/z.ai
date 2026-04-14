export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type WorkType =
  | 'REGULAR'
  | 'PUBLIC_HOLIDAY'
  | 'ANNUAL_LEAVE_AM'
  | 'ANNUAL_LEAVE_PM'
  | 'ANNUAL_LEAVE_FULL'
  | 'HOLIDAY_WORK'
  | 'SPECIAL_LEAVE'
  | 'ABSENCE'
  | 'COMPENSATORY_LEAVE';

export type ApprovalAction = 'APPROVED' | 'REJECTED';

export type ReportType = 'FULL' | 'HALF';

export type TaskCategory = 'DESIGN' | 'DRAFTING' | 'MEETING' | 'REVIEW' | 'OTHER';

export interface Department {
  id: string;
  name: string;
  code: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  divisions?: Division[];
  managers?: Employee[];
  _count?: { employees: number; divisions: number };
}

export interface Division {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  groups?: Group[];
}

export interface Group {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  divisionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string;
  department: string;
  division: string;
  group: string;
  departmentId?: string;
  divisionId?: string;
  groupId?: string;
  department?: Department;
  division?: Division;
  group?: Group;
  isActive: boolean;
}

export interface TimesheetSummary {
  totalWorkDays: number;
  totalOvertimeHours: number;
  annualLeaveAM: number;
  annualLeavePM: number;
  annualLeaveFull: number;
  holidayWorkDays: number;
  holidayWorkHours: number;
  compensatoryCurrent: number;
  compensatoryNext: number;
  compensatoryAfter: number;
  specialLeave: number;
  absenceDays: number;
  totalWorkHours: number;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  status: TimesheetStatus;
  reportType: ReportType;
  totalWorkDays: number;
  totalOvertimeHours: number;
  annualLeaveAM: number;
  annualLeavePM: number;
  annualLeaveFull: number;
  holidayWorkDays: number;
  holidayWorkHours: number;
  compensatoryCurrent: number;
  compensatoryNext: number;
  compensatoryAfter: number;
  specialLeave: number;
  absenceDays: number;
  totalWorkHours: number;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  managerComment: string;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  approver?: Employee;
  entries?: TimesheetEntry[];
}

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  day: number;
  workType: WorkType;
  startTime: string;
  endTime: string;
  workHours: number;
  breakMinutes: number;
  overtimeHours: number;
  holidayWorkHours: number;
  workContent: string;
  overUnder: number;
  tasks?: WorkTask[];
}

export interface WorkTask {
  id: string;
  timesheetEntryId: string;
  project: string;
  category: TaskCategory;
  hours: number;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  timesheetId: string;
  approverId: string;
  action: ApprovalAction;
  comment: string;
  createdAt: string;
}
