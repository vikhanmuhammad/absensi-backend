import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Data sudah ada (melanggar unique constraint)' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
}
