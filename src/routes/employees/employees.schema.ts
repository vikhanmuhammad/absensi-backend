import { z } from 'zod';

export const listEmployeesQuerySchema = z.object({
  search: z.string().optional(),
  divisiId: z.string().optional(),
  statusKaryawan: z.enum(['TETAP', 'KONTRAK', 'HARIAN']).optional(),
});

export const updateEmployeeSchema = z.object({
  namaLengkap: z.string().optional(),
  email: z.string().email().optional(),
  noHp: z.string().optional(),
  alamat: z.string().optional(),
  jabatan: z.string().optional(),
  statusAktif: z.boolean().optional(),
});

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
