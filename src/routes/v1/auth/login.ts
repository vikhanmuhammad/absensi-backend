import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../../../utils/db';
import { generateToken } from '../../../services/authService';
import { apiOk, apiError, handleError } from '../../../tools/common';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const post = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await db.user.findUnique({ where: { username }, include: { employee: true } });
    if (!user || !user.statusAktif) return apiError(res, 'Username atau password salah', 401);

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) return apiError(res, 'Username atau password salah', 401);

    const token = generateToken({
      userId: user.id,
      role: user.role,
      employeeId: user.employee?.id ?? null,
      superAdminType: user.superAdminType,
    });

    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return apiOk(
      res,
      {
        id: user.id,
        username: user.username,
        role: user.role,
        superAdminType: user.superAdminType,
        employee: user.employee,
      },
      'Login berhasil',
    );
  } catch (error) {
    return handleError(res, error);
  }
};
