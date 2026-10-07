import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function getInventory(req: Request, res: Response) {
  res.json({ success: true, ...await inventoryService.list(req.user!, req.query) });
}
export async function getProductStock(req: Request, res: Response) {
  res.json({ success: true, data: await inventoryService.product(req.user!, req.params.productId!) });
}
export async function getInventoryMovements(req: Request, res: Response) {
  res.json({ success: true, ...await inventoryService.movements(req.user!, req.query) });
}
export async function createAdjustment(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await inventoryService.adjust(actor, req.body, ip, device) });
}
export async function createTransfer(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await inventoryService.transfer(actor, req.body, ip, device) });
}
