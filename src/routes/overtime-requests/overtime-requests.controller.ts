import { Request, Response, NextFunction } from 'express';
import * as overtimeRequestsService from './overtime-requests.service';
import { createOvertimeRequestSchema, createBulkOvertimeRequestSchema } from './overtime-requests.schema';
import { AppError } from '../../utils/app-error';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const result = await overtimeRequestsService.listMine(req.user.employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const input = createOvertimeRequestSchema.parse(req.body);
    const result = await overtimeRequestsService.createIndividual(req.user.employeeId, input);
    res.status(201).json({ success: true, data: result, message: 'Pengajuan lembur berhasil dikirim' });
  } catch (err) {
    next(err);
  }
}

export async function createBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBulkOvertimeRequestSchema.parse(req.body);
    const result = await overtimeRequestsService.createBulk(req.user!.userId, input);
    res.status(201).json({ success: true, data: result, message: 'Lembur massal berhasil dicatat' });
  } catch (err) {
    next(err);
  }
}
