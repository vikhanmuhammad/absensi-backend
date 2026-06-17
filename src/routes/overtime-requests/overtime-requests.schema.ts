import { z } from 'zod';

export const createOvertimeRequestSchema = z.object({
  tanggal: z.string().min(1),
  deskripsiAlasan: z.string().min(1, 'Deskripsi/alasan lembur wajib diisi'),
});

export const createBulkOvertimeRequestSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1, 'Pilih minimal 1 karyawan'),
  tanggal: z.string().min(1),
  deskripsiAlasan: z.string().min(1, 'Deskripsi/alasan lembur massal wajib diisi'),
});

export type CreateOvertimeRequestInput = z.infer<typeof createOvertimeRequestSchema>;
export type CreateBulkOvertimeRequestInput = z.infer<typeof createBulkOvertimeRequestSchema>;
