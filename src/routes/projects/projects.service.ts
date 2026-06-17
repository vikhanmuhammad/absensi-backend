import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { CreateProjectInput } from './projects.schema';

export async function list() {
  return prisma.project.findMany({
    include: { spvProject: true, _count: { select: { assignments: true } } },
    orderBy: { tanggalMulai: 'desc' },
  });
}

export async function getById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      spvProject: true,
      assignments: { include: { employee: true } },
      manpowerRequests: { include: { divisiAsal: true, employee: true } },
    },
  });
  if (!project) throw new AppError('Projek tidak ditemukan', 404);
  return project;
}

export async function create(createdByUserId: string, data: CreateProjectInput) {
  return prisma.project.create({
    data: {
      namaProjek: data.namaProjek,
      tanggalMulai: new Date(data.tanggalMulai),
      tanggalBerakhir: new Date(data.tanggalBerakhir),
      deskripsi: data.deskripsi,
      spvProjectEmployeeId: data.spvProjectEmployeeId,
      createdByUserId,
    },
  });
}

// TODO: implement penarikan SPV Project lebih cepat dari Due Date & penyelesaian projek manual
// (lihat docs/flow.md bagian "Auto-Reactivation Saat Penugasan/Projek Berakhir").
