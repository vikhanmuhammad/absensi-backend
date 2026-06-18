import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

const createSchema = z
  .object({
    projectId: z.string().min(1),
    divisiAsalId: z.string().min(1),
    mode: z.enum(['SPESIFIK', 'HEADCOUNT']),
    employeeId: z.string().optional(),
    jumlahDiminta: z.number().int().positive().optional(),
    kriteria: z.string().optional(),
    tanggalMulaiPenugasan: z.string().min(1),
    tanggalAkhirPenugasan: z.string().min(1),
  })
  .refine((data) => (data.mode === 'SPESIFIK' ? !!data.employeeId : !!data.jumlahDiminta), {
    message: 'employeeId wajib diisi untuk mode Spesifik, jumlahDiminta wajib diisi untuk mode Headcount',
  });

export const post = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const data = createSchema.parse(req.body);

      const project = await db.project.findUnique({ where: { id: data.projectId } });
      if (!project) return apiError(res, 'Projek tidak ditemukan', 404);

      // Hanya SPV Project yang ditunjuk untuk projek ini (atau HRD/Super Admin sebagai override) yang
      // boleh mengajukan request manpower (FR-PRJ-02).
      const isOwner = req.user!.employeeId === project.spvProjectEmployeeId;
      const isOverride = ['HRD', 'SUPER_ADMIN'].includes(req.user!.role);
      if (!isOwner && !isOverride) {
        return apiError(res, 'Hanya SPV Project yang ditunjuk untuk projek ini yang dapat mengajukan request manpower', 403);
      }

      const akhirPenugasan = new Date(data.tanggalAkhirPenugasan);
      if (akhirPenugasan > project.tanggalBerakhir) {
        return apiError(res, 'Tanggal akhir penugasan tidak boleh melampaui Due Date projek', 400);
      }

      const manpowerRequest = await db.manpowerRequest.create({
        data: {
          projectId: data.projectId,
          divisiAsalId: data.divisiAsalId,
          mode: data.mode,
          employeeId: data.mode === 'SPESIFIK' ? data.employeeId : undefined,
          jumlahDiminta: data.mode === 'HEADCOUNT' ? data.jumlahDiminta : undefined,
          kriteria: data.kriteria,
          tanggalMulaiPenugasan: new Date(data.tanggalMulaiPenugasan),
          tanggalAkhirPenugasan: akhirPenugasan,
        },
      });

      return apiOk(res, manpowerRequest, 'Request manpower berhasil diajukan', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
