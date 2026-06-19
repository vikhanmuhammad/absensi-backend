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
  spvProjectEmployeeId: z.coerce.number(),
});

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Jika aktor sedang menjadi SPV Project untuk projek manapun, dia hanya melihat projek yang
      // dia pimpin saja — kecuali HRD/Super Admin yang tetap punya visibilitas penuh atas semua projek.
      const isPrivileged = ['SUPER_ADMIN', 'HRD'].includes(req.user!.role);
      let where = {};
      if (!isPrivileged && req.user!.employeeId) {
        const spvProjectCount = await db.project.count({ where: { spvProjectEmployeeId: req.user!.employeeId } });
        if (spvProjectCount > 0) {
          where = { spvProjectEmployeeId: req.user!.employeeId };
        }
      }

      const projects = await db.project.findMany({
        where,
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
