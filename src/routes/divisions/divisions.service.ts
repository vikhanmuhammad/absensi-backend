import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { CreateDivisionInput, UpdateDivisionInput } from './divisions.schema';

export async function list() {
  return prisma.division.findMany({
    include: { supervisor: true, _count: { select: { employees: true } } },
    orderBy: { namaDivisi: 'asc' },
  });
}

export async function getById(id: string) {
  const division = await prisma.division.findUnique({
    where: { id },
    include: { supervisor: true, employees: true },
  });
  if (!division) throw new AppError('Divisi tidak ditemukan', 404);
  return division;
}

export async function create(data: CreateDivisionInput) {
  return prisma.division.create({ data });
}

export async function update(id: string, data: UpdateDivisionInput) {
  await getById(id);
  return prisma.division.update({ where: { id }, data });
}
