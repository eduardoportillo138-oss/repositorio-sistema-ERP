// ============================================
// Controlador de Categorías
// ============================================

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: { categories: [] },
      message: 'Categorías obtenidas exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo categorías', { error: (error as Error).message });
    throw error;
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({
      success: true,
      data: {},
      message: 'Categoría creada exitosamente',
    });
  } catch (error) {
    logger.error('Error creando categoría', { error: (error as Error).message });
    throw error;
  }
}
