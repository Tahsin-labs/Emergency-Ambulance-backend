import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { createNotification } from '../../utils/notification';
import { createAuditLog } from '../../utils/audit';
import {
  AmbulanceStatus,
  AmbulanceType,
  RequestStatus,
  TripStatus,
} from '@prisma/client';

export interface IDispatchResult {
  dispatched: boolean;
  queued?: boolean;
  trip?: any;
  ambulance?: any;
  message: string;
}

export const DispatchService = {
  /**
   * Dispatches a specific emergency request inside a strict serializable transaction.
   * Locks the request and picks the best compatible ambulance with SKIP LOCKED.
   */
  async dispatchRequest(
    requestId: string,
    opts?: { ambulanceId?: string; actorId?: string },
  ): Promise<IDispatchResult> {
    const result = await prisma.$transaction(async (tx) => {
      // a) Lock the request
      const lockedRequests: any[] = await tx.$queryRawUnsafe(
        `SELECT * FROM ambulance."EmergencyRequest" 
         WHERE id = $1 AND status = 'PENDING' AND "deletedAt" IS NULL 
         FOR UPDATE`,
        requestId,
      );

      if (!lockedRequests || lockedRequests.length === 0) {
        return { dispatched: false, message: 'Request is not in PENDING status or does not exist.' };
      }

      const request = lockedRequests[0];
      const requiredType: AmbulanceType = request.requiredType;
      const pickupLat: number = request.pickupLat;
      const pickupLng: number = request.pickupLng;

      let chosenAmbulance: any = null;

      // b) Manual dispatch option
      if (opts?.ambulanceId) {
        const manualAmbs: any[] = await tx.$queryRawUnsafe(
          `SELECT a.*, d.id as "driver_id", d."userId" as "driver_user_id" 
           FROM ambulance."Ambulance" a
           INNER JOIN ambulance."Driver" d ON a."driverId" = d.id
           WHERE a.id = $1 
             AND a.status = 'AVAILABLE' 
             AND a."deletedAt" IS NULL 
             AND d."deletedAt" IS NULL 
             AND d."isOnDuty" = true
           FOR UPDATE`,
          opts.ambulanceId,
        );

        if (!manualAmbs || manualAmbs.length === 0) {
          throw new AppError(409, 'Specified ambulance is not available or its driver is not on duty.');
        }

        chosenAmbulance = manualAmbs[0];
      } else {
        // Auto pick ambulance with FOR UPDATE SKIP LOCKED
        // Compatible types:
        // NEONATAL -> only NEONATAL
        // ICU -> ICU only (or ADVANCED if not available? Per prompt: ICU > ADVANCED > BASIC for CRITICAL/HIGH)
        // Hierarchy matching expression
        let typeOrderSql = '';
        if (requiredType === 'NEONATAL') {
          typeOrderSql = `CASE WHEN a.type = 'NEONATAL' THEN 0 ELSE 100 END`;
        } else if (requiredType === 'ICU') {
          typeOrderSql = `CASE WHEN a.type = 'ICU' THEN 1 WHEN a.type = 'ADVANCED' THEN 2 WHEN a.type = 'BASIC' THEN 3 ELSE 100 END`;
        } else if (requiredType === 'ADVANCED') {
          typeOrderSql = `CASE WHEN a.type = 'ADVANCED' THEN 1 WHEN a.type = 'ICU' THEN 2 WHEN a.type = 'BASIC' THEN 3 ELSE 100 END`;
        } else {
          // BASIC
          typeOrderSql = `CASE WHEN a.type = 'BASIC' THEN 1 WHEN a.type = 'ADVANCED' THEN 2 WHEN a.type = 'ICU' THEN 3 ELSE 100 END`;
        }

        const pickedAmbs: any[] = await tx.$queryRawUnsafe(
          `SELECT a.*, d.id as "driver_id", d."userId" as "driver_user_id",
            (6371 * acos(
              cos(radians($1)) * cos(radians(COALESCE(a.lat, $1))) *
              cos(radians(COALESCE(a.lng, $2)) - radians($2)) +
              sin(radians($1)) * sin(radians(COALESCE(a.lat, $1)))
            )) AS distance_km
           FROM ambulance."Ambulance" a
           INNER JOIN ambulance."Driver" d ON a."driverId" = d.id
           WHERE a.status = 'AVAILABLE'
             AND a."deletedAt" IS NULL
             AND d."deletedAt" IS NULL
             AND d."isOnDuty" = true
             AND a.type IN ('BASIC', 'ADVANCED', 'ICU', 'NEONATAL')
           ORDER BY 
             ${typeOrderSql} ASC,
             distance_km ASC NULLS LAST
           LIMIT 1
           FOR UPDATE SKIP LOCKED`,
          pickupLat,
          pickupLng,
        );

        if (pickedAmbs && pickedAmbs.length > 0) {
          chosenAmbulance = pickedAmbs[0];
        }
      }

      // c) If none available: leave request PENDING and return queued: true
      if (!chosenAmbulance) {
        return {
          dispatched: false,
          queued: true,
          message: 'No available ambulance found at this moment. Request has been queued for immediate dispatch.',
        };
      }

      // d) Mark ambulance ON_TRIP and request DISPATCHED
      await tx.ambulance.update({
        where: { id: chosenAmbulance.id },
        data: { status: AmbulanceStatus.ON_TRIP },
      });

      const updatedRequest = await tx.emergencyRequest.update({
        where: { id: request.id },
        data: { status: RequestStatus.DISPATCHED },
      });

      // Create Trip and TripStatusEvent
      const trip = await tx.trip.create({
        data: {
          requestId: request.id,
          ambulanceId: chosenAmbulance.id,
          status: TripStatus.DISPATCHED,
          events: {
            create: {
              status: TripStatus.DISPATCHED,
              note: `Ambulance ${chosenAmbulance.plateNumber} dispatched to emergency pickup.`,
              actorId: opts?.actorId,
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
        'Ambulance Dispatched',
        `Ambulance ${chosenAmbulance.plateNumber} is on the way to ${request.pickupAddress}.`,
        'DISPATCH',
      );

      // Notify driver's user
      await createNotification(
        tx,
        chosenAmbulance.driver_user_id,
        'New Emergency Trip Assigned',
        `New ${request.priority} emergency at ${request.pickupAddress}. Patient: ${request.patientName} (${request.patientPhone}).`,
        'DISPATCH',
      );

      return {
        dispatched: true,
        trip,
        ambulance: chosenAmbulance,
        message: 'Ambulance dispatched successfully',
      };
    });

    if (result.dispatched) {
      await createAuditLog({
        actorId: opts?.actorId || result.ambulance?.driver_user_id,
        action: 'DISPATCHED',
        entity: 'Trip',
        entityId: result.trip?.id,
        metadata: {
          requestId,
          ambulanceId: result.ambulance?.id,
          plateNumber: result.ambulance?.plateNumber,
        },
      });
    }

    return result;
  },

  /**
   * Loops through PENDING emergency requests ordered by priority rank ASC then createdAt ASC,
   * dispatching each until no available ambulance remains or loop is capped.
   */
  async dispatchNextPending(): Promise<number> {
    let dispatchedCount = 0;
    const MAX_DISPATCH_PER_TICK = 20;

    for (let i = 0; i < MAX_DISPATCH_PER_TICK; i++) {
      // Find highest priority pending request
      // Priority ordering: CRITICAL (1) > HIGH (2) > MEDIUM (3) > LOW (4)
      const nextPendingRequests: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM ambulance."EmergencyRequest"
         WHERE status = 'PENDING' AND "deletedAt" IS NULL
         ORDER BY 
           CASE priority
             WHEN 'CRITICAL' THEN 1
             WHEN 'HIGH' THEN 2
             WHEN 'MEDIUM' THEN 3
             WHEN 'LOW' THEN 4
             ELSE 5
           END ASC,
           "createdAt" ASC
         LIMIT 1`,
      );

      if (!nextPendingRequests || nextPendingRequests.length === 0) {
        break;
      }

      const nextRequestId = nextPendingRequests[0].id;
      const res = await this.dispatchRequest(nextRequestId);

      if (res.dispatched) {
        dispatchedCount++;
      } else {
        // If cannot dispatch, no available ambulance currently matches; exit loop
        break;
      }
    }

    return dispatchedCount;
  },
};
