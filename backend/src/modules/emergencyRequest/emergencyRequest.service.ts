import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { uploadBuffer } from '../../utils/cloudinaryUpload';
import { createNotification } from '../../utils/notification';
import { createAuditLog } from '../../utils/audit';
import { evaluatePriority, EmergencyType } from './priority.util';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  AmbulanceStatus,
  AmbulanceType,
  Priority,
  RequestStatus,
  Role,
  TripStatus,
  User,
} from '@prisma/client';

const ACTIVE_REQUEST_STATUSES = [
  RequestStatus.PENDING,
  RequestStatus.DISPATCHED,
  RequestStatus.IN_PROGRESS,
];

export const EmergencyRequestService = {
  async createRequest(
    user: User,
    payload: {
      emergencyType: EmergencyType;
      description?: string;
      pickupAddress: string;
      pickupLat: number;
      pickupLng: number;
      patientName?: string;
      patientPhone?: string;
    },
    photoBuffer?: Buffer,
  ) {
    // Check if patient already has an active request
    const activeRequest = await prisma.emergencyRequest.findFirst({
      where: {
        patientId: user.id,
        status: { in: ACTIVE_REQUEST_STATUSES },
        deletedAt: null,
      },
    });

    if (activeRequest) {
      throw new AppError(
        409,
        'You already have an active emergency request in progress. Please wait or cancel the existing request.',
      );
    }

    // Evaluate priority & required ambulance type using priority engine
    const { priority, requiredType } = evaluatePriority(payload.emergencyType, payload.description);

    let conditionImageUrl: string | undefined;
    if (photoBuffer) {
      const uploadRes = await uploadBuffer(photoBuffer, 'emergencies');
      conditionImageUrl = uploadRes.secure_url;
    }

    const patientName = payload.patientName || user.name;
    const patientPhone = payload.patientPhone || user.phone || 'N/A';

    const newRequest = await prisma.emergencyRequest.create({
      data: {
        patientId: user.id,
        patientName,
        patientPhone,
        emergencyType: payload.emergencyType,
        description: payload.description,
        conditionImageUrl,
        priority,
        requiredType,
        pickupAddress: payload.pickupAddress,
        pickupLat: payload.pickupLat,
        pickupLng: payload.pickupLng,
        status: RequestStatus.PENDING,
      },
    });

    // Attempt immediate dispatch
    const dispatchResult = await DispatchService.dispatchRequest(newRequest.id, {
      actorId: user.id,
    });

    // Fetch the updated request state with trip
    const fullRequest = await prisma.emergencyRequest.findUnique({
      where: { id: newRequest.id },
      include: {
        trip: {
          include: {
            ambulance: {
              include: {
                driver: {
                  include: {
                    user: { select: { id: true, name: true, phone: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      request: fullRequest,
      dispatched: dispatchResult.dispatched,
      message: dispatchResult.dispatched
        ? 'Ambulance dispatched'
        : 'Request queued, will be dispatched when an ambulance is available',
    };
  },

  async getAllRequests(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    if (query.searchTerm) {
      where.OR = [
        { patientName: { contains: query.searchTerm, mode: 'insensitive' } },
        { patientPhone: { contains: query.searchTerm, mode: 'insensitive' } },
        { pickupAddress: { contains: query.searchTerm, mode: 'insensitive' } },
        { emergencyType: { contains: query.searchTerm, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, requests] = await Promise.all([
      prisma.emergencyRequest.count({ where }),
      prisma.emergencyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          trip: {
            include: {
              ambulance: true,
              hospital: true,
            },
          },
        },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: requests,
    };
  },

  async getMyRequests(userId: string, query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where = {
      patientId: userId,
      deletedAt: null,
    };

    const [total, requests] = await Promise.all([
      prisma.emergencyRequest.count({ where }),
      prisma.emergencyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: {
            include: {
              ambulance: {
                select: {
                  id: true,
                  plateNumber: true,
                  type: true,
                  photoUrl: true,
                  driver: {
                    include: {
                      user: { select: { name: true, phone: true } },
                    },
                  },
                },
              },
              hospital: {
                select: { id: true, name: true, phone: true, address: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: requests,
    };
  },

  async getRequestById(id: string, user: User) {
    const request = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            ambulance: {
              include: {
                driver: {
                  include: {
                    user: { select: { id: true, name: true, phone: true, email: true } },
                  },
                },
              },
            },
            hospital: true,
            events: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!request || request.deletedAt) {
      throw new AppError(404, 'Emergency request not found');
    }

    // Authorization check
    if (user.role === Role.ADMIN) {
      return request;
    }

    if (user.role === Role.PATIENT && request.patientId === user.id) {
      return request;
    }

    if (
      user.role === Role.DRIVER &&
      request.trip?.ambulance?.driver?.userId === user.id
    ) {
      return request;
    }

    throw new AppError(403, 'Forbidden: You do not have permission to view this emergency request.');
  },

  async overridePriority(id: string, newPriority: Priority, actorId: string) {
    const request = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!request || request.deletedAt) {
      throw new AppError(404, 'Emergency request not found');
    }

    if (request.status !== RequestStatus.PENDING && request.status !== RequestStatus.DISPATCHED) {
      throw new AppError(400, 'Priority override is only allowed while the request is PENDING or DISPATCHED');
    }

    let requiredType: AmbulanceType = AmbulanceType.BASIC;
    if (newPriority === Priority.CRITICAL) requiredType = AmbulanceType.ICU;
    else if (newPriority === Priority.HIGH) requiredType = AmbulanceType.ADVANCED;

    const updated = await prisma.emergencyRequest.update({
      where: { id },
      data: {
        priority: newPriority,
        requiredType,
      },
    });

    await createAuditLog({
      actorId,
      action: 'PRIORITY_OVERRIDE',
      entity: 'EmergencyRequest',
      entityId: id,
      metadata: { oldPriority: request.priority, newPriority, requiredType },
    });

    return updated;
  },

  async cancelRequest(id: string, user: User, reason: string) {
    const request = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            ambulance: {
              include: {
                driver: true,
              },
            },
          },
        },
      },
    });

    if (!request || request.deletedAt) {
      throw new AppError(404, 'Emergency request not found');
    }

    // Role check
    if (user.role !== Role.ADMIN && request.patientId !== user.id) {
      throw new AppError(403, 'Forbidden: Only the owner patient or an admin can cancel this request');
    }

    // Check cancellation eligibility
    if (request.status === RequestStatus.COMPLETED || request.status === RequestStatus.CANCELLED) {
      throw new AppError(400, `Request is already ${request.status}`);
    }

    if (request.trip) {
      const unallowedTripStatuses: TripStatus[] = [
        TripStatus.PICKED_UP,
        TripStatus.EN_ROUTE_TO_HOSPITAL,
        TripStatus.ARRIVED_AT_HOSPITAL,
        TripStatus.COMPLETED,
      ];
      if (unallowedTripStatuses.includes(request.trip.status)) {
        throw new AppError(
          400,
          `Cannot cancel request once the patient has been picked up (Trip status: ${request.trip.status})`,
        );
      }
    }

    // Transaction execution
    await prisma.$transaction(async (tx) => {
      // 1. Cancel request
      await tx.emergencyRequest.update({
        where: { id },
        data: {
          status: RequestStatus.CANCELLED,
          cancelledReason: reason,
        },
      });

      // 2. If trip exists, cancel trip and release ambulance
      if (request.trip) {
        await tx.trip.update({
          where: { id: request.trip.id },
          data: {
            status: TripStatus.CANCELLED,
            completedAt: new Date(),
          },
        });

        await tx.tripStatusEvent.create({
          data: {
            tripId: request.trip.id,
            status: TripStatus.CANCELLED,
            note: `Cancelled by ${user.role} (${user.name}). Reason: ${reason}`,
            actorId: user.id,
          },
        });

        // Revert ambulance to AVAILABLE if driver is on duty, else OFFLINE
        const isDriverOnDuty = request.trip.ambulance.driver?.isOnDuty ?? false;
        await tx.ambulance.update({
          where: { id: request.trip.ambulanceId },
          data: {
            status: isDriverOnDuty ? AmbulanceStatus.AVAILABLE : AmbulanceStatus.OFFLINE,
          },
        });

        // Notify driver
        if (request.trip.ambulance.driver) {
          await createNotification(
            tx,
            request.trip.ambulance.driver.userId,
            'Trip Cancelled',
            `Emergency trip for request #${request.id.slice(0, 8)} was cancelled: ${reason}`,
            'TRIP_CANCELLED',
          );
        }
      }

      // Notify patient
      await createNotification(
        tx,
        request.patientId,
        'Emergency Request Cancelled',
        `Your request #${request.id.slice(0, 8)} has been cancelled: ${reason}`,
        'REQUEST_CANCELLED',
      );
    });

    await createAuditLog({
      actorId: user.id,
      action: 'REQUEST_CANCELLED',
      entity: 'EmergencyRequest',
      entityId: id,
      metadata: { reason },
    });

    // Trigger priority queue dispatch for next pending request
    setTimeout(() => {
      DispatchService.dispatchNextPending().catch(console.error);
    }, 50);

    return { message: 'Emergency request cancelled successfully' };
  },

  async manualDispatchOrReassign(id: string, adminUser: User, ambulanceId?: string) {
    const request = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            ambulance: { include: { driver: true } },
          },
        },
      },
    });

    if (!request || request.deletedAt) {
      throw new AppError(404, 'Emergency request not found');
    }

    // Case 1: Request is PENDING -> standard dispatch
    if (request.status === RequestStatus.PENDING) {
      const res = await DispatchService.dispatchRequest(id, {
        ambulanceId,
        actorId: adminUser.id,
      });

      if (!res.dispatched) {
        throw new AppError(400, res.message);
      }
      return res;
    }

    // Case 2: Already DISPATCHED and trip status is DISPATCHED or EN_ROUTE -> Reassign
    if (
      request.status === RequestStatus.DISPATCHED &&
      request.trip &&
      (request.trip.status === TripStatus.DISPATCHED || request.trip.status === TripStatus.EN_ROUTE)
    ) {
      if (!ambulanceId) {
        throw new AppError(400, 'Must provide target ambulanceId to reassign this trip');
      }

      if (request.trip.ambulanceId === ambulanceId) {
        throw new AppError(400, 'Request is already dispatched to this ambulance');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Release old ambulance
        const oldAmbulance = request.trip!.ambulance;
        const oldDriverOnDuty = oldAmbulance.driver?.isOnDuty ?? false;
        await tx.ambulance.update({
          where: { id: oldAmbulance.id },
          data: {
            status: oldDriverOnDuty ? AmbulanceStatus.AVAILABLE : AmbulanceStatus.OFFLINE,
          },
        });

        // Cancel old trip
        await tx.trip.update({
          where: { id: request.trip!.id },
          data: { status: TripStatus.CANCELLED, completedAt: new Date() },
        });

        await tx.tripStatusEvent.create({
          data: {
            tripId: request.trip!.id,
            status: TripStatus.CANCELLED,
            note: `Reassigned by admin to another ambulance.`,
            actorId: adminUser.id,
          },
        });

        // Validate & lock new ambulance
        const newAmbs: any[] = await tx.$queryRawUnsafe(
          `SELECT a.*, d.id as "driver_id", d."userId" as "driver_user_id" 
           FROM ambulance."Ambulance" a
           INNER JOIN ambulance."Driver" d ON a."driverId" = d.id
           WHERE a.id = $1 
             AND a.status = 'AVAILABLE' 
             AND a."deletedAt" IS NULL 
             AND d."deletedAt" IS NULL 
             AND d."isOnDuty" = true
           FOR UPDATE`,
          ambulanceId,
        );

        if (!newAmbs || newAmbs.length === 0) {
          throw new AppError(409, 'Target ambulance is not available or its driver is off duty');
        }

        const newAmbulance = newAmbs[0];

        // Set new ambulance ON_TRIP
        await tx.ambulance.update({
          where: { id: newAmbulance.id },
          data: { status: AmbulanceStatus.ON_TRIP },
        });

        // Create new trip
        const newTrip = await tx.trip.create({
          data: {
            requestId: request.id,
            ambulanceId: newAmbulance.id,
            status: TripStatus.DISPATCHED,
            events: {
              create: {
                status: TripStatus.DISPATCHED,
                note: `Trip reassigned to ambulance ${newAmbulance.plateNumber} by admin`,
                actorId: adminUser.id,
              },
            },
          },
          include: {
            ambulance: true,
            events: true,
          },
        });

        // Notify patient
        await createNotification(
          tx,
          request.patientId,
          'Ambulance Reassigned',
          `Your emergency request was reassigned to ambulance ${newAmbulance.plateNumber}.`,
          'DISPATCH_REASSIGN',
        );

        // Notify new driver
        await createNotification(
          tx,
          newAmbulance.driver_user_id,
          'New Reassigned Emergency Trip',
          `Emergency request reassigned to you at ${request.pickupAddress}.`,
          'DISPATCH',
        );

        return {
          dispatched: true,
          trip: newTrip,
          ambulance: newAmbulance,
          message: 'Trip successfully reassigned to new ambulance',
        };
      });

      await createAuditLog({
        actorId: adminUser.id,
        action: 'DISPATCH_REASSIGN',
        entity: 'Trip',
        entityId: result.trip.id,
        metadata: {
          requestId: request.id,
          oldAmbulanceId: request.trip.ambulanceId,
          newAmbulanceId: ambulanceId,
        },
      });

      return result;
    }

    throw new AppError(400, 'Request is not in a dispatchable or reassignable state');
  },
};
