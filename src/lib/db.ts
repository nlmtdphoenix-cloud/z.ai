// Override DATABASE_URL before Prisma Client import if it's not PostgreSQL.
// The system environment may have a SQLite URL that overrides .env files.
if (!process.env.DATABASE_URL?.startsWith('postgresql')) {
  process.env.DATABASE_URL = "postgresql://z@localhost:5432/hr_timesheet"
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
