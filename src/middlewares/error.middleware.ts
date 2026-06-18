import { Request, Response, NextFunction } from 'express';
import { apiError } from '../tools/common';

/**
 * Safety net terakhir untuk error yang tidak tertangani try/catch di dalam route file
 * (setiap route file idealnya sudah menangani error sendiri lewat handleError() dari tools/common).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  apiError(res, 'Terjadi kesalahan pada server', 500);
}
