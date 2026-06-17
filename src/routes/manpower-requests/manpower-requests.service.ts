import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { CreateManpowerRequestInput } from './manpower-requests.schema';

export async function listPendingForDivision(divisiId?: string) {
  return prisma.manpowerRequest.findMany({
    where: { status: 'MENUNGGU', divisiAsalId: divisiId },
    include: { project: true, divisiAsal: true, employee: true },
    orderBy: { tanggalMulaiPenugasan: 'asc' },
  });
}

export async function listMine(projectIds: string[]) {
  return prisma.manpowerRequest.findMany({
    where: { projectId: { in: projectIds } },
    include: { project: true, divisiAsal: true, employee: true },
    orderBy: { tanggalMulaiPenugasan: 'desc' },
  });
}

export async function create(data: CreateManpowerRequestInput) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new AppError('Projek tidak ditemukan', 404);

  const akhirPenugasan = new Date(data.tanggalAkhirPenugasan);
  if (akhirPenugasan > project.tanggalBerakhir) {
    throw new AppError('Tanggal akhir penugasan tidak boleh melampaui Due Date projek', 400);
  }

  return prisma.manpowerRequest.create({
    data: {
      projectId: data.projectId,
      divisiAsalId: data.divisiAsalId,
      mode: data.mode,
      employeeId: data.mode === 'SPESIFIK' ? data.employeeId : undefined,
      jumlahDiminta: data.mode === 'HEADCOUNT' ? data.jumlahDiminta : undefined,
      kriteria: data.kriteria,
      tanggalMulaiPenugasan: new Date(data.tanggalMulaiPenugasan),
      tanggalAkhirPenugasan: akhirPenugasan,
    },
  });
}

async function assertNoOverlap(employeeId: string, tanggalMulai: Date, tanggalAkhir: Date) {
  const overlap = await prisma.projectAssignment.findFirst({
    where: {
      employeeId,
      status: 'AKTIF',
      tanggalMulai: { lte: tanggalAkhir },
      tanggalBerakhir: { gte: tanggalMulai },
    },
  });
  if (overlap) {
    throw new AppError(
      'Karyawan ini sudah memiliki penugasan projek aktif yang periodenya tumpang tindih (overlap)',
      409,
    );
  }
}

export async function approve(id: string, approvedByUserId: string, employeeId?: string) {
  const manpowerRequest = await prisma.manpowerRequest.findUnique({ where: { id } });
  if (!manpowerRequest) throw new AppError('Request manpower tidak ditemukan', 404);
  if (manpowerRequest.status !== 'MENUNGGU') throw new AppError('Request ini sudah diproses sebelumnya', 400);

  if (manpowerRequest.mode === 'HEADCOUNT' && !employeeId) {
    throw new AppError('Pilih karyawan yang akan ditugaskan untuk request mode Headcount', 400);
  }
  const finalEmployeeId = manpowerRequest.mode === 'SPESIFIK' ? manpowerRequest.employeeId! : employeeId!;

  await assertNoOverlap(finalEmployeeId, manpowerRequest.tanggalMulaiPenugasan, manpowerRequest.tanggalAkhirPenugasan);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.manpowerRequest.update({
      where: { id },
      data: {
        status: 'DISETUJUI',
        approvedByUserId,
        approvedAt: new Date(),
        employeeId: finalEmployeeId,
      },
    });

    await tx.projectAssignment.create({
      data: {
        employeeId: finalEmployeeId,
        projectId: manpowerRequest.projectId,
        manpowerRequestId: id,
        tanggalMulai: manpowerRequest.tanggalMulaiPenugasan,
        tanggalBerakhir: manpowerRequest.tanggalAkhirPenugasan,
        status: 'AKTIF',
      },
    });

    await tx.approvalLog.create({
      data: { jenisPengajuan: 'MANPOWER_REQUEST', referensiId: id, aktorUserId: approvedByUserId, hasil: 'DISETUJUI' },
    });

    return updated;
  });
}

export async function reject(id: string, aktorUserId: string, catatan?: string) {
  const manpowerRequest = await prisma.manpowerRequest.findUnique({ where: { id } });
  if (!manpowerRequest) throw new AppError('Request manpower tidak ditemukan', 404);
  if (manpowerRequest.status !== 'MENUNGGU') throw new AppError('Request ini sudah diproses sebelumnya', 400);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.manpowerRequest.update({ where: { id }, data: { status: 'DITOLAK' } });
    await tx.approvalLog.create({
      data: { jenisPengajuan: 'MANPOWER_REQUEST', referensiId: id, aktorUserId, hasil: 'DITOLAK', catatan },
    });
    return updated;
  });
}

// TODO: scheduler harian untuk auto-set ProjectAssignment.status = SELESAI saat tanggalBerakhir
// terlampaui (lihat docs/flow.md "Auto-Reactivation Saat Penugasan/Projek Berakhir").
