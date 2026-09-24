// ============================================
// Controlador de Productos
// ============================================

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const companyId = req.user?.companyId;

    res.status(200).json({
      success: true,
      data: { products: [], total: 0, page, limit },
      message: 'Productos obtenidos exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo productos', { error: (error as Error).message });
    throw error;
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    res.status(200).json({
      success: true,
      data: {},
      message: 'Producto obtenido exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo producto', { error: (error as Error).message });
    throw error;
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const productData = req.body;

    // TODO: Verificar stock disponible, categoría existente, etc.

    res.status(201).json({
      success: true,
      data: {},
      message: 'Producto creado exitosamente',
    });
  } catch (error) {
    logger.error('Error creando producto', { error: (error as Error).message });
    throw error;
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    res.status(200).json({
      success: true,
      data: {},
      message: 'Producto actualizado exitosamente',
    });
  } catch (error) {
    logger.error('Error actualizando producto', { error: (error as Error).message });
    throw error;
  }
}

export async function deactivateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // TODO: Verificar que no existan ventas históricas asociadas

    res.status(200).json({
      success: true,
      message: 'Producto desactivado exitosamente',
    });
  } catch (error) {
    logger.error('Error desactivando producto', { error: (error as Error).message });
    throw error;
  }
}
