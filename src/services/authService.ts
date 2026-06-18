import jwt from 'jsonwebtoken';
import { Role, SuperAdminType } from '@prisma/client';

interface TokenPayload {
  userId: string;
  role: Role;
  employeeId: string | null;
  superAdminType: SuperAdminType | null;
}

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  } as jwt.SignOptions);
}
