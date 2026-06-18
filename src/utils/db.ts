import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var dbGlobal: PrismaClient | undefined;
}

export const db = global.dbGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.dbGlobal = db;
}
