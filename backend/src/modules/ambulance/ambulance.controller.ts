import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AmbulanceService } from './ambulance.service';
import { createAuditLog } from '../../utils/audit';

export const AmbulanceController = {
  createAmbulance: catchAsync(async (req: Request, res: Response) => {
    const result = await AmbulanceService.createAmbulance(req.body, req.file?.buffer);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'AMBULANCE_CREATED',
      entity: 'Ambulance',
      entityId: result.id,
      metadata: { plateNumber: result.plateNumber, type: result.type },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Ambulance created successfully',
      data: result,
    });
  }),

  getAllAmbulances: catchAsync(async (req: Request, res: Response) => {
    const result = await AmbulanceService.getAllAmbulances(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Ambulances retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  getAvailableAmbulances: catchAsync(async (req: Request, res: Response) => {
    const query = {
      lat: req.query.lat ? Number(req.query.lat) : undefined,
      lng: req.query.lng ? Number(req.query.lng) : undefined,
      type: req.query.type as any,
    };
    const result = await AmbulanceService.getAvailableAmbulances(query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Available ambulances retrieved successfully',
      data: result,
    });
  }),

  getAmbulanceById: catchAsync(async (req: Request, res: Response) => {
    const result = await AmbulanceService.getAmbulanceById(req.params.id, {
      id: req.user!.id,
      role: req.user!.role,
    });
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Ambulance retrieved successfully',
      data: result,
    });
  }),

  updateAmbulance: catchAsync(async (req: Request, res: Response) => {
    const result = await AmbulanceService.updateAmbulance(req.params.id, req.body, req.file?.buffer);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'AMBULANCE_UPDATED',
      entity: 'Ambulance',
      entityId: result.id,
      metadata: { updates: req.body },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Ambulance updated successfully',
      data: result,
    });
  }),

  deleteAmbulance: catchAsync(async (req: Request, res: Response) => {
    await AmbulanceService.deleteAmbulance(req.params.id);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'AMBULANCE_DELETED',
      entity: 'Ambulance',
      entityId: req.params.id,
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Ambulance deleted successfully',
      data: null,
    });
  }),

  assignDriver: catchAsync(async (req: Request, res: Response) => {
    const result = await AmbulanceService.assignDriver(req.params.id, req.body.driverId);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'AMBULANCE_DRIVER_ASSIGNED',
      entity: 'Ambulance',
      entityId: req.params.id,
      metadata: { driverId: req.body.driverId },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: req.body.driverId ? 'Driver assigned successfully' : 'Driver unassigned successfully',
      data: result,
    });
  }),
};
