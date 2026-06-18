import { Request, Response } from 'express';
import { z } from 'zod';
import { StatusKehadiran } from '@prisma/client';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { startOfDay, JAM_KELUAR_REGULER, omitLocationIfNotPrivileged } from '../../../services/attendanceService';

const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const post = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const input = clockOutSchema.parse(req.body);
      const tanggal = startOfDay(new Date());

      const existing = await db.attendance.findUnique({ where: { employeeId_tanggal: { employeeId, tanggal } } });
      if (!existing?.jamMasuk) return apiError(res, 'Anda belum melakukan absen masuk hari ini', 400);
      if (existing.jamKeluar) return apiError(res, 'Anda sudah melakukan absen pulang hari ini', 400);

      const now = new Date();
      const jamDesimal = now.getHours() + now.getMinutes() / 60;
      const pulangCepat = jamDesimal < JAM_KELUAR_REGULER;
      const statusKehadiran: StatusKehadiran =
        pulangCepat && existing.statusKehadiran === 'TEPAT_WAKTU' ? 'PULANG_CEPAT' : existing.statusKehadiran;

      const attendance = await db.attendance.update({
        where: { employeeId_tanggal: { employeeId, tanggal } },
        data: {
          jamKeluar: now,
          statusKehadiran,
          latitude: input.latitude ?? existing.latitude,
          longitude: input.longitude ?? existing.longitude,
        },
      });

      return apiOk(res, omitLocationIfNotPrivileged(attendance, req.user!.role), 'Absen pulang berhasil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
