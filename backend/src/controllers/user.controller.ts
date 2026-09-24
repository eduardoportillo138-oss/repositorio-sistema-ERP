import { Request, Response } from 'express';
import { userService } from '../services/user.service';

const meta = (req: Request) => [String(req.ip || ''), req.get('user-agent') || ''] as const;

export async function getUsers(req: Request, res: Response): Promise<void> {
  const result = await userService.list(req.user!, req.query);
  res.json({ success: true, ...result });
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await userService.get(req.user!, req.params.id!) });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  res.status(201).json({ success: true, data: await userService.create(req.user!, req.body, ...meta(req)) });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await userService.update(req.user!, req.params.id!, req.body, ...meta(req)) });
}

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await userService.deactivate(req.user!, req.params.id!, ...meta(req)) });
}
