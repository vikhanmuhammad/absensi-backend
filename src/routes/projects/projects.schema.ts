import { z } from 'zod';

export const createProjectSchema = z.object({
  namaProjek: z.string().min(1, 'Nama projek wajib diisi'),
  tanggalMulai: z.string().min(1),
  tanggalBerakhir: z.string().min(1),
  deskripsi: z.string().optional(),
  spvProjectEmployeeId: z.string().min(1, 'SPV Project wajib ditentukan'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
