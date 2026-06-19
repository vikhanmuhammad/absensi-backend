import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../../utils/db';
import { apiOk, apiError, handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole, blockItMaintenanceApproval } from '../../../../middlewares/role.middleware';
import { logApproval, isAuthorizedForDivision } from '../../../../services/approvalService';

const bodySchema = z.object({ catatan: z.string().optional() });

export const patch = [
  requireAuth,
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  async (req: Request, res: Response) => {
    try {
      const { catatan } = bodySchema.parse(req.body);
      const id = Number(req.params.id);

      const manpowerRequest = await db.manpowerRequest.findUnique({ where: { id } });
      if (!manpowerRequest) return apiError(res, 'Request manpower tidak ditemukan', 404);
      if (manpowerRequest.status !== 'MENUNGGU') return apiError(res, 'Request ini sudah diproses sebelumnya', 400);

      const authorized = await isAuthorizedForDivision(req.user!.role, req.user!.employeeId, manpowerRequest.divisiAsalId);
      if (!authorized) {
        return apiError(res, 'Anda hanya dapat memproses request manpower dari divisi Anda sendiri', 403);
      }

      const updated = await db.$transaction(async (tx) => {
        const result = await tx.manpowerRequest.update({ where: { id }, data: { status: 'DITOLAK' } });

        await logApproval(tx, {
          jenisPengajuan: 'MANPOWER_REQUEST',
          referensiId: id,
          aktorUserId: req.user!.userId,
          hasil: 'DITOLAK',
          catatan,
        });

        return result;
      });

      return apiOk(res, updated, 'Request manpower ditolak');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: scheduler harian untuk auto-set ProjectAssignment.status = SELESAI saat tanggalBerakhir
// terlampaui (lihat docs/flow.md "Auto-Reactivation Saat Penugasan/Projek Berakhir").
