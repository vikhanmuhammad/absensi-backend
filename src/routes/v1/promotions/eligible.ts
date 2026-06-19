import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { originStatusFor } from '../../../services/promotionService';

const querySchema = z.object({
  jenis: z.enum(['HARIAN_KE_KONTRAK', 'KONTRAK_KE_TETAP', 'PERPANJANGAN_KONTRAK', 'PERUBAHAN_GAJI']),
});

// Daftar karyawan yang memenuhi status asal utk jenis promosi tertentu — dipakai utk
// pemilihan karyawan (perorangan/massal) di halaman Promosi. PERUBAHAN_GAJI -> semua karyawan aktif.
// PERPANJANGAN_KONTRAK sengaja TIDAK dibatasi statusAktif, supaya karyawan kontrak yang sudah
// dinonaktifkan otomatis karena kontrak lamanya berakhir tetap bisa dimunculkan utk diperpanjang.
export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const { jenis } = querySchema.parse(req.query);
      const requiredStatus = originStatusFor(jenis);

      const employees = await db.employee.findMany({
        where: {
          ...(jenis === 'PERPANJANGAN_KONTRAK' ? {} : { statusAktif: true }),
          ...(requiredStatus ? { statusKaryawan: requiredStatus } : {}),
        },
        include: { divisi: true },
        orderBy: { namaLengkap: 'asc' },
      });

      return apiOk(res, employees, 'Daftar karyawan eligible berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
