import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationsService.list(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationsService.markAsRead(req.user!.userId, req.params.id as string);
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationsService.markAllAsRead(req.user!.userId);
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    next(err);
  }
}
