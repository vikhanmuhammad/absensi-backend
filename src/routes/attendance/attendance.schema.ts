import { z } from 'zod';

export const clockInSchema = z.object({
  namaProjekAktivitas: z.string().min(1, 'Nama project/aktivitas wajib diisi'),
  lokasiKerja: z.enum(['KANTOR', 'LAINNYA']),
  lokasiLainnyaDetail: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const bulkAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  tanggal: z.string().min(1),
  jamMasuk: z.string().min(1),
  jamKeluar: z.string().optional(),
  deskripsiInputMassal: z.string().min(1, 'Deskripsi/alasan input massal wajib diisi'),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
