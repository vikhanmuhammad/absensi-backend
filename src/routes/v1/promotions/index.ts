import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { createPromotion } from '../../../services/promotionService';

const createSchema = z
  .object({
    employeeIds: z.array(z.coerce.number()).min(1, 'Pilih minimal 1 karyawan'),
    jenisPromosi: z.enum(['HARIAN_KE_KONTRAK', 'KONTRAK_KE_TETAP', 'PERPANJANGAN_KONTRAK', 'PERUBAHAN_GAJI']),
    nominalUpahBaru: z.coerce.number().min(0),
    satuanUpahBaru: z.enum(['PER_BULAN', 'PER_JAM']),
    nominalUpahLemburBaru: z.coerce.number().min(0),
    pengaliLemburBaru: z.coerce.number().optional().nullable(),
    tanggalMulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
    tanggalSelesai: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      (data.jenisPromosi !== 'HARIAN_KE_KONTRAK' && data.jenisPromosi !== 'PERPANJANGAN_KONTRAK') ||
      !!data.tanggalSelesai,
    {
      message: 'Tanggal selesai kontrak wajib diisi untuk promosi Harian ke Kontrak atau Perpanjangan Kontrak',
      path: ['tanggalSelesai'],
    },
  );

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const promotions = await db.employeePromotion.findMany({
        where: { employeeId },
        include: {
          employee: { include: { divisi: true } },
          diprosesOleh: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return apiOk(res, promotions, 'Riwayat promosi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

export const post = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const data = createSchema.parse(req.body);

      const tanggalMulai = new Date(data.tanggalMulai);
      const tanggalSelesai = data.tanggalSelesai ? new Date(data.tanggalSelesai) : null;

      const results = [];
      for (const employeeId of data.employeeIds) {
        const result = await createPromotion(
          {
            employeeId,
            jenisPromosi: data.jenisPromosi,
            nominalUpahBaru: data.nominalUpahBaru,
            satuanUpahBaru: data.satuanUpahBaru,
            nominalUpahLemburBaru: data.nominalUpahLemburBaru,
            pengaliLemburBaru: data.pengaliLemburBaru,
            tanggalMulai,
            tanggalSelesai,
          },
          req.user!.userId,
        );
        results.push(result);
      }

      const berhasil = results.filter((r) => r.ok).length;
      const dilewati = results.filter((r) => !r.ok);

      if (berhasil === 0) {
        return apiError(res, 'Tidak ada karyawan yang berhasil diproses — periksa status karyawan yang dipilih', 400);
      }

      return apiOk(
        res,
        { results, berhasil, dilewati: dilewati.length },
        dilewati.length > 0
          ? `${berhasil} karyawan berhasil diproses, ${dilewati.length} dilewati karena status tidak sesuai`
          : `${berhasil} karyawan berhasil diproses`,
        201,
      );
    } catch (error) {
      return handleError(res, error);
    }
  },
];
