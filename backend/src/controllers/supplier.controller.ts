// ============================================
// Controlador de Proveedores
// ============================================

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export async function getSuppliers(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: { suppliers: [], total: 0 },
      message: 'Proveedores obtenidos exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo proveedores', { error: (error as Error).message });
    throw error;
  }
}

export async function getSupplierById(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Proveedor obtenido exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo proveedor', { error: (error as Error).message });
    throw error;
  }
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({
      success: true,
      data: {},
      message: 'Proveedor creado exitosamente',
    });
  } catch (error) {
    logger.error('Error creando proveedor', { error: (error as Error).message });
    throw error;
  }
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Proveedor actualizado exitosamente',
    });
  } catch (error) {
    logger.error('Error actualizando proveedor', { error: (error as Error).message });
    throw error;
  }
}

export async function deactivateSupplier(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      message: 'Proveedor desactivado exitosamente',
    });
  } catch (error) {
    logger.error('Error desactivando proveedor', { error: (error as Error).message });
    throw error;
  }
}
