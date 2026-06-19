import jwt from 'jsonwebtoken';
import { Role, SuperAdminType } from '@prisma/client';

interface TokenPayload {
  userId: number;
  role: Role;
  employeeId: number | null;
  superAdminType: SuperAdminType | null;
}

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  } as jwt.SignOptions);
}
