import { Request, Response } from 'express';

/** Guard every unfinished controller, including routers not mounted by the main app. */
export async function notImplemented(_req: Request, res: Response): Promise<void> {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Módulo en desarrollo' },
  });
}
