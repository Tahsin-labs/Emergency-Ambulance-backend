import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { NotificationService } from './notification.service';

export class NotificationController {
  static getMyNotifications = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await NotificationService.getMyNotifications(userId, req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Notifications fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  });

  static markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await NotificationService.markAllAsRead(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  });

  static markOneAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await NotificationService.markOneAsRead(userId, id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Notification marked as read',
      data: result,
    });
  });
}
