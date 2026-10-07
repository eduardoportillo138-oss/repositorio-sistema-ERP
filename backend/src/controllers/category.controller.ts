import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getCategories(req: Request, res: Response) {
  const result = await categoryService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getCategoryById(req: Request, res: Response) {
  const data = await categoryService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createCategory(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await categoryService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateCategory(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await categoryService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateCategory(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await categoryService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
