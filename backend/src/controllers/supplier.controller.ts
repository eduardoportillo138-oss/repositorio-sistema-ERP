import { Request, Response } from 'express';
import { supplierService } from '../services/supplier.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getSuppliers(req: Request, res: Response) {
  const result = await supplierService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getSupplierById(req: Request, res: Response) {
  const data = await supplierService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createSupplier(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await supplierService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateSupplier(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await supplierService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateSupplier(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await supplierService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
