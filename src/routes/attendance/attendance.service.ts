import { StatusKehadiran, StatusKaryawan } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { ClockInInput, ClockOutInput, BulkAttendanceInput } from './attendance.schema';

// TODO: pindahkan ke tabel Settings yang bisa diatur HRD lewat halaman Pengaturan Sistem.
const BATAS_TERLAMBAT_JAM = 8; // masuk > 08:00 = Terlambat
const BATAS_ALFA_JAM = 12; // masuk > 12:00 = Alfa
const JAM_KELUAR_REGULER = 17; // pulang < 17:00 = Pulang Cepat

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hitungStatusMasuk(jamMasuk: Date, statusKaryawan: StatusKaryawan): StatusKehadiran {
  if (statusKaryawan === 'HARIAN') {
    // Karyawan harian lepas tidak terikat jam baku — dicatat Tepat Waktu, upah dihitung dari jam aktual.
    return 'TEPAT_WAKTU';
  }
  const jamDesimal = jamMasuk.getHours() + jamMasuk.getMinutes() / 60;
  if (jamDesimal > BATAS_ALFA_JAM) return 'ALFA';
  if (jamDesimal > BATAS_TERLAMBAT_JAM) return 'TERLAMBAT';
  return 'TEPAT_WAKTU';
}

async function getEmployeeOrThrow(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError('Karyawan tidak ditemukan', 404);
  return employee;
}

async function getActiveProjectAssignment(employeeId: string, tanggal: Date) {
  return prisma.projectAssignment.findFirst({
    where: {
      employeeId,
      status: 'AKTIF',
      tanggalMulai: { lte: tanggal },
      tanggalBerakhir: { gte: tanggal },
    },
    include: { project: true },
  });
}

export async function clockIn(employeeId: string, input: ClockInInput) {
  const employee = await getEmployeeOrThrow(employeeId);
  const now = new Date();
  const tanggal = startOfDay(now);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_tanggal: { employeeId, tanggal } },
  });
  if (existing?.jamMasuk) {
    throw new AppError('Anda sudah melakukan absen masuk hari ini', 400);
  }

  // Jika karyawan sedang "Assigned to Project", sarankan/isi nama projek formal (FR-ABS-02).
  const assignment = await getActiveProjectAssignment(employeeId, tanggal);
  const namaProjekAktivitas = assignment ? assignment.project.namaProjek : input.namaProjekAktivitas;

  const statusKehadiran = hitungStatusMasuk(now, employee.statusKaryawan);

  return prisma.attendance.upsert({
    where: { employeeId_tanggal: { employeeId, tanggal } },
    create: {
      employeeId,
      tanggal,
      jamMasuk: now,
      namaProjekAktivitas,
      lokasiKerja: input.lokasiKerja,
      lokasiLainnyaDetail: input.lokasiLainnyaDetail,
      latitude: input.latitude,
      longitude: input.longitude,
      statusKehadiran,
    },
    update: {
      jamMasuk: now,
      namaProjekAktivitas,
      lokasiKerja: input.lokasiKerja,
      lokasiLainnyaDetail: input.lokasiLainnyaDetail,
      latitude: input.latitude,
      longitude: input.longitude,
      statusKehadiran,
    },
  });
}

export async function clockOut(employeeId: string, input: ClockOutInput) {
  const tanggal = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_tanggal: { employeeId, tanggal } },
  });

  if (!existing?.jamMasuk) {
    throw new AppError('Anda belum melakukan absen masuk hari ini', 400);
  }
  if (existing.jamKeluar) {
    throw new AppError('Anda sudah melakukan absen pulang hari ini', 400);
  }

  const now = new Date();
  const jamDesimal = now.getHours() + now.getMinutes() / 60;
  const pulangCepat = jamDesimal < JAM_KELUAR_REGULER;
  const statusKehadiran: StatusKehadiran =
    pulangCepat && existing.statusKehadiran === 'TEPAT_WAKTU' ? 'PULANG_CEPAT' : existing.statusKehadiran;

  return prisma.attendance.update({
    where: { employeeId_tanggal: { employeeId, tanggal } },
    data: {
      jamKeluar: now,
      statusKehadiran,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
    },
  });
}

export async function getToday(employeeId: string) {
  const tanggal = startOfDay(new Date());
  return prisma.attendance.findUnique({
    where: { employeeId_tanggal: { employeeId, tanggal } },
  });
}

export async function getHistory(filter: { employeeId: string; startDate?: Date; endDate?: Date }) {
  return prisma.attendance.findMany({
    where: {
      employeeId: filter.employeeId,
      tanggal: { gte: filter.startDate, lte: filter.endDate },
    },
    orderBy: { tanggal: 'desc' },
  });
}

export async function bulkInput(inputByUserId: string, input: BulkAttendanceInput) {
  // TODO: validasi aktor (Supervisor divisi terkait / SPV Project anggota projeknya)
  // punya wewenang atas employeeId target sebelum insert — lihat FR-ABS-04.
  const tanggal = startOfDay(new Date(input.tanggal));

  return prisma.attendance.upsert({
    where: { employeeId_tanggal: { employeeId: input.employeeId, tanggal } },
    create: {
      employeeId: input.employeeId,
      tanggal,
      jamMasuk: new Date(input.jamMasuk),
      jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
      namaProjekAktivitas: 'Input massal oleh atasan',
      lokasiKerja: 'KANTOR',
      statusKehadiran: 'TEPAT_WAKTU',
      inputByUserId,
      deskripsiInputMassal: input.deskripsiInputMassal,
    },
    update: {
      jamMasuk: new Date(input.jamMasuk),
      jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
      inputByUserId,
      deskripsiInputMassal: input.deskripsiInputMassal,
    },
  });
}
