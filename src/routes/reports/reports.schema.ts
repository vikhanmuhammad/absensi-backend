import { z } from 'zod';

export const attendanceReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisiId: z.string().optional(),
  projectId: z.string().optional(),
});

export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>;
