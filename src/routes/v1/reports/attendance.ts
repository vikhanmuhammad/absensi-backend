import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisiId: z.string().optional(),
  projectId: z.string().optional(),
});

// Agregasi sederhana per divisi. TODO: tambahkan filter projectId (join lewat ProjectAssignment)
// dan pindahkan ke query SQL agregat langsung jika volume data sudah besar.
export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = querySchema.parse(req.query);

      const attendances = await db.attendance.findMany({
        where: {
          tanggal: {
            gte: filter.startDate ? new Date(filter.startDate) : undefined,
            lte: filter.endDate ? new Date(filter.endDate) : undefined,
          },
          employee: filter.divisiId ? { divisiId: filter.divisiId } : undefined,
        },
        include: { employee: { include: { divisi: true } } },
      });

      const perDivisi = new Map<
        string,
        { divisiId: string; namaDivisi: string; hadir: number; terlambat: number; alfa: number }
      >();

      for (const a of attendances) {
        const key = a.employee.divisiId;
        const entry =
          perDivisi.get(key) ?? { divisiId: key, namaDivisi: a.employee.divisi.namaDivisi, hadir: 0, terlambat: 0, alfa: 0 };
        if (a.jamMasuk) entry.hadir += 1;
        if (a.statusKehadiran === 'TERLAMBAT') entry.terlambat += 1;
        if (a.statusKehadiran === 'ALFA') entry.alfa += 1;
        perDivisi.set(key, entry);
      }

      return apiOk(
        res,
        { totalRecords: attendances.length, perDivisi: Array.from(perDivisi.values()) },
        'Laporan absensi berhasil diambil',
      );
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: implement export PDF/XLSX (FR-RPT-03) — gunakan library seperti pdfkit/exceljs,
// scope data otomatis menyesuaikan role aktor (Karyawan diri sendiri, Supervisor divisinya, dst).
