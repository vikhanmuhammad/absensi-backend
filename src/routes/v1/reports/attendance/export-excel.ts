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
  projectId: z.coerce.number().optional(),
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
      const { totalRecords, perDivisi, perEmployee, summary } = await getAttendanceReportRows({
        startDate,
        endDate,
        divisiId,
        projectId: filter.projectId,
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistem Absensi & Manajemen Data Karyawan';

      const periodeText = `${startDate ? startDate.toLocaleDateString('id-ID') : 'Semua'} – ${endDate ? endDate.toLocaleDateString('id-ID') : 'Semua'}`;

      // ── Sheet 1: Rekap per Divisi ──
      const sheetDivisi = workbook.addWorksheet('Rekap per Divisi');
      sheetDivisi.getColumn(1).width = 28;
      sheetDivisi.getColumn(2).width = 14;
      sheetDivisi.getColumn(3).width = 14;
      sheetDivisi.getColumn(4).width = 12;
      sheetDivisi.getColumn(5).width = 16;

      sheetDivisi.addRow(['Periode', periodeText]);
      sheetDivisi.addRow(['Total Kehadiran Tercatat', totalRecords]);
      sheetDivisi.addRow(['Total Hadir', summary.totalHadir]);
      sheetDivisi.addRow(['Total Terlambat', summary.totalTerlambat]);
      sheetDivisi.addRow(['Total Alfa', summary.totalAlfa]);
      sheetDivisi.addRow(['Total Pulang Cepat', summary.totalPulangCepat]);
      sheetDivisi.addRow([]);

      const divHeader = sheetDivisi.addRow(['Divisi', 'Hadir', 'Terlambat', 'Alfa', 'Pulang Cepat']);
      divHeader.font = { bold: true };
      divHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
      });

      perDivisi.forEach((row) => {
        sheetDivisi.addRow([row.namaDivisi, row.hadir, row.terlambat, row.alfa, row.pulangCepat]);
      });

      // ── Sheet 2: Rekap per Karyawan ──
      const sheetEmp = workbook.addWorksheet('Rekap per Karyawan');
      sheetEmp.getColumn(1).width = 14;  // NIK
      sheetEmp.getColumn(2).width = 26;  // Nama
      sheetEmp.getColumn(3).width = 20;  // Divisi
      sheetEmp.getColumn(4).width = 16;  // Jabatan
      sheetEmp.getColumn(5).width = 14;  // Status
      sheetEmp.getColumn(6).width = 10;  // Hadir
      sheetEmp.getColumn(7).width = 12;  // Terlambat
      sheetEmp.getColumn(8).width = 10;  // Alfa
      sheetEmp.getColumn(9).width = 12;  // Lembur
      sheetEmp.getColumn(10).width = 12; // Pulang Cepat
      sheetEmp.getColumn(11).width = 18; // Upah
      sheetEmp.getColumn(12).width = 20; // Est. Gaji

      sheetEmp.addRow(['Periode', periodeText]);
      sheetEmp.addRow([]);

      const empHeader = sheetEmp.addRow([
        'NIK', 'Nama', 'Divisi', 'Jabatan', 'Status',
        'Hadir', 'Terlambat', 'Alfa', 'Lembur', 'Pulang Cepat',
        'Upah', 'Estimasi Gaji',
      ]);
      empHeader.font = { bold: true };
      empHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
      });

      const fmtCurrency = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

      perEmployee
        .sort((a, b) => a.namaDivisi.localeCompare(b.namaDivisi) || a.namaLengkap.localeCompare(b.namaLengkap))
        .forEach((emp) => {
          const row = sheetEmp.addRow([
            emp.nik,
            emp.namaLengkap,
            emp.namaDivisi,
            emp.jabatan,
            emp.statusKaryawan,
            emp.hadir,
            emp.terlambat,
            emp.alfa,
            emp.totalLembur,
            emp.pulangCepat,
            `${fmtCurrency(emp.nominalUpah)}/${emp.satuanUpah === 'PER_BULAN' ? 'bln' : 'jam'}`,
            emp.estimatedSalary,
          ]);
          // Format currency column
          row.getCell(12).numFmt = '#,##0';
        });

      // ── Totals row ──
      const totalRow = sheetEmp.addRow([
        '', 'TOTAL', '', '', '',
        perEmployee.reduce((s, e) => s + e.hadir, 0),
        perEmployee.reduce((s, e) => s + e.terlambat, 0),
        perEmployee.reduce((s, e) => s + e.alfa, 0),
        perEmployee.reduce((s, e) => s + e.totalLembur, 0),
        perEmployee.reduce((s, e) => s + e.pulangCepat, 0),
        '',
        summary.totalEstimatedSalary,
      ]);
      totalRow.font = { bold: true };
      totalRow.getCell(12).numFmt = '#,##0';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="laporan-absensi.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return handleError(res, error);
    }
  },
];
