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

      const leaveRequest = await db.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
      if (!leaveRequest) return apiError(res, 'Pengajuan cuti tidak ditemukan', 404);
      if (leaveRequest.status !== 'MENUNGGU') return apiError(res, 'Pengajuan ini sudah diproses sebelumnya', 400);

      const authorized = await isAuthorizedForDivision(req.user!.role, req.user!.employeeId, leaveRequest.employee.divisiId);
      if (!authorized) {
        return apiError(res, 'Anda hanya dapat memproses pengajuan dari divisi Anda sendiri', 403);
      }

      const updated = await db.$transaction(async (tx) => {
        const result = await tx.leaveRequest.update({
          where: { id },
          data: { status: 'DISETUJUI', approvedByUserId: req.user!.userId, approvedAt: new Date() },
        });

        await logApproval(tx, {
          jenisPengajuan: 'LEAVE_REQUEST',
          referensiId: id,
          aktorUserId: req.user!.userId,
          hasil: 'DISETUJUI',
          catatan,
        });

        await notifyUser(tx, {
          userId: leaveRequest.employee.userId,
          judul: 'Pengajuan Cuti Disetujui',
          pesan: `Pengajuan ${leaveRequest.jenisCuti} Anda telah disetujui.`,
          jenis: 'STATUS_APPROVAL',
          referensiId: id,
        });

        return result;
      });

      return apiOk(res, updated, 'Pengajuan cuti disetujui');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
