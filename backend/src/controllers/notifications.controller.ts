import { Request, Response } from 'express';
import { notificationsService } from '../services/notifications.service';

export async function listNotifications(req: Request, res: Response) {
  res.json({ success: true, ...await notificationsService.list(req.user!, req.query) });
}
export async function markNotificationRead(req: Request, res: Response) {
  res.json({ success: true, data: await notificationsService.markRead(req.user!, req.params.id!,
    String(req.ip || ''), req.get('user-agent') || '') });
}
export async function markAllNotificationsRead(req: Request, res: Response) {
  res.json({ success: true, data: await notificationsService.markAllRead(req.user!,
    String(req.ip || ''), req.get('user-agent') || '') });
}
