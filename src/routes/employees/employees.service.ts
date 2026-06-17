import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { ListEmployeesQuery, UpdateEmployeeInput } from './employees.schema';

export async function list(filter: ListEmployeesQuery) {
  return prisma.employee.findMany({
    where: {
      divisiId: filter.divisiId,
      statusKaryawan: filter.statusKaryawan,
      namaLengkap: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    },
    include: { divisi: true },
    orderBy: { namaLengkap: 'asc' },
  });
}

export async function getById(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { divisi: true, user: { select: { username: true, role: true, statusAktif: true } } },
  });
  if (!employee) throw new AppError('Karyawan tidak ditemukan', 404);
  return employee;
}

export async function update(id: string, data: UpdateEmployeeInput) {
  await getById(id);
  return prisma.employee.update({ where: { id }, data });
}

// TODO: implement create (onboarding karyawan baru + akun User terkait sekaligus,
// lihat FR-MDK-01/02 & FR-MAK-01 di docs/flow.md dan prompt backend-guide.md #1).
