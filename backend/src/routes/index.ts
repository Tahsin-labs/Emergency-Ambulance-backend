import { Router, Request, Response } from 'express';
import { sendResponse } from '../utils/sendResponse';

const router = Router();

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
