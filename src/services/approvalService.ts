import { Prisma, JenisPengajuan, ApprovalHasil, NotifJenis } from '@prisma/client';

// Dipakai bersama oleh leave-requests & manpower-requests (approve/reject) supaya
// pencatatan ApprovalLog + Notification konsisten di semua jenis pengajuan.

interface LogApprovalInput {
  jenisPengajuan: JenisPengajuan;
  referensiId: string;
  aktorUserId: string;
  hasil: ApprovalHasil;
  catatan?: string;
}

export function logApproval(tx: Prisma.TransactionClient, input: LogApprovalInput) {
  return tx.approvalLog.create({ data: input });
}

interface NotifyUserInput {
  userId: string;
  judul: string;
  pesan: string;
  jenis: NotifJenis;
  referensiId?: string;
}

export function notifyUser(tx: Prisma.TransactionClient, input: NotifyUserInput) {
  return tx.notification.create({ data: input });
}
