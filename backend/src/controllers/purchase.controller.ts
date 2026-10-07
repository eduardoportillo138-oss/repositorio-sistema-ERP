import { Request, Response } from 'express';
import { purchaseService } from '../services/purchase.service';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function getPurchases(req: Request, res: Response) {
  res.json({ success: true, ...await purchaseService.list(req.user!, req.query) });
}
export async function getPurchaseById(req: Request, res: Response) {
  res.json({ success: true, data: await purchaseService.get(req.user!, req.params.id!) });
}
export async function createPurchase(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true, data: await purchaseService.create(actor, req.body, ip, device) });
}
export async function updatePurchase(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await purchaseService.update(actor, req.params.id!, req.body, ip, device) });
}
export async function confirmPurchase(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await purchaseService.confirm(actor, req.params.id!, ip, device) });
}
export async function cancelPurchase(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await purchaseService.cancel(actor, req.params.id!, ip, device) });
}
