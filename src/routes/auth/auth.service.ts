import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { LoginInput } from './auth.schema';

export async function login({ username, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { employee: true },
  });

  if (!user || !user.statusAktif) {
    throw new AppError('Username atau password salah', 401);
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError('Username atau password salah', 401);
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      employeeId: user.employee?.id ?? null,
      superAdminType: user.superAdminType,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as jwt.SignOptions,
  );

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  return { token, user };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: { include: { divisi: true } } },
  });

  if (!user) {
    throw new AppError('User tidak ditemukan', 404);
  }

  return user;
}
