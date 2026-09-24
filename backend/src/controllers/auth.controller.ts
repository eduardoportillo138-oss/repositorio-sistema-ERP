import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, companyId } = req.body;
  const data = await authService.authenticate(email, password, companyId, req.ip, req.get('user-agent') || '');
  res.status(200).json({ success: true, data });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const data = await authService.refreshToken(req.body.refreshToken);
  res.status(200).json({ success: true, data });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.invalidateRefreshToken(
    req.body.refreshToken, req.user!.userId, req.user!.companyId, req.ip, req.get('user-agent') || ''
  );
  res.status(200).json({ success: true, message: 'Sesión cerrada' });
}
