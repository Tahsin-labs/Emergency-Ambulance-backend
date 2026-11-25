import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';

const router = Router();

// ADMIN only on every route
router.use(authenticate, authorize(Role.ADMIN));

router.get('/users', validateRequest(AdminValidation.getUsersQuery), AdminController.getUsers);
router.patch('/users/:id/role', validateRequest(AdminValidation.updateRoleBody), AdminController.updateUserRole);
router.patch('/users/:id/status', validateRequest(AdminValidation.updateStatusBody), AdminController.updateUserStatus);
router.get('/dashboard-stats', AdminController.getDashboardStats);
router.get('/reports/incidents', validateRequest(AdminValidation.getIncidentsReportQuery), AdminController.getIncidentsReport);
router.get('/audit-logs', validateRequest(AdminValidation.getAuditLogsQuery), AdminController.getAuditLogs);

export const AdminRoutes = router;
