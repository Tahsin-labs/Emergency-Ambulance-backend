import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { TripService } from './trip.service';

export const TripController = {
  updateTripStatus: catchAsync(async (req: Request, res: Response) => {
    const result = await TripService.updateTripStatus(
      req.params.id,
      req.body.status,
      req.user!,
      req.body.note,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Trip status updated to ${req.body.status}`,
      data: result,
    });
  }),

  assignHospital: catchAsync(async (req: Request, res: Response) => {
    const result = await TripService.assignHospital(
      req.params.id,
      req.user!,
      req.body.hospitalId,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Hospital selected for emergency trip',
      data: result,
    });
  }),

  getTripById: catchAsync(async (req: Request, res: Response) => {
    const result = await TripService.getTripById(req.params.id, req.user!);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Trip details retrieved successfully',
      data: result,
    });
  }),

  getTripTimeline: catchAsync(async (req: Request, res: Response) => {
    const result = await TripService.getTripTimeline(req.params.id, req.user!);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Trip timeline events retrieved successfully',
      data: result,
    });
  }),

  getAllTrips: catchAsync(async (req: Request, res: Response) => {
    const result = await TripService.getAllTrips(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Incident history retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),
};
