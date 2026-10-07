import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../controllers/notifications.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('notifications.view'), asyncHandler(listNotifications));
router.patch('/read-all', checkPermission('notifications.read'), asyncHandler(markAllNotificationsRead));
router.patch('/:id/read', checkPermission('notifications.read'), asyncHandler(markNotificationRead));
export const notificationsRouter = router;
