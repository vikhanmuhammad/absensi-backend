import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const createSchema = z.object({
  namaProjek: z.string().min(1, 'Nama projek wajib diisi'),
  tanggalMulai: z.string().min(1),
  tanggalBerakhir: z.string().min(1),
  deskripsi: z.string().optional(),
  spvProjectEmployeeId: z.string().min(1, 'SPV Project wajib ditentukan'),
});

export const get = [
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const projects = await db.project.findMany({
        include: { spvProject: true, _count: { select: { assignments: true } } },
        orderBy: { tanggalMulai: 'desc' },
      });
      return apiOk(res, projects, 'Daftar projek berhasil diambil');
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
      const project = await db.project.create({
        data: {
          namaProjek: data.namaProjek,
          tanggalMulai: new Date(data.tanggalMulai),
          tanggalBerakhir: new Date(data.tanggalBerakhir),
          deskripsi: data.deskripsi,
          spvProjectEmployeeId: data.spvProjectEmployeeId,
          createdByUserId: req.user!.userId,
        },
      });
      return apiOk(res, project, 'Projek berhasil dibuat', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
