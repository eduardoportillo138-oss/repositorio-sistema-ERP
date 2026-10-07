import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getSettings, updateSettings } from '../../controllers/settings.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('settings.view'), asyncHandler(getSettings));
router.patch('/', checkPermission('settings.edit'), asyncHandler(updateSettings));
export const settingsRouter = router;
