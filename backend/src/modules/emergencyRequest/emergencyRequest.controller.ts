import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { EmergencyRequestService } from './emergencyRequest.service';
import { createAuditLog } from '../../utils/audit';

export const EmergencyRequestController = {
  createRequest: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.createRequest(
      req.user!,
      req.body,
      req.file?.buffer,
    );

    await createAuditLog({
      actorId: req.user!.id,
      action: 'REQUEST_CREATED',
      entity: 'EmergencyRequest',
      entityId: result.request!.id,
      metadata: {
        priority: result.request!.priority,
        emergencyType: result.request!.emergencyType,
        dispatched: result.dispatched,
      },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: result.message,
      data: result.request,
    });
  }),

  getAllRequests: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.getAllRequests(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Emergency requests retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  getMyRequests: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.getMyRequests(req.user!.id, req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'My emergency requests retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  getRequestById: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.getRequestById(req.params.id, req.user!);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Emergency request retrieved successfully',
      data: result,
    });
  }),

  overridePriority: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.overridePriority(
      req.params.id,
      req.body.priority,
      req.user!.id,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Request priority successfully updated',
      data: result,
    });
  }),

  cancelRequest: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.cancelRequest(
      req.params.id,
      req.user!,
      req.body.reason,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: null,
    });
  }),

  manualDispatchOrReassign: catchAsync(async (req: Request, res: Response) => {
    const result = await EmergencyRequestService.manualDispatchOrReassign(
      req.params.id,
      req.user!,
      req.body.ambulanceId,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.trip,
    });
  }),
};
