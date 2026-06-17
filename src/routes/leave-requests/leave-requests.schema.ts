import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  jenisCuti: z.enum(['IZIN', 'CUTI_TAHUNAN', 'SAKIT', 'MELAHIRKAN']),
  tanggalMulai: z.string().min(1),
  tanggalSelesai: z.string().min(1),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  dokumenPendukungUrl: z.string().optional(),
});

export const decideLeaveRequestSchema = z.object({
  catatan: z.string().optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
