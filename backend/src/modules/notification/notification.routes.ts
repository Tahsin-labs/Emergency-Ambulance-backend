import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { NotificationController } from './notification.controller';
import { NotificationValidation } from './notification.validation';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// IMPORTANT: /read-all must be registered BEFORE /:id
router.get('/', validateRequest(NotificationValidation.getNotificationsQuery, 'query'), NotificationController.getMyNotifications);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markOneAsRead);

export const NotificationRoutes = router;
