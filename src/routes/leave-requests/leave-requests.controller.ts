import { Request, Response, NextFunction } from 'express';
import * as leaveRequestsService from './leave-requests.service';
import { createLeaveRequestSchema, decideLeaveRequestSchema } from './leave-requests.schema';
import { AppError } from '../../utils/app-error';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const result = await leaveRequestsService.listMine(req.user.employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listPending(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await leaveRequestsService.listPending();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const input = createLeaveRequestSchema.parse(req.body);
    const result = await leaveRequestsService.create(req.user.employeeId, input);
    res.status(201).json({ success: true, data: result, message: 'Pengajuan cuti berhasil dikirim' });
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { catatan } = decideLeaveRequestSchema.parse(req.body);
    const result = await leaveRequestsService.approve(req.params.id as string, req.user!.userId, catatan);
    res.json({ success: true, data: result, message: 'Pengajuan cuti disetujui' });
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { catatan } = decideLeaveRequestSchema.parse(req.body);
    const result = await leaveRequestsService.reject(req.params.id as string, req.user!.userId, catatan);
    res.json({ success: true, data: result, message: 'Pengajuan cuti ditolak' });
  } catch (err) {
    next(err);
  }
}
