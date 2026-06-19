import { Request, Response } from 'express';
import { z } from 'zod';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { getSystemSettings, updateSystemSettings } from '../../../services/settingsService';

const updateSchema = z.object({
  jamMasukStandar: z.string().optional(),
  jamPulangStandar: z.string().optional(),
  batasTerlambat: z.string().optional(),
  batasAlfa: z.string().optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const settings = await getSystemSettings();
      return apiOk(res, settings, 'Pengaturan sistem berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

export const patch = [
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const data = updateSchema.parse(req.body);
      const updated = await updateSystemSettings(data);
      return apiOk(res, updated, 'Pengaturan jam kerja berhasil disimpan');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
