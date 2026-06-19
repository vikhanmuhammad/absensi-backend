import { Request, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { getAttendanceReportRows, resolveSupervisorDivisiScope } from '../../../../services/reportService';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisiId: z.coerce.number().optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = querySchema.parse(req.query);
      const divisiId = await resolveSupervisorDivisiScope(req, filter.divisiId);
      const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
      const endDate = filter.endDate ? new Date(filter.endDate) : undefined;
      const { totalRecords, perDivisi } = await getAttendanceReportRows({ startDate, endDate, divisiId });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistem Absensi & Manajemen Data Karyawan';
      const sheet = workbook.addWorksheet('Laporan Absensi');
      sheet.getColumn(1).width = 28;
      sheet.getColumn(2).width = 14;
      sheet.getColumn(3).width = 14;
      sheet.getColumn(4).width = 12;

      sheet.addRow([
        'Periode',
        `${startDate ? startDate.toLocaleDateString('id-ID') : 'Semua'} – ${endDate ? endDate.toLocaleDateString('id-ID') : 'Semua'}`,
      ]);
      sheet.addRow(['Total Kehadiran Tercatat', totalRecords]);
      sheet.addRow([]);

      const headerRow = sheet.addRow(['Divisi', 'Hadir', 'Terlambat', 'Alfa']);
      headerRow.font = { bold: true };

      perDivisi.forEach((row) => {
        sheet.addRow([row.namaDivisi, row.hadir, row.terlambat, row.alfa]);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="laporan-absensi.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return handleError(res, error);
    }
  },
];
