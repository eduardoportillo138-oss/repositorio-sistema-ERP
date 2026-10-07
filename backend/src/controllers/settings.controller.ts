import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';

export async function getSettings(req: Request, res: Response) {
  res.json({ success: true, data: await settingsService.get(req.user!) });
}
export async function updateSettings(req: Request, res: Response) {
  res.json({ success: true, data: await settingsService.update(req.user!, req.body,
    String(req.ip || ''), req.get('user-agent') || '') });
}
