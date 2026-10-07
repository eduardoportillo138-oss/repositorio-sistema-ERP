import { Request, Response } from 'express';
import { productService } from '../services/product.service';

const context = (req: Request) => ({
  actor: req.user!,
  ip: String(req.ip || ''),
  device: req.get('user-agent') || '',
});

export async function getProducts(req: Request, res: Response) {
  const result = await productService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getProductById(req: Request, res: Response) {
  const data = await productService.get(req.user!, req.params.id!);
  res.json({ success: true, data });
}

export async function createProduct(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await productService.create(actor, req.body, ip, device);
  res.status(201).json({ success: true, data });
}

export async function updateProduct(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await productService.update(actor, req.params.id!, req.body, ip, device);
  res.json({ success: true, data });
}

export async function deactivateProduct(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  const data = await productService.deactivate(actor, req.params.id!, ip, device);
  res.json({ success: true, data });
}
