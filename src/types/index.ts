import { Role, SuperAdminType } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  role: Role;
  employeeId: string | null;
  superAdminType: SuperAdminType | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
