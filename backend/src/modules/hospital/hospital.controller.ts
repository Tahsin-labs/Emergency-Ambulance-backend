import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { HospitalService } from './hospital.service';
import { createAuditLog } from '../../utils/audit';

export const HospitalController = {
  createHospital: catchAsync(async (req: Request, res: Response) => {
    // If specialties is sent as a comma separated string or JSON in multipart, parse it
    if (typeof req.body.specialties === 'string') {
      try {
        req.body.specialties = JSON.parse(req.body.specialties);
      } catch {
        req.body.specialties = req.body.specialties.split(',').map((s: string) => s.trim());
      }
    }

    const result = await HospitalService.createHospital(req.body, req.file?.buffer);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'HOSPITAL_CREATED',
      entity: 'Hospital',
      entityId: result.id,
      metadata: { name: result.name, city: result.city },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Hospital created successfully',
      data: result,
    });
  }),

  getAllHospitals: catchAsync(async (req: Request, res: Response) => {
    const result = await HospitalService.getAllHospitals(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Hospitals retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  getNearbyHospitals: catchAsync(async (req: Request, res: Response) => {
    const query = {
      lat: Number(req.query.lat),
      lng: Number(req.query.lng),
      specialty: req.query.specialty as string | undefined,
      radiusKm: req.query.radiusKm ? Number(req.query.radiusKm) : 20,
    };
    const result = await HospitalService.getNearbyHospitals(query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Nearby hospitals retrieved successfully',
      data: result,
    });
  }),

  getHospitalById: catchAsync(async (req: Request, res: Response) => {
    const result = await HospitalService.getHospitalById(req.params.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Hospital retrieved successfully',
      data: result,
    });
  }),

  updateHospital: catchAsync(async (req: Request, res: Response) => {
    if (typeof req.body.specialties === 'string') {
      try {
        req.body.specialties = JSON.parse(req.body.specialties);
      } catch {
        req.body.specialties = req.body.specialties.split(',').map((s: string) => s.trim());
      }
    }

    const result = await HospitalService.updateHospital(req.params.id, req.body, req.file?.buffer);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'HOSPITAL_UPDATED',
      entity: 'Hospital',
      entityId: result.id,
      metadata: { updates: req.body },
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Hospital updated successfully',
      data: result,
    });
  }),

  deleteHospital: catchAsync(async (req: Request, res: Response) => {
    await HospitalService.deleteHospital(req.params.id);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'HOSPITAL_DELETED',
      entity: 'Hospital',
      entityId: req.params.id,
      ip: req.ip,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Hospital deleted successfully',
      data: null,
    });
  }),
};
