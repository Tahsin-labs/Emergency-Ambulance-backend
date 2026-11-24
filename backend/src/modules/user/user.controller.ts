import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { UserService } from './user.service';
import { AppError } from '../../utils/AppError';

export const UserController = {
  getMyProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getMyProfile(req.user!.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile retrieved successfully',
      data: result,
    });
  }),

  updateMyProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateMyProfile(req.user!.id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  }),

  updateAvatar: catchAsync(async (req: Request, res: Response) => {
    if (!req.file || !req.file.buffer) {
      throw new AppError(400, 'Please provide an image file with key "avatar"');
    }

    const result = await UserService.updateAvatar(req.user!.id, req.file.buffer);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Avatar uploaded successfully',
      data: result,
    });
  }),

  deleteMyProfile: catchAsync(async (req: Request, res: Response) => {
    await UserService.deleteMyProfile(req.user!.id);
    res.clearCookie('refreshToken');
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User account deleted successfully',
      data: null,
    });
  }),
};
