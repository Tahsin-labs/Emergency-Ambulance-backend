import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { calculateHaversineDistance } from '../../utils/haversine';
import { createNotification } from '../../utils/notification';
import { createAuditLog } from '../../utils/audit';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  AmbulanceStatus,
  PaymentStatus,
  Prisma,
  RequestStatus,
  Role,
  TripStatus,
  User,
} from '@prisma/client';

/**
 * Strict Trip State Transition Sequence:
 * DISPATCHED -> EN_ROUTE -> ARRIVED_AT_PICKUP -> PICKED_UP -> EN_ROUTE_TO_HOSPITAL -> ARRIVED_AT_HOSPITAL -> COMPLETED
 */
const VALID_NEXT_STATUS: Record<TripStatus, TripStatus | null> = {
  [TripStatus.DISPATCHED]: TripStatus.EN_ROUTE,
  [TripStatus.EN_ROUTE]: TripStatus.ARRIVED_AT_PICKUP,
  [TripStatus.ARRIVED_AT_PICKUP]: TripStatus.PICKED_UP,
  [TripStatus.PICKED_UP]: TripStatus.EN_ROUTE_TO_HOSPITAL,
  [TripStatus.EN_ROUTE_TO_HOSPITAL]: TripStatus.ARRIVED_AT_HOSPITAL,
  [TripStatus.ARRIVED_AT_HOSPITAL]: TripStatus.COMPLETED,
  [TripStatus.COMPLETED]: null,
  [TripStatus.CANCELLED]: null,
};

