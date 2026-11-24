import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { DriverService } from './driver.service';

export const DriverController = {
  getAllDrivers: catchAsync(async (req: Request, res: Response) => {
    const result = await DriverService.getAllDrivers(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Drivers retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  updateAvailability: catchAsync(async (req: Request, res: Response) => {
    const result = await DriverService.updateAvailability(req.user!.id, req.body.isOnDuty);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Driver status updated to ${req.body.isOnDuty ? 'On Duty' : 'Off Duty'}`,
      data: result,
    });
  }),

  updateLocation: catchAsync(async (req: Request, res: Response) => {
    const result = await DriverService.updateLocation(req.user!.id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Ambulance location updated successfully',
      data: result,
    });
  }),

  getMyTrips: catchAsync(async (req: Request, res: Response) => {
    const result = await DriverService.getMyTrips(req.user!.id, req.query as any);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Driver trips retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }),

  getCurrentTrip: catchAsync(async (req: Request, res: Response) => {
    const result = await DriverService.getCurrentTrip(req.user!.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result ? 'Active trip retrieved successfully' : 'No active trip in progress',
      data: result,
    });
  }),
};
