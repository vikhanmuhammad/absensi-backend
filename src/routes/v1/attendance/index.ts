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
      const queryEmployeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const queryDivisiId = req.query.divisiId ? Number(req.query.divisiId) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Karyawan biasa selalu dibatasi ke datanya sendiri
      let employeeId = queryEmployeeId;
      let divisiId = queryDivisiId;
      let projectEmployeeIds: number[] | undefined;

      if (!PRIVILEGED_ROLES.includes(role)) {
        // Cek apakah dia SPV Project — boleh lihat anggota projeknya
        if (req.user!.employeeId) {
          const now = new Date();
          const activeProject = await db.project.findFirst({
            where: {
              spvProjectEmployeeId: req.user!.employeeId,
              status: 'AKTIF',
              tanggalMulai: { lte: now },
              tanggalBerakhir: { gte: now },
            },
            select: { id: true },
          });
          if (activeProject) {
            // SPV Project: boleh lihat anggota projeknya (atau filter employeeId spesifik)
            const assignments = await db.projectAssignment.findMany({
              where: {
                projectId: activeProject.id,
                status: 'AKTIF',
                tanggalMulai: { lte: now },
                tanggalBerakhir: { gte: now },
              },
              select: { employeeId: true },
            });
            projectEmployeeIds = assignments.map((a) => a.employeeId);
            if (queryEmployeeId && projectEmployeeIds.includes(queryEmployeeId)) {
              employeeId = queryEmployeeId;
            } else if (!queryEmployeeId) {
              employeeId = undefined; // show all project members
            }
          } else {
            // Bukan SPV Project — hanya boleh lihat diri sendiri
            employeeId = req.user!.employeeId ?? undefined;
          }
        }
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

      const where: Record<string, unknown> = {
        tanggal: { gte: startDate, lte: endDate },
        employee: divisiId ? { divisiId } : undefined,
      };
      if (employeeId) {
        where.employeeId = employeeId;
      } else if (projectEmployeeIds) {
        where.employeeId = { in: projectEmployeeIds };
      }

      const attendances = await db.attendance.findMany({
        where,
        include: { employee: { select: { namaLengkap: true, divisiId: true, divisi: { select: { namaDivisi: true } } } } },
        orderBy: { tanggal: 'desc' },
      });

      return apiOk(res, attendances.map((a) => omitLocationIfNotPrivileged(a, role)), 'Riwayat absensi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
