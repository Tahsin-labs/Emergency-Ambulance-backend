import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AdminService } from './admin.service';

export class AdminController {
  static getUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getUsers(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Users fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  });

  static updateUserRole = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { role } = req.body;
    const ip = req.ip;

    const result = await AdminService.updateUserRole(adminId, id, role, ip);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User role updated successfully',
      data: result,
    });
  });

  static updateUserStatus = catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;
    const ip = req.ip;

    const result = await AdminService.updateUserStatus(adminId, id, status, ip);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User status updated successfully',
      data: result,
    });
  });

  static getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const stats = await AdminService.getDashboardStats();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
    });
  });

  static getIncidentsReport = catchAsync(async (req: Request, res: Response) => {
    const report = await AdminService.getIncidentsReport(req.query as any);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Incidents report retrieved successfully',
      data: report,
    });
  });

  static getAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAuditLogs(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Audit logs retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  });
}
