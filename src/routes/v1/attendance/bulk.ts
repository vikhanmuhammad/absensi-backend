import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { startOfDay } from '../../../services/attendanceService';

const bulkSchema = z.object({
  employeeId: z.coerce.number(),
  tanggal: z.string().min(1),
  jamMasuk: z.string().min(1),
  jamKeluar: z.string().optional(),
  deskripsiInputMassal: z.string().min(1, 'Deskripsi/alasan input massal wajib diisi'),
});

/**
 * Cek apakah aktor punya wewenang atas employeeId target:
 * - SUPER_ADMIN / HRD → semua karyawan
 * - SUPERVISOR → dirinya sendiri, atau karyawan divisi yang sama yang TIDAK sedang
 *   di-assign ke projek lain (kalau sedang ditugaskan ke projek lain, itu wewenang SPV Project-nya)
 * - KARYAWAN (SPV Project) → dirinya sendiri, atau karyawan yang sedang di-assign ke projek yang dia pimpin
 */
async function isAuthorizedForEmployee(actorUserId: number, actorRole: string, actorEmployeeId: number | null, targetEmployeeId: number): Promise<boolean> {
  if (actorRole === 'SUPER_ADMIN' || actorRole === 'HRD') return true;
  if (actorEmployeeId && targetEmployeeId === actorEmployeeId) return true;

  if (actorRole === 'SUPERVISOR' && actorEmployeeId) {
    const [actor, target] = await Promise.all([
      db.employee.findUnique({ where: { id: actorEmployeeId }, select: { divisiId: true } }),
      db.employee.findUnique({ where: { id: targetEmployeeId }, select: { divisiId: true } }),
    ]);
    if (!actor || !target || actor.divisiId !== target.divisiId) return false;

    const activeAssignment = await db.projectAssignment.findFirst({
      where: { employeeId: targetEmployeeId, status: 'AKTIF' },
    });
    return !activeAssignment;
  }

  // KARYAWAN: cek apakah aktor adalah SPV Project yang memiliki targetEmployeeId dalam assignment aktif
  if (actorRole === 'KARYAWAN' && actorEmployeeId) {
    const activeProjects = await db.project.findMany({
      where: { spvProjectEmployeeId: actorEmployeeId, status: 'AKTIF' },
      select: { id: true },
    });
    if (activeProjects.length === 0) return false;
    const assignment = await db.projectAssignment.findFirst({
      where: { employeeId: targetEmployeeId, projectId: { in: activeProjects.map((p) => p.id) }, status: 'AKTIF' },
    });
    return !!assignment;
  }

  return false;
}

export const post = [
  requireAuth,
  requireRole(['SUPERVISOR', 'SUPER_ADMIN', 'HRD', 'KARYAWAN']),
  async (req: Request, res: Response) => {
    try {
      const input = bulkSchema.parse(req.body);

      const authorized = await isAuthorizedForEmployee(
        req.user!.userId,
        req.user!.role,
        req.user!.employeeId ?? null,
        input.employeeId,
      );
      if (!authorized) {
        return apiError(res, 'Anda tidak memiliki wewenang untuk menginput absensi karyawan ini', 403);
      }

      const tanggal = startOfDay(new Date(input.tanggal));

      const attendance = await db.attendance.upsert({
        where: { employeeId_tanggal: { employeeId: input.employeeId, tanggal } },
        create: {
          employeeId: input.employeeId,
          tanggal,
          jamMasuk: new Date(input.jamMasuk),
          jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
          namaProjekAktivitas: 'Input massal oleh atasan',
          lokasiKerja: 'KANTOR',
          statusKehadiran: 'TEPAT_WAKTU',
          inputByUserId: req.user!.userId,
          deskripsiInputMassal: input.deskripsiInputMassal,
        },
        update: {
          jamMasuk: new Date(input.jamMasuk),
          jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
          inputByUserId: req.user!.userId,
          deskripsiInputMassal: input.deskripsiInputMassal,
        },
      });

      return apiOk(res, attendance, 'Absensi massal berhasil disimpan');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
