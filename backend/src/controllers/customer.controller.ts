import { Request, Response } from 'express';
import { customerService } from '../services/customer.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getCustomers(req: Request, res: Response) {
  const result = await customerService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getCustomerById(req: Request, res: Response) {
  const data = await customerService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createCustomer(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await customerService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateCustomer(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await customerService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateCustomer(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await customerService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
