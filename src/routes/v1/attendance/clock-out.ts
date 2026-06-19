import { Request, Response } from 'express';
import { z } from 'zod';
import { StatusKehadiran } from '@prisma/client';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { startOfDay, getJamPulangReguler, omitLocationIfNotPrivileged } from '../../../services/attendanceService';

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

      // Cek status aktif & kontrak
      const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { statusAktif: true, statusKaryawan: true, tanggalAkhirKontrak: true, nominalUpahLembur: true, satuanUpah: true, nominalUpah: true } });
      if (employee && !employee.statusAktif) {
        return apiError(res, 'Akun karyawan sudah dinonaktifkan, silakan hubungi HRD', 403);
      }
      if (employee?.statusKaryawan === 'KONTRAK' && employee.tanggalAkhirKontrak) {
        const endDate = new Date(employee.tanggalAkhirKontrak);
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) {
          return apiError(res, 'Kontrak kerja sudah berakhir, silakan hubungi HRD untuk perpanjangan', 403);
        }
      }

      const jamDesimal = now.getHours() + now.getMinutes() / 60;
      const jamPulangReguler = await getJamPulangReguler();
      const pulangCepat = jamDesimal < jamPulangReguler;

      let statusKehadiran: StatusKehadiran;

      if (employee?.statusKaryawan === 'HARIAN') {
        // Karyawan harian: selalu TEPAT_WAKTU (tidak ada PULANG_CEPAT)
        statusKehadiran = 'TEPAT_WAKTU';
      } else {
        statusKehadiran = pulangCepat && existing.statusKehadiran === 'TEPAT_WAKTU' ? 'PULANG_CEPAT' : existing.statusKehadiran;
      }

      const attendance = await db.attendance.update({
        where: { employeeId_tanggal: { employeeId, tanggal } },
        data: {
          jamKeluar: now,
          statusKehadiran,
          latitude: input.latitude ?? existing.latitude,
          longitude: input.longitude ?? existing.longitude,
        },
      });

      // Hitung lembur otomatis untuk karyawan harian (> 8 jam kerja)
      if (employee?.statusKaryawan === 'HARIAN' && employee.satuanUpah === 'PER_JAM' && existing.jamMasuk) {
        const jamMasukDecimal = existing.jamMasuk.getHours() + existing.jamMasuk.getMinutes() / 60;
        const durasiKerja = jamDesimal - jamMasukDecimal;
        if (durasiKerja > 8) {
          const jamLembur = Math.ceil(durasiKerja - 8);
          await db.overtimeRequest.create({
            data: {
              employeeId,
              jenis: 'INDIVIDUAL',
              tanggal: startOfDay(now),
              deskripsiAlasan: `Lembur otomatis: ${jamLembur} jam (karyawan harian, durasi kerja ${durasiKerja.toFixed(1)} jam)`,
              status: 'DICATAT_OTOMATIS',
              inputByUserId: null,
            },
          });
        }
      }

      return apiOk(res, omitLocationIfNotPrivileged(attendance, req.user!.role), 'Absen pulang berhasil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
