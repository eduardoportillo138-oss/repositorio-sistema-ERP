// ============================================
// Controlador de Proyectos
// ============================================

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

export async function getProjects(req: Request, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const companyId = req.user?.companyId;

    res.status(200).json({
      success: true,
      data: { projects: [], total: 0, page, limit },
      message: 'Proyectos obtenidos exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo proyectos', { error: (error as Error).message });
    throw error;
  }
}

export async function getProjectById(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Proyecto obtenido exitosamente',
    });
  } catch (error) {
    logger.error('Error obteniendo proyecto', { error: (error as Error).message });
    throw error;
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({
      success: true,
      data: {},
      message: 'Proyecto creado exitosamente',
    });
  } catch (error) {
    logger.error('Error creando proyecto', { error: (error as Error).message });
    throw error;
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {},
      message: 'Proyecto actualizado exitosamente',
    });
  } catch (error) {
    logger.error('Error actualizando proyecto', { error: (error as Error).message });
    throw error;
  }
}
