import { prisma } from '../../lib/prisma';

export async function list(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markAsRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { sudahDibaca: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, sudahDibaca: false },
    data: { sudahDibaca: true },
  });
}
