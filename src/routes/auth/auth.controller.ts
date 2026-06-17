import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { loginSchema } from './auth.schema';
import { AppError } from '../../utils/app-error';

const isProduction = process.env.NODE_ENV === 'production';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const { token, user } = await authService.login(input);

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        superAdminType: user.superAdminType,
        employee: user.employee,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout berhasil' });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Anda belum login', 401);
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
