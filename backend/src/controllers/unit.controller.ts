import { Request, Response } from 'express';
import { unitService } from '../services/unit.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getUnits(req: Request, res: Response) {
  const result = await unitService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getUnitById(req: Request, res: Response) {
  const data = await unitService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createUnit(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await unitService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateUnit(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await unitService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateUnit(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await unitService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
