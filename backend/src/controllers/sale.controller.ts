import { Request, Response } from 'express';
import { saleService } from '../services/sale.service';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function getSales(req: Request, res: Response) {
  res.json({ success: true, ...await saleService.list(req.user!, req.query) });
}
export async function getSaleById(req: Request, res: Response) {
  res.json({ success: true, data: await saleService.get(req.user!, req.params.id!) });
}
export async function createSale(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true, data: await saleService.create(actor, req.body, ip, device) });
}
export async function updateSale(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await saleService.update(actor, req.params.id!, req.body, ip, device) });
}
export async function confirmSale(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await saleService.confirm(actor, req.params.id!, ip, device) });
}
export async function cancelSale(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await saleService.cancel(actor, req.params.id!, ip, device) });
}
