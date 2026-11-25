import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AuthService } from './auth.service';
import { createAuditLog } from '../../utils/audit';

export const AuthController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog({
      actorId: result.user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: result.user.id,
      metadata: { role: result.user.role },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog({
      actorId: result.user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id,
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: result,
    });
  }),

  googleLogin: catchAsync(async (req: Request, res: Response) => {
    const { idToken } = req.body;
    const result = await AuthService.googleLogin(idToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog({
      actorId: result.user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id,
      metadata: { provider: 'GOOGLE' },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Google login successful',
      data: result,
    });
  }),

  refreshToken: catchAsync(async (req: Request, res: Response) => {
    const incomingToken = req.body.refreshToken || req.cookies?.refreshToken;
    const tokens = await AuthService.refreshToken(incomingToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await AuthService.logout(userId);

    res.clearCookie('refreshToken');

    await createAuditLog({
      actorId: userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Logout successful',
      data: null,
    });
  }),

  changePassword: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await AuthService.changePassword(userId, req.body);

    res.clearCookie('refreshToken');

    await createAuditLog({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Password changed successfully. Please log in with your new password.',
      data: null,
    });
  }),

  registerDriver: catchAsync(async (req: Request, res: Response) => {
    const { name, email, phone, password, licenseNumber } = req.body;
    const licenseImageBuffer = req.file?.buffer;

    const result = await AuthService.registerDriver({
      name,
      email,
      phone,
      password,
      licenseNumber,
      licenseImageBuffer,
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'DRIVER_CREATED',
      entity: 'Driver',
      entityId: result.driver.id,
      metadata: { userId: result.user.id, licenseNumber },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Driver registered successfully',
      data: result,
    });
  }),
};
