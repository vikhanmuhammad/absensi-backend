import { Request } from 'express';
import { db } from '../utils/db';

interface AttendanceReportFilter {
  startDate?: Date;
  endDate?: Date;
  divisiId?: number;
  projectId?: number;
}

export interface AttendanceReportRow {
  divisiId: number;
  namaDivisi: string;
  hadir: number;
  terlambat: number;
  alfa: number;
  pulangCepat: number;
}

export interface EmployeeAttendanceRow {
  employeeId: number;
  divisiId: number;
  nik: string;
  namaLengkap: string;
  namaDivisi: string;
  jabatan: string;
  statusKaryawan: string;
  hadir: number;
  terlambat: number;
  alfa: number;
  pulangCepat: number;
  totalLembur: number;
  nominalUpah: number;
  satuanUpah: string;
  nominalUpahLembur: number;
  estimatedSalary: number;
}

export async function getAttendanceReportRows(filter: AttendanceReportFilter) {
  const whereClause: Record<string, unknown> = {
    tanggal: { gte: filter.startDate, lte: filter.endDate },
  };

  if (filter.divisiId) {
    whereClause.employee = { divisiId: filter.divisiId };
  }

  // Jika filter projectId, ambil employeeId dari ProjectAssignment
  let projectEmployeeIds: number[] | undefined;
  if (filter.projectId) {
    const assignments = await db.projectAssignment.findMany({
      where: { projectId: filter.projectId, status: 'AKTIF' },
      select: { employeeId: true },
    });
    projectEmployeeIds = assignments.map((a) => a.employeeId);
    if (projectEmployeeIds.length === 0) {
      return { totalRecords: 0, perDivisi: [], perEmployee: [], summary: { totalHadir: 0, totalTerlambat: 0, totalAlfa: 0, totalPulangCepat: 0, totalLembur: 0, totalEstimatedSalary: 0 } };
    }
    whereClause.employeeId = { in: projectEmployeeIds };
  }

  const attendances = await db.attendance.findMany({
    where: whereClause,
    include: { employee: { include: { divisi: true } } },
  });

  // Agregasi per divisi
  const perDivisi = new Map<number, AttendanceReportRow>();
  for (const a of attendances) {
    const key = a.employee.divisiId;
    const entry =
      perDivisi.get(key) ?? { divisiId: key, namaDivisi: a.employee.divisi.namaDivisi, hadir: 0, terlambat: 0, alfa: 0, pulangCepat: 0 };
    if (a.jamMasuk) entry.hadir += 1;
    if (a.statusKehadiran === 'TERLAMBAT') entry.terlambat += 1;
    if (a.statusKehadiran === 'ALFA') entry.alfa += 1;
    if (a.statusKehadiran === 'PULANG_CEPAT') entry.pulangCepat += 1;
    perDivisi.set(key, entry);
  }

  // Agregasi per karyawan
  const perEmployee = new Map<number, EmployeeAttendanceRow>();
  for (const a of attendances) {
    const key = a.employeeId;
    const emp = a.employee;
    const entry = perEmployee.get(key) ?? {
      employeeId: key,
      divisiId: emp.divisiId,
      nik: emp.nik,
      namaLengkap: emp.namaLengkap,
      namaDivisi: emp.divisi.namaDivisi,
      jabatan: emp.jabatan,
      statusKaryawan: emp.statusKaryawan,
      hadir: 0,
      terlambat: 0,
      alfa: 0,
      pulangCepat: 0,
      totalLembur: 0,
      nominalUpah: Number(emp.nominalUpah),
      satuanUpah: emp.satuanUpah,
      nominalUpahLembur: Number(emp.nominalUpahLembur),
      estimatedSalary: 0,
    };
    if (a.jamMasuk) entry.hadir += 1;
    if (a.statusKehadiran === 'TERLAMBAT') entry.terlambat += 1;
    if (a.statusKehadiran === 'ALFA') entry.alfa += 1;
    if (a.statusKehadiran === 'PULANG_CEPAT') entry.pulangCepat += 1;
    perEmployee.set(key, entry);
  }

  // Hitung lembur per karyawan dalam periode
  const overtimeWhere: Record<string, unknown> = {
    status: { in: ['DISETUJUI', 'DICATAT_OTOMATIS'] },
    tanggal: { gte: filter.startDate, lte: filter.endDate },
  };
  if (projectEmployeeIds) {
    overtimeWhere.employeeId = { in: projectEmployeeIds };
  }
  const overtimes = await db.overtimeRequest.findMany({ where: overtimeWhere });
  for (const ot of overtimes) {
    if (ot.employeeId && perEmployee.has(ot.employeeId)) {
      perEmployee.get(ot.employeeId)!.totalLembur += 1;
    }
  }

  // Hitung estimasi gaji per karyawan
  for (const entry of perEmployee.values()) {
    if (entry.satuanUpah === 'PER_BULAN') {
      entry.estimatedSalary = entry.nominalUpah + entry.totalLembur * entry.nominalUpahLembur;
    } else {
      // PER_JAM: hadir * 8 * upah per jam + lembur * upah lembur
      entry.estimatedSalary = entry.hadir * 8 * entry.nominalUpah + entry.totalLembur * entry.nominalUpahLembur;
    }
  }

  const employeeList = Array.from(perEmployee.values());
  const summary = {
    totalHadir: attendances.filter((a) => a.jamMasuk).length,
    totalTerlambat: attendances.filter((a) => a.statusKehadiran === 'TERLAMBAT').length,
    totalAlfa: attendances.filter((a) => a.statusKehadiran === 'ALFA').length,
    totalPulangCepat: attendances.filter((a) => a.statusKehadiran === 'PULANG_CEPAT').length,
    totalLembur: overtimes.length,
    totalEstimatedSalary: employeeList.reduce((s, e) => s + e.estimatedSalary, 0),
  };

  return { totalRecords: attendances.length, perDivisi: Array.from(perDivisi.values()), perEmployee: employeeList, summary };
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
