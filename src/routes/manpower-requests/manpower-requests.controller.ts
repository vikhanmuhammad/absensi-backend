import { Request, Response, NextFunction } from 'express';
import * as manpowerRequestsService from './manpower-requests.service';
import { createManpowerRequestSchema, approveManpowerRequestSchema } from './manpower-requests.schema';

export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const divisiId = req.query.divisiId as string | undefined;
    const result = await manpowerRequestsService.listPendingForDivision(divisiId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createManpowerRequestSchema.parse(req.body);
    const result = await manpowerRequestsService.create(input);
    res.status(201).json({ success: true, data: result, message: 'Request manpower berhasil diajukan' });
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = approveManpowerRequestSchema.parse(req.body);
    const result = await manpowerRequestsService.approve(req.params.id as string, req.user!.userId, employeeId);
    res.json({ success: true, data: result, message: 'Request manpower disetujui' });
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await manpowerRequestsService.reject(req.params.id as string, req.user!.userId, req.body?.catatan);
    res.json({ success: true, data: result, message: 'Request manpower ditolak' });
  } catch (err) {
    next(err);
  }
}
