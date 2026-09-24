// ============================================
// Módulo de Proyectos
// ============================================

import { isValidObjectId } from '../../utils/validation';
import { Router } from 'express';
import { getProjects, getProjectById, createProject, updateProject } from '../../controllers/project.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

router.get('/', checkPermission('projects.view'), getProjects);
router.get('/:id', checkPermission('projects.view'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), getProjectById);
router.post('/', checkPermission('projects.create'), validate({
  body: { name: { type: 'string', required: true } },
}), createProject);
router.put('/:id', checkPermission('projects.edit'), validate({
  params: { id: { type: 'string', validate: isValidObjectId, message: 'ID inválido' } },
}), updateProject);

export const projectsRouter = router;
