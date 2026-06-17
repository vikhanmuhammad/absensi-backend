import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { CreateLeaveRequestInput } from './leave-requests.schema';

export async function listMine(employeeId: string) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { tanggalMulai: 'desc' },
  });
}

// TODO: filter pending sesuai wewenang aktor (Supervisor hanya divisinya, HRD semua) —
// lihat docs/flow.md "Role & Hak Akses" dan FR-REQ-02 (approver setara, bukan berjenjang).
export async function listPending() {
  return prisma.leaveRequest.findMany({
    where: { status: 'MENUNGGU' },
    include: { employee: { include: { divisi: true } } },
    orderBy: { tanggalMulai: 'asc' },
  });
}

export async function create(employeeId: string, data: CreateLeaveRequestInput) {
  return prisma.leaveRequest.create({
    data: {
      employeeId,
      jenisCuti: data.jenisCuti,
      tanggalMulai: new Date(data.tanggalMulai),
      tanggalSelesai: new Date(data.tanggalSelesai),
      alasan: data.alasan,
      dokumenPendukungUrl: data.dokumenPendukungUrl,
    },
  });
}

async function getByIdOrThrow(id: string) {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!leaveRequest) throw new AppError('Pengajuan cuti tidak ditemukan', 404);
  if (leaveRequest.status !== 'MENUNGGU') throw new AppError('Pengajuan ini sudah diproses sebelumnya', 400);
  return leaveRequest;
}

export async function approve(id: string, aktorUserId: string, catatan?: string) {
  const leaveRequest = await getByIdOrThrow(id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'DISETUJUI', approvedByUserId: aktorUserId, approvedAt: new Date() },
    });

    await tx.approvalLog.create({
      data: { jenisPengajuan: 'LEAVE_REQUEST', referensiId: id, aktorUserId, hasil: 'DISETUJUI', catatan },
    });

    await tx.notification.create({
      data: {
        userId: leaveRequest.employee.userId,
        judul: 'Pengajuan Cuti Disetujui',
        pesan: `Pengajuan ${leaveRequest.jenisCuti} Anda telah disetujui.`,
        jenis: 'STATUS_APPROVAL',
        referensiId: id,
      },
    });

    return updated;
  });
}

export async function reject(id: string, aktorUserId: string, catatan?: string) {
  const leaveRequest = await getByIdOrThrow(id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'DITOLAK', approvedByUserId: aktorUserId, approvedAt: new Date() },
    });

    await tx.approvalLog.create({
      data: { jenisPengajuan: 'LEAVE_REQUEST', referensiId: id, aktorUserId, hasil: 'DITOLAK', catatan },
    });

    await tx.notification.create({
      data: {
        userId: leaveRequest.employee.userId,
        judul: 'Pengajuan Cuti Ditolak',
        pesan: `Pengajuan ${leaveRequest.jenisCuti} Anda ditolak.${catatan ? ` Catatan: ${catatan}` : ''}`,
        jenis: 'STATUS_APPROVAL',
        referensiId: id,
      },
    });

    return updated;
  });
}

// TODO: implement perhitungan sisa kuota cuti tahunan (FR-REQ-06) — kurangi kuota saat
// CUTI_TAHUNAN disetujui, aktivasi kuota untuk karyawan kontrak sesuai masa kerja.
