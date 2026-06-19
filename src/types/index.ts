import { Role, SuperAdminType } from '@prisma/client';

export interface AuthPayload {
  userId: number;
  role: Role;
  employeeId: number | null;
  superAdminType: SuperAdminType | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
