-- AlterTable
ALTER TABLE "Timesheet" ADD COLUMN     "periodText" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "reportType" SET DEFAULT 'ZENHAN';

-- CreateTable
CREATE TABLE "ReportTask" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "taskName" TEXT NOT NULL DEFAULT '',
    "prevAccum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cumulative" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTaskDaily" (
    "id" TEXT NOT NULL,
    "reportTaskId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTaskDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportTask_timesheetId_idx" ON "ReportTask"("timesheetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTask_timesheetId_rowNumber_key" ON "ReportTask"("timesheetId", "rowNumber");

-- CreateIndex
CREATE INDEX "ReportTaskDaily_reportTaskId_idx" ON "ReportTaskDaily"("reportTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTaskDaily_reportTaskId_day_key" ON "ReportTaskDaily"("reportTaskId", "day");

-- AddForeignKey
ALTER TABLE "ReportTask" ADD CONSTRAINT "ReportTask_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTaskDaily" ADD CONSTRAINT "ReportTaskDaily_reportTaskId_fkey" FOREIGN KEY ("reportTaskId") REFERENCES "ReportTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
