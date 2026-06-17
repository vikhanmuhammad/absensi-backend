import { prisma } from '../../lib/prisma';
import { AttendanceReportQuery } from './reports.schema';

export async function getDashboardSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalKaryawanAktif, hadirHariIni, terlambatHariIni, alfaHariIni, cutiAktif] = await Promise.all([
    prisma.employee.count({ where: { statusAktif: true } }),
    prisma.attendance.count({ where: { tanggal: today, jamMasuk: { not: null } } }),
    prisma.attendance.count({ where: { tanggal: today, statusKehadiran: 'TERLAMBAT' } }),
    prisma.attendance.count({ where: { tanggal: today, statusKehadiran: 'ALFA' } }),
    prisma.leaveRequest.count({
      where: { status: 'DISETUJUI', tanggalMulai: { lte: today }, tanggalSelesai: { gte: today } },
    }),
  ]);

  return { totalKaryawanAktif, hadirHariIni, terlambatHariIni, alfaHariIni, cutiAktif };
}

// Agregasi sederhana per divisi. TODO: tambahkan filter projectId (join lewat ProjectAssignment)
// dan pindahkan ke query SQL agregat langsung jika volume data sudah besar.
export async function getAttendanceReport(filter: AttendanceReportQuery) {
  const attendances = await prisma.attendance.findMany({
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

  return { totalRecords: attendances.length, perDivisi: Array.from(perDivisi.values()) };
}

// TODO: implement export PDF/XLSX (FR-RPT-03) — gunakan library seperti pdfkit/exceljs,
// scope data otomatis menyesuaikan role aktor (Karyawan diri sendiri, Supervisor divisinya, dst).
