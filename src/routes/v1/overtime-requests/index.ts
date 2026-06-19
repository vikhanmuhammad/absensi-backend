import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

const createSchema = z.object({
  tanggal: z.string().min(1),
  deskripsiAlasan: z.string().min(1, 'Deskripsi/alasan lembur wajib diisi'),
});

export const post = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const data = createSchema.parse(req.body);
      const overtimeRequest = await db.overtimeRequest.create({
        data: {
          employeeId,
          jenis: 'INDIVIDUAL',
          tanggal: new Date(data.tanggal),
          deskripsiAlasan: data.deskripsiAlasan,
          status: 'DIAJUKAN',
        },
      });

      return apiOk(res, overtimeRequest, 'Pengajuan lembur berhasil dikirim', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
