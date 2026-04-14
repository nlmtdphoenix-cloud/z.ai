---
## Task ID: 1 - seed-and-types
### Work Task
Create seed API endpoint, types, constants, and calculation utility files for the Timesheet App.

### Files Created
1. `src/lib/types.ts` - TypeScript types (UserRole, TimesheetStatus, WorkType, interfaces for Employee, Timesheet, TimesheetEntry, Approval)
2. `src/lib/constants.ts` - App constants (work hours, break, Japanese labels, colors, public holidays 2025/2026, helper function)
3. `src/lib/calculations.ts` - Utility functions (calculateWorkHours, calculateOvertime, calculateOverUnder, calculateMonthlyCumulative)
4. `src/app/api/seed/route.ts` - POST /api/seed endpoint that clears DB and populates with 6 users, 6 timesheets (various statuses), detailed entries for Tanaka Feb 2026, system settings, and approval records

### Verification
- ESLint: ✅ No errors
- Prisma: ✅ Schema in sync
- Seed creates realistic demo data across all timesheet statuses (DRAFT, SUBMITTED, APPROVED, REJECTED)
