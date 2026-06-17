import { z } from 'zod';

export const createDivisionSchema = z.object({
  namaDivisi: z.string().min(1, 'Nama divisi wajib diisi'),
  supervisorEmployeeId: z.string().optional(),
});

export const updateDivisionSchema = createDivisionSchema.partial();

export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;
export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>;
