import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import {
  startOfDay,
  hitungStatusMasuk,
  getActiveProjectAssignment,
  omitLocationIfNotPrivileged,
} from '../../../services/attendanceService';

const clockInSchema = z.object({
  namaProjekAktivitas: z.string().min(1, 'Nama project/aktivitas wajib diisi'),
  lokasiKerja: z.enum(['KANTOR', 'LAINNYA']),
  lokasiLainnyaDetail: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const post = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const input = clockInSchema.parse(req.body);
      const employee = await db.employee.findUnique({ where: { id: employeeId } });
      if (!employee) return apiError(res, 'Karyawan tidak ditemukan', 404);
      if (!employee.statusAktif) return apiError(res, 'Akun karyawan sudah dinonaktifkan, silakan hubungi HRD', 403);

      const now = new Date();

      // Cek apakah kontrak sudah berakhir (untuk karyawan kontrak)
      if (employee.statusKaryawan === 'KONTRAK' && employee.tanggalAkhirKontrak) {
        const endDate = new Date(employee.tanggalAkhirKontrak);
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) {
          return apiError(res, 'Kontrak kerja sudah berakhir, silakan hubungi HRD untuk perpanjangan', 403);
        }
      }

      const tanggal = startOfDay(now);

      const existing = await db.attendance.findUnique({ where: { employeeId_tanggal: { employeeId, tanggal } } });
      if (existing?.jamMasuk) return apiError(res, 'Anda sudah melakukan absen masuk hari ini', 400);

      // Jika karyawan sedang "Assigned to Project", sarankan/isi nama projek formal (FR-ABS-02).
      const assignment = await getActiveProjectAssignment(employeeId, tanggal);
      const namaProjekAktivitas = assignment ? assignment.project.namaProjek : input.namaProjekAktivitas;
      const statusKehadiran = await hitungStatusMasuk(now, employee.statusKaryawan);

      const attendance = await db.attendance.upsert({
        where: { employeeId_tanggal: { employeeId, tanggal } },
        create: {
          employeeId,
          tanggal,
          jamMasuk: now,
          namaProjekAktivitas,
          lokasiKerja: input.lokasiKerja,
          lokasiLainnyaDetail: input.lokasiLainnyaDetail,
          latitude: input.latitude,
          longitude: input.longitude,
          statusKehadiran,
        },
        update: {
          jamMasuk: now,
          namaProjekAktivitas,
          lokasiKerja: input.lokasiKerja,
          lokasiLainnyaDetail: input.lokasiLainnyaDetail,
          latitude: input.latitude,
          longitude: input.longitude,
          statusKehadiran,
        },
      });

      return apiOk(res, omitLocationIfNotPrivileged(attendance, req.user!.role), 'Absen masuk berhasil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
