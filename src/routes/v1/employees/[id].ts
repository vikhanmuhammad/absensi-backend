import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const updateSchema = z.object({
  namaLengkap: z.string().optional(),
  email: z.string().email().optional(),
  noHp: z.string().optional(),
  alamat: z.string().optional(),
  jabatan: z.string().optional(),
  statusAktif: z.boolean().optional(),
});

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const employee = await db.employee.findUnique({
        where: { id },
        include: { divisi: true, user: { select: { username: true, role: true, statusAktif: true } } },
      });
      if (!employee) return apiError(res, 'Karyawan tidak ditemukan', 404);
      return apiOk(res, employee, 'Detail karyawan berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

export const patch = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const data = updateSchema.parse(req.body);

      const existing = await db.employee.findUnique({ where: { id } });
      if (!existing) return apiError(res, 'Karyawan tidak ditemukan', 404);

      const updated = await db.employee.update({ where: { id }, data });
      return apiOk(res, updated, 'Data karyawan berhasil diperbarui');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
