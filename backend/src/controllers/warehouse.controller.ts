// ============================================
// Controlador de Almacenes
// ============================================

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

export async function getWarehouses(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: { warehouses: [] },
      message: 'Almacenes obtenidos exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo almacenes', { error: (error as Error).message });
    throw error;
  }
}
