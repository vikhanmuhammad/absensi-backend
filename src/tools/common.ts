import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function apiOk(res: Response, data: unknown, message: string, code = 200) {
  return res.status(code).json({ success: true, status: code, message, data });
}

export function apiError(res: Response, message: string, code: number) {
  return res.status(code).json({ success: false, status: code, error: { message } });
}

/**
 * Penerjemah error generik dipakai di blok catch tiap route file
 * (ZodError -> 400, Prisma unique/notfound -> 409/404, selain itu -> 500).
 */
export function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return apiError(res, error.issues.map((issue) => issue.message).join(', '), 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return apiError(res, 'Data sudah ada (melanggar unique constraint)', 409);
    if (error.code === 'P2025') return apiError(res, 'Data tidak ditemukan', 404);
  }

  console.error(error);
  return apiError(res, 'Internal Server Error', 500);
}
