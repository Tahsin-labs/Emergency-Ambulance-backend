import { Router, Request, Response } from 'express';
import { sendResponse } from '../utils/sendResponse';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/user/user.routes';

const router = Router();

// Module routes
router.use('/auth', AuthRoutes);
router.use('/users', UserRoutes);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Emergency Ambulance Dispatch API is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
