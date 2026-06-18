import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { omitLocationIfNotPrivileged } from '../../../services/attendanceService';

const PRIVILEGED_ROLES: Role[] = ['SUPER_ADMIN', 'HRD', 'SUPERVISOR'];

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const role = req.user!.role;
      const queryEmployeeId = req.query.employeeId as string | undefined;
      const queryDivisiId = req.query.divisiId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Karyawan biasa selalu dibatasi ke datanya sendiri
      let employeeId = queryEmployeeId;
      let divisiId = queryDivisiId;

      if (!PRIVILEGED_ROLES.includes(role)) {
        employeeId = req.user!.employeeId ?? undefined;
      }

      // Supervisor hanya boleh lihat divisi sendiri
      if (role === 'SUPERVISOR' && req.user!.employeeId) {
        const supervisor = await db.employee.findUnique({
          where: { id: req.user!.employeeId },
          select: { divisiId: true },
        });
        if (supervisor) {
          divisiId = divisiId || supervisor.divisiId;
        }
      }

      const attendances = await db.attendance.findMany({
        where: {
          employeeId,
          tanggal: { gte: startDate, lte: endDate },
          employee: divisiId ? { divisiId } : undefined,
        },
        include: { employee: { select: { namaLengkap: true, divisiId: true, divisi: { select: { namaDivisi: true } } } } },
        orderBy: { tanggal: 'desc' },
      });

      return apiOk(res, attendances.map((a) => omitLocationIfNotPrivileged(a, role)), 'Riwayat absensi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
