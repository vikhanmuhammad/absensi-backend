import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../../utils/db';
import { apiOk, apiError, handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole, blockItMaintenanceApproval } from '../../../../middlewares/role.middleware';
import { logApproval, notifyUser, isAuthorizedForDivision } from '../../../../services/approvalService';

const bodySchema = z.object({ catatan: z.string().optional() });

export const patch = [
  requireAuth,
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  async (req: Request, res: Response) => {
    try {
      const { catatan } = bodySchema.parse(req.body);
      const id = Number(req.params.id);

      const overtimeRequest = await db.overtimeRequest.findUnique({ where: { id }, include: { employee: true } });
      if (!overtimeRequest || !overtimeRequest.employee) return apiError(res, 'Pengajuan lembur tidak ditemukan', 404);
      if (overtimeRequest.jenis !== 'INDIVIDUAL') {
        return apiError(res, 'Hanya pengajuan lembur individual yang dapat diproses lewat endpoint ini', 400);
      }
      if (overtimeRequest.status !== 'DIAJUKAN') return apiError(res, 'Pengajuan ini sudah diproses sebelumnya', 400);

      const authorized = await isAuthorizedForDivision(req.user!.role, req.user!.employeeId, overtimeRequest.employee.divisiId);
      if (!authorized) {
        return apiError(res, 'Anda hanya dapat memproses pengajuan dari divisi Anda sendiri', 403);
      }

      const updated = await db.$transaction(async (tx) => {
        const result = await tx.overtimeRequest.update({ where: { id }, data: { status: 'DISETUJUI' } });

        await logApproval(tx, {
          jenisPengajuan: 'OVERTIME_REQUEST',
          referensiId: id,
          aktorUserId: req.user!.userId,
          hasil: 'DISETUJUI',
          catatan,
        });

        await notifyUser(tx, {
          userId: overtimeRequest.employee!.userId,
          judul: 'Pengajuan Lembur Disetujui',
          pesan: 'Pengajuan lembur individual Anda telah disetujui.',
          jenis: 'STATUS_APPROVAL',
          referensiId: id,
        });

        return result;
      });

      return apiOk(res, updated, 'Pengajuan lembur disetujui');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
