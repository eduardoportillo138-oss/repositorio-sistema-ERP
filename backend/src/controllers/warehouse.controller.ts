import { Request, Response } from 'express';
import { warehouseService } from '../services/warehouse.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getWarehouses(req: Request, res: Response) {
  const result = await warehouseService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getWarehouseById(req: Request, res: Response) {
  const data = await warehouseService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createWarehouse(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await warehouseService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateWarehouse(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await warehouseService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateWarehouse(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await warehouseService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
