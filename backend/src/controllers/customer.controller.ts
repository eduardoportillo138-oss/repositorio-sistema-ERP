// ============================================
// Controlador de Clientes
// ============================================

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: { customers: [], total: 0 },
      message: 'Clientes obtenidos exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo clientes', { error: (error as Error).message });
    throw error;
  }
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Cliente obtenido exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo cliente', { error: (error as Error).message });
    throw error;
  }
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({
      success: true,
      data: {},
      message: 'Cliente creado exitosamente',
    });
  } catch (error) {
    logger.error('Error creando cliente', { error: (error as Error).message });
    throw error;
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Cliente actualizado exitosamente',
    });
  } catch (error) {
    logger.error('Error actualizando cliente', { error: (error as Error).message });
    throw error;
  }
}

export async function deactivateCustomer(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      message: 'Cliente desactivado exitosamente',
    });
  } catch (error) {
    logger.error('Error desactivando cliente', { error: (error as Error).message });
    throw error;
  }
}
