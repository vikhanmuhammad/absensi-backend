import { prisma } from '../../lib/prisma';
import { CreateOvertimeRequestInput, CreateBulkOvertimeRequestInput } from './overtime-requests.schema';

export async function listMine(employeeId: string) {
  return prisma.overtimeRequest.findMany({
    where: { employeeId },
    orderBy: { tanggal: 'desc' },
  });
}

export async function createIndividual(employeeId: string, data: CreateOvertimeRequestInput) {
  return prisma.overtimeRequest.create({
    data: {
      employeeId,
      jenis: 'INDIVIDUAL',
      tanggal: new Date(data.tanggal),
      deskripsiAlasan: data.deskripsiAlasan,
      status: 'DIAJUKAN',
    },
  });
}

// Lembur massal diinput oleh Supervisor/SPV Project yang sudah berwenang atas karyawan terkait,
// sehingga langsung tercatat DICATAT_OTOMATIS (FR-REQ-04) — tetap bisa ditinjau/dibatalkan HRD.
export async function createBulk(inputByUserId: string, data: CreateBulkOvertimeRequestInput) {
  return prisma.overtimeRequest.create({
    data: {
      jenis: 'MASSAL',
      tanggal: new Date(data.tanggal),
      deskripsiAlasan: data.deskripsiAlasan,
      status: 'DICATAT_OTOMATIS',
      inputByUserId,
      members: {
        create: data.employeeIds.map((employeeId) => ({ employeeId })),
      },
    },
    include: { members: true },
  });
}

// TODO: implement approve/reject untuk pengajuan INDIVIDUAL (Supervisor/HRD) dan
// pembatalan oleh HRD untuk pengajuan MASSAL — lihat FR-REQ-04 & Matriks Approval di docs/flow.md.