export const TripService = {
  async updateTripStatus(
    tripId: string,
    nextStatus: TripStatus,
    user: User,
    note?: string,
  ) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        ambulance: {
          include: { driver: true },
        },
        request: true,
        hospital: true,
      },
    });

    if (!trip) {
      throw new AppError(404, 'Trip not found');
    }

    // Role check: Only assigned driver or Admin can update status
    if (user.role !== Role.ADMIN) {
      if (trip.ambulance.driver?.userId !== user.id) {
        throw new AppError(403, 'Forbidden: You are not the driver assigned to this emergency trip');
      }
    }

    // Validate sequential state transition
    const expectedNext = VALID_NEXT_STATUS[trip.status];
    if (nextStatus !== expectedNext) {
      throw new AppError(400, `Invalid status transition from ${trip.status} to ${nextStatus}`);
    }

    // Additional state prerequisites:
    if (nextStatus === TripStatus.EN_ROUTE_TO_HOSPITAL && !trip.hospitalId) {
      throw new AppError(400, 'Select a hospital first before proceeding to hospital route');
    }

    // Execute state changes inside an atomic transaction
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: nextStatus,
      };

      // 1. EN_ROUTE side effect: request -> IN_PROGRESS
      if (nextStatus === TripStatus.EN_ROUTE) {
        await tx.emergencyRequest.update({
          where: { id: trip.requestId },
          data: { status: RequestStatus.IN_PROGRESS },
        });
      }

      // 2. ARRIVED_AT_HOSPITAL side effect: hospital.availableBeds - 1 (min 0)
      if (nextStatus === TripStatus.ARRIVED_AT_HOSPITAL && trip.hospitalId) {
        const hospital = await tx.hospital.findUnique({ where: { id: trip.hospitalId } });
        if (hospital && hospital.availableBeds > 0) {
          await tx.hospital.update({
            where: { id: trip.hospitalId },
            data: { availableBeds: hospital.availableBeds - 1 },
          });
        }
      }

      // 3. COMPLETED side effect:
      if (nextStatus === TripStatus.COMPLETED) {
        const completedAt = new Date();
        updateData.completedAt = completedAt;

        // Calculate distance
        let dist = 1; // minimum 1 km
        if (trip.hospital) {
          const rawDist = calculateHaversineDistance(
            trip.request.pickupLat,
            trip.request.pickupLng,
            trip.hospital.lat,
            trip.hospital.lng,
          );
          dist = Math.max(1, rawDist);
        }
        updateData.distanceKm = new Prisma.Decimal(dist);

        // Calculate fare: baseFare + distanceKm * perKmRate
        const baseFare = Number(trip.ambulance.baseFare);
        const perKm = Number(trip.ambulance.perKmRate);
        const totalFare = Math.round((baseFare + dist * perKm) * 100) / 100;
        updateData.fare = new Prisma.Decimal(totalFare);

        // Mark request COMPLETED
        await tx.emergencyRequest.update({
          where: { id: trip.requestId },
          data: { status: RequestStatus.COMPLETED },
        });

        // Set ambulance back to AVAILABLE if driver is on duty, else OFFLINE
        const isDriverOnDuty = trip.ambulance.driver?.isOnDuty ?? false;
        await tx.ambulance.update({
          where: { id: trip.ambulanceId },
          data: {
            status: isDriverOnDuty ? AmbulanceStatus.AVAILABLE : AmbulanceStatus.OFFLINE,
          },
        });

        // Create Payment row in PENDING status (idempotent upsert via unique tripId)
        const tranId = `TRX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await tx.payment.upsert({
          where: { tripId: trip.id },
          create: {
            tripId: trip.id,
            userId: trip.request.patientId,
            amount: new Prisma.Decimal(totalFare),
            currency: 'BDT',
            status: PaymentStatus.PENDING,
            tranId,
          },
          update: {
            amount: new Prisma.Decimal(totalFare),
          },
        });

        // Notify patient invoice ready
        await createNotification(
          tx,
          trip.request.patientId,
          'Trip Completed - Invoice Ready',
          `Your ambulance trip is completed. Total fare is ${totalFare} BDT. Please proceed to payment.`,
          'INVOICE',
        );
      }

      // Record TripStatusEvent
      await tx.tripStatusEvent.create({
        data: {
          tripId: trip.id,
          status: nextStatus,
          note: note || `Status changed to ${nextStatus}`,
          actorId: user.id,
        },
      });

      // Update trip
      const savedTrip = await tx.trip.update({
        where: { id: trip.id },
        data: updateData,
        include: {
          ambulance: true,
          hospital: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      // Notify patient of progress
      if (nextStatus !== TripStatus.COMPLETED) {
        await createNotification(
          tx,
          trip.request.patientId,
          `Trip Status: ${nextStatus.replace(/_/g, ' ')}`,
          `Ambulance update: ${nextStatus.replace(/_/g, ' ')} ${note ? `(${note})` : ''}`,
          'TRIP_UPDATE',
        );
      }

      return savedTrip;
    });

    await createAuditLog({
      actorId: user.id,
      action: `TRIP_${nextStatus}`,
      entity: 'Trip',
      entityId: trip.id,
      metadata: { previousStatus: trip.status, nextStatus, note },
    });

    // When an ambulance is completed/freed, trigger dispatch for queued pending requests
    if (nextStatus === TripStatus.COMPLETED) {
      setTimeout(() => {
        DispatchService.dispatchNextPending().catch(console.error);
      }, 50);
    }

    return updatedTrip;
  },

  async assignHospital(tripId: string, user: User, explicitHospitalId?: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        ambulance: { include: { driver: true } },
        request: true,
      },
    });

    if (!trip) {
      throw new AppError(404, 'Trip not found');
    }

    // Role check
    if (user.role !== Role.ADMIN) {
      if (trip.ambulance.driver?.userId !== user.id) {
        throw new AppError(403, 'Forbidden: You are not the driver assigned to this emergency trip');
      }
    }

    // Allowed only during PICKED_UP or EN_ROUTE_TO_HOSPITAL
    if (trip.status !== TripStatus.PICKED_UP && trip.status !== TripStatus.EN_ROUTE_TO_HOSPITAL) {
      throw new AppError(
        400,
        `Hospital can only be assigned or changed while status is PICKED_UP or EN_ROUTE_TO_HOSPITAL (Current: ${trip.status})`,
      );
    }

    let selectedHospital: any = null;

    if (explicitHospitalId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: explicitHospitalId },
      });

      if (!hospital || hospital.deletedAt) {
        throw new AppError(404, 'Hospital not found');
      }

      if (!hospital.hasEmergency || hospital.availableBeds <= 0) {
        throw new AppError(400, 'Selected hospital does not have emergency service or available beds');
      }

      selectedHospital = hospital;
    } else {
      // Auto-select nearest hospital with emergency and available beds, matching specialties if possible
      const hospitals = await prisma.hospital.findMany({
        where: {
          deletedAt: null,
          hasEmergency: true,
          availableBeds: { gt: 0 },
        },
      });

      if (!hospitals || hospitals.length === 0) {
        throw new AppError(404, 'No available emergency hospitals with open beds found nearby');
      }

      // Map specialty preferences
      const emergencyType = trip.request.emergencyType.toUpperCase();
      let preferredKeyword = '';
      if (emergencyType.includes('CARD')) preferredKeyword = 'Cardiology';
      else if (emergencyType.includes('NEURO') || emergencyType.includes('STROKE')) preferredKeyword = 'Neurology';
      else if (emergencyType.includes('TRAUMA') || emergencyType.includes('ACCIDENT')) preferredKeyword = 'Trauma';

      const scoredHospitals = hospitals.map((hosp) => {
        const distanceKm = calculateHaversineDistance(
          trip.request.pickupLat,
          trip.request.pickupLng,
          hosp.lat,
          hosp.lng,
        );

        let matchBonus = 0;
        if (preferredKeyword && hosp.specialties.some((s) => s.toLowerCase().includes(preferredKeyword.toLowerCase()))) {
          matchBonus = 1; // Prioritize specialty
        }

        return {
          hospital: hosp,
          distanceKm,
          matchBonus,
        };
      });

      // Sort: matchBonus DESC then distanceKm ASC
      scoredHospitals.sort((a, b) => {
        if (b.matchBonus !== a.matchBonus) return b.matchBonus - a.matchBonus;
        return a.distanceKm - b.distanceKm;
      });

      selectedHospital = scoredHospitals[0].hospital;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        hospitalId: selectedHospital.id,
      },
      include: {
        hospital: true,
      },
    });

    const distanceKm = calculateHaversineDistance(
      trip.request.pickupLat,
      trip.request.pickupLng,
      selectedHospital.lat,
      selectedHospital.lng,
    );

    return {
      trip: updatedTrip,
      selectedHospital: {
        ...selectedHospital,
        distanceKm,
      },
    };
  },

  async getTripById(id: string, user: User) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        ambulance: {
          include: {
            driver: {
              include: { user: { select: { id: true, name: true, phone: true } } },
            },
          },
        },
        request: true,
        hospital: true,
        events: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });

    if (!trip) {
      throw new AppError(404, 'Trip not found');
    }

    // Role check
    if (user.role === Role.ADMIN) return trip;
    if (user.role === Role.PATIENT && trip.request.patientId === user.id) return trip;
    if (user.role === Role.DRIVER && trip.ambulance.driver?.userId === user.id) return trip;

    throw new AppError(403, 'Forbidden: You do not have permission to view this trip');
  },

  async getTripTimeline(id: string, user: User) {
    const trip = await this.getTripById(id, user);
    return trip.events;
  },

  async getAllTrips(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.ambulanceId) {
      where.ambulanceId = query.ambulanceId;
    }
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }
    if (query.priority) {
      where.request = { priority: query.priority };
    }
    if (query.fromDate || query.toDate) {
      where.dispatchedAt = {};
      if (query.fromDate) where.dispatchedAt.gte = new Date(query.fromDate);
      if (query.toDate) where.dispatchedAt.lte = new Date(query.toDate);
    }

    const sortBy = query.sortBy || 'dispatchedAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          ambulance: true,
          hospital: true,
          request: true,
          payment: true,
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
      data: trips,
    };
  },
};
