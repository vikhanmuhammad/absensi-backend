import { z } from 'zod';

export const createManpowerRequestSchema = z
  .object({
    projectId: z.string().min(1),
    divisiAsalId: z.string().min(1),
    mode: z.enum(['SPESIFIK', 'HEADCOUNT']),
    employeeId: z.string().optional(),
    jumlahDiminta: z.number().int().positive().optional(),
    kriteria: z.string().optional(),
    tanggalMulaiPenugasan: z.string().min(1),
    tanggalAkhirPenugasan: z.string().min(1),
  })
  .refine((data) => (data.mode === 'SPESIFIK' ? !!data.employeeId : !!data.jumlahDiminta), {
    message: 'employeeId wajib diisi untuk mode Spesifik, jumlahDiminta wajib diisi untuk mode Headcount',
  });

export const approveManpowerRequestSchema = z.object({
  // Wajib diisi untuk mode HEADCOUNT (memilih siapa yang ditugaskan); diabaikan untuk mode SPESIFIK.
  employeeId: z.string().optional(),
});

export type CreateManpowerRequestInput = z.infer<typeof createManpowerRequestSchema>;
export type ApproveManpowerRequestInput = z.infer<typeof approveManpowerRequestSchema>;
