import { Request, Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { getAttendanceReportRows, resolveSupervisorDivisiScope } from '../../../../services/reportService';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisiId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
});

const COLS = { divisi: 50, hadir: 280, terlambat: 360, alfa: 460 };

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = querySchema.parse(req.query);
      const divisiId = await resolveSupervisorDivisiScope(req, filter.divisiId);
      const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
      const endDate = filter.endDate ? new Date(filter.endDate) : undefined;
      const { totalRecords, perDivisi } = await getAttendanceReportRows({ startDate, endDate, divisiId, projectId: filter.projectId });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="laporan-absensi.pdf"');

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      doc.fontSize(18).font('Helvetica-Bold').text('Laporan Absensi', { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555')
        .text(
          `Periode: ${startDate ? startDate.toLocaleDateString('id-ID') : 'Semua'} – ${endDate ? endDate.toLocaleDateString('id-ID') : 'Semua'}`,
          { align: 'center' },
        )
        .text(`Total Kehadiran Tercatat: ${totalRecords}`, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(1.5);

      let y = doc.y;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Divisi', COLS.divisi, y);
      doc.text('Hadir', COLS.hadir, y);
      doc.text('Terlambat', COLS.terlambat, y);
      doc.text('Alfa', COLS.alfa, y);
      y += 20;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
      y += 10;

      doc.font('Helvetica').fontSize(10);
      if (perDivisi.length === 0) {
        doc.text('Tidak ada data pada periode ini.', COLS.divisi, y);
      } else {
        for (const row of perDivisi) {
          doc.text(row.namaDivisi, COLS.divisi, y, { width: 220 });
          doc.text(String(row.hadir), COLS.hadir, y);
          doc.text(String(row.terlambat), COLS.terlambat, y);
          doc.text(String(row.alfa), COLS.alfa, y);
          y += 22;
        }
      }

      doc.end();
    } catch (error) {
      return handleError(res, error);
    }
  },
];
