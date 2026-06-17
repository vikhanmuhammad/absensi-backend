import { Request, Response, NextFunction } from 'express';
import * as attendanceService from './attendance.service';
import { clockInSchema, clockOutSchema, bulkAttendanceSchema } from './attendance.schema';
import { AppError } from '../../utils/app-error';

// Koordinat GPS hanya boleh dilihat HRD/Super Admin (FR-ABS-05) — karyawan tidak pernah melihatnya.
function omitLocationIfNotPrivileged<T extends Record<string, unknown> | null>(record: T, role: string): T {
  if (!record) return record;
  if (role === 'HRD' || role === 'SUPER_ADMIN') return record;
  const { latitude, longitude, ...rest } = record;
  return rest as T;
}

export async function clockIn(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const input = clockInSchema.parse(req.body);
    const result = await attendanceService.clockIn(req.user.employeeId, input);
    res.json({ success: true, data: omitLocationIfNotPrivileged(result, req.user.role), message: 'Absen masuk berhasil' });
  } catch (err) {
    next(err);
  }
}

export async function clockOut(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const input = clockOutSchema.parse(req.body);
    const result = await attendanceService.clockOut(req.user.employeeId, input);
    res.json({ success: true, data: omitLocationIfNotPrivileged(result, req.user.role), message: 'Absen pulang berhasil' });
  } catch (err) {
    next(err);
  }
}

export async function getToday(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) throw new AppError('Akun ini tidak terhubung ke data karyawan', 400);
    const result = await attendanceService.getToday(req.user.employeeId);
    res.json({ success: true, data: omitLocationIfNotPrivileged(result, req.user.role) });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId;
    if (!employeeId) throw new AppError('employeeId wajib diisi', 400);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const result = await attendanceService.getHistory({ employeeId, startDate, endDate });
    const role = req.user!.role;
    res.json({ success: true, data: result.map((r) => omitLocationIfNotPrivileged(r, role)) });
  } catch (err) {
    next(err);
  }
}

export async function bulkInput(req: Request, res: Response, next: NextFunction) {
  try {
    const input = bulkAttendanceSchema.parse(req.body);
    const result = await attendanceService.bulkInput(req.user!.userId, input);
    res.json({ success: true, data: result, message: 'Absensi massal berhasil disimpan' });
  } catch (err) {
    next(err);
  }
}
