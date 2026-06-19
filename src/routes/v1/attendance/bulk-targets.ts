import { Request, Response } from 'express';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { getBulkAttendanceTargets } from '../../../services/attendanceService';

// Daftar karyawan yang boleh diinput absensinya oleh aktor yang login lewat form Input Absensi Massal.
// Tidak dibatasi requireRole karena KARYAWAN biasa yang sedang menjadi SPV Project juga harus bisa akses;
// untuk KARYAWAN yang bukan supervisor/SPV Project, service ini otomatis mengembalikan list kosong.
export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employees = await getBulkAttendanceTargets(req.user!.role, req.user!.employeeId);
      return apiOk(res, employees, 'Daftar karyawan yang dapat diinput absensi massal berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
