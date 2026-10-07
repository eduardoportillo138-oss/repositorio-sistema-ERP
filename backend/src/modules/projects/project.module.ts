import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getProjects, getProjectById, createProject, updateProject,
  transitionProject } from '../../controllers/project.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('projects.view'), asyncHandler(getProjects));
router.get('/:id', checkPermission('projects.view'), asyncHandler(getProjectById));
router.post('/', checkPermission('projects.create'), asyncHandler(createProject));
router.put('/:id', checkPermission('projects.edit'), asyncHandler(updateProject));
router.patch('/:id', checkPermission('projects.edit'), asyncHandler(updateProject));
router.patch('/:id/activate', checkPermission('projects.edit'),
  asyncHandler(transitionProject('activate')));
router.patch('/:id/complete', checkPermission('projects.edit'),
  asyncHandler(transitionProject('complete')));
router.patch('/:id/cancel', checkPermission('projects.cancel'),
  asyncHandler(transitionProject('cancel')));
export const projectsRouter = router;
