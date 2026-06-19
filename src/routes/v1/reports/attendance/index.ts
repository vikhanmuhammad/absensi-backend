import { Request, Response } from 'express';
import { z } from 'zod';
import { apiOk, handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { getAttendanceReportRows, resolveSupervisorDivisiScope } from '../../../../services/reportService';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisiId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = querySchema.parse(req.query);
      const divisiId = await resolveSupervisorDivisiScope(req, filter.divisiId);

      const report = await getAttendanceReportRows({
        startDate: filter.startDate ? new Date(filter.startDate) : undefined,
        endDate: filter.endDate ? new Date(filter.endDate) : undefined,
        divisiId,
      });

      return apiOk(res, report, 'Laporan absensi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
