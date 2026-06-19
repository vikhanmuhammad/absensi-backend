import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../../utils/db';
import { apiOk, apiError, handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole, blockItMaintenanceApproval } from '../../../../middlewares/role.middleware';
import { logApproval, isAuthorizedForDivision } from '../../../../services/approvalService';

const bodySchema = z.object({
  // Wajib diisi untuk mode HEADCOUNT (memilih siapa yang ditugaskan); diabaikan untuk mode SPESIFIK.
  employeeId: z.coerce.number().optional(),
});

export const patch = [
  requireAuth,
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = bodySchema.parse(req.body);
      const id = Number(req.params.id);

      const manpowerRequest = await db.manpowerRequest.findUnique({ where: { id } });
      if (!manpowerRequest) return apiError(res, 'Request manpower tidak ditemukan', 404);
      if (manpowerRequest.status !== 'MENUNGGU') return apiError(res, 'Request ini sudah diproses sebelumnya', 400);

      const authorized = await isAuthorizedForDivision(req.user!.role, req.user!.employeeId, manpowerRequest.divisiAsalId);
      if (!authorized) {
        return apiError(res, 'Anda hanya dapat memproses request manpower dari divisi Anda sendiri', 403);
      }

      if (manpowerRequest.mode === 'HEADCOUNT' && !employeeId) {
        return apiError(res, 'Pilih karyawan yang akan ditugaskan untuk request mode Headcount', 400);
      }
      const finalEmployeeId = manpowerRequest.mode === 'SPESIFIK' ? manpowerRequest.employeeId! : employeeId!;

      // Cegah penugasan ganda: karyawan tidak boleh punya ProjectAssignment aktif lain yang overlap (FR-PRJ-04).
      const overlap = await db.projectAssignment.findFirst({
        where: {
          employeeId: finalEmployeeId,
          status: 'AKTIF',
          tanggalMulai: { lte: manpowerRequest.tanggalAkhirPenugasan },
          tanggalBerakhir: { gte: manpowerRequest.tanggalMulaiPenugasan },
        },
      });
      if (overlap) {
        return apiError(res, 'Karyawan ini sudah memiliki penugasan projek aktif yang periodenya tumpang tindih (overlap)', 409);
      }

      const updated = await db.$transaction(async (tx) => {
        const result = await tx.manpowerRequest.update({
          where: { id },
          data: {
            status: 'DISETUJUI',
            approvedByUserId: req.user!.userId,
            approvedAt: new Date(),
            employeeId: finalEmployeeId,
          },
        });

        await tx.projectAssignment.create({
          data: {
            employeeId: finalEmployeeId,
            projectId: manpowerRequest.projectId,
            manpowerRequestId: id,
            tanggalMulai: manpowerRequest.tanggalMulaiPenugasan,
            tanggalBerakhir: manpowerRequest.tanggalAkhirPenugasan,
            status: 'AKTIF',
          },
        });

        await logApproval(tx, {
          jenisPengajuan: 'MANPOWER_REQUEST',
          referensiId: id,
          aktorUserId: req.user!.userId,
          hasil: 'DISETUJUI',
        });

        return result;
      });

      return apiOk(res, updated, 'Request manpower disetujui');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
