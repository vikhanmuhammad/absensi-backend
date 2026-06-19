import { Request } from 'express';
import { db } from '../utils/db';

interface AttendanceReportFilter {
  startDate?: Date;
  endDate?: Date;
  divisiId?: number;
}

export interface AttendanceReportRow {
  divisiId: number;
  namaDivisi: string;
  hadir: number;
  terlambat: number;
  alfa: number;
}

// Agregasi sederhana per divisi. TODO: tambahkan filter projectId (join lewat ProjectAssignment)
// dan pindahkan ke query SQL agregat langsung jika volume data sudah besar.
export async function getAttendanceReportRows(filter: AttendanceReportFilter) {
  const attendances = await db.attendance.findMany({
    where: {
      tanggal: { gte: filter.startDate, lte: filter.endDate },
      employee: filter.divisiId ? { divisiId: filter.divisiId } : undefined,
    },
    include: { employee: { include: { divisi: true } } },
  });

  const perDivisi = new Map<number, AttendanceReportRow>();
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

/** Supervisor selalu dibatasi ke divisinya sendiri (mengabaikan filter divisiId dari query). */
export async function resolveSupervisorDivisiScope(req: Request, queryDivisiId?: number): Promise<number | undefined> {
  if (req.user!.role === 'SUPERVISOR') {
    const supervisor = req.user!.employeeId
      ? await db.employee.findUnique({ where: { id: req.user!.employeeId }, select: { divisiId: true } })
      : null;
    return supervisor?.divisiId;
  }
  return queryDivisiId;
}
