import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const bulkSchema = z.object({
  employeeIds: z.array(z.coerce.number()).min(1, 'Pilih minimal 1 karyawan'),
  tanggal: z.string().min(1),
  deskripsiAlasan: z.string().min(1, 'Deskripsi/alasan lembur massal wajib diisi'),
});

// Lembur massal diinput oleh Supervisor/SPV Project yang sudah berwenang atas karyawan terkait,
// sehingga langsung tercatat DICATAT_OTOMATIS (FR-REQ-04) — tetap bisa ditinjau/dibatalkan HRD.
export const post = [
  requireAuth,
  requireRole(['SUPERVISOR', 'SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const data = bulkSchema.parse(req.body);

      const overtimeRequest = await db.overtimeRequest.create({
        data: {
          jenis: 'MASSAL',
          tanggal: new Date(data.tanggal),
          deskripsiAlasan: data.deskripsiAlasan,
          status: 'DICATAT_OTOMATIS',
          inputByUserId: req.user!.userId,
          members: { create: data.employeeIds.map((employeeId) => ({ employeeId })) },
        },
        include: { members: true },
      });

      return apiOk(res, overtimeRequest, 'Lembur massal berhasil dicatat', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
