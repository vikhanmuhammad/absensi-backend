import { Prisma, JenisPengajuan, ApprovalHasil, NotifJenis, Role } from '@prisma/client';
import { db } from '../utils/db';

// Dipakai bersama oleh leave-requests & manpower-requests (approve/reject) supaya
// pencatatan ApprovalLog + Notification konsisten di semua jenis pengajuan.

// Supervisor hanya berwewenang approve/reject pengajuan dari divisinya sendiri;
// HRD & Super Admin punya wewenang lintas-divisi (override eskalasi).
export async function isAuthorizedForDivision(
  actorRole: Role,
  actorEmployeeId: number | null | undefined,
  targetDivisiId: number,
): Promise<boolean> {
  if (actorRole !== 'SUPERVISOR') return true;
  if (!actorEmployeeId) return false;
  const supervisor = await db.employee.findUnique({ where: { id: actorEmployeeId }, select: { divisiId: true } });
  return supervisor?.divisiId === targetDivisiId;
}

interface LogApprovalInput {
  jenisPengajuan: JenisPengajuan;
  referensiId: number;
  aktorUserId: number;
  hasil: ApprovalHasil;
  catatan?: string;
}

export function logApproval(tx: Prisma.TransactionClient, input: LogApprovalInput) {
  return tx.approvalLog.create({ data: input });
}

interface NotifyUserInput {
  userId: number;
  judul: string;
  pesan: string;
  jenis: NotifJenis;
  referensiId?: number;
}

export function notifyUser(tx: Prisma.TransactionClient, input: NotifyUserInput) {
  return tx.notification.create({ data: input });
}
