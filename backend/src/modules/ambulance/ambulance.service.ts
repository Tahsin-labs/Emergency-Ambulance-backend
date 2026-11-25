import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { calculateHaversineDistance } from '../../utils/haversine';
import { uploadBuffer, deleteByUrl } from '../../utils/cloudinaryUpload';
import { AmbulanceStatus, AmbulanceType, TripStatus } from '@prisma/client';
import { DispatchService } from '../dispatch/dispatch.service';

const ACTIVE_TRIP_STATUSES = [
  TripStatus.DISPATCHED,
  TripStatus.EN_ROUTE,
  TripStatus.ARRIVED_AT_PICKUP,
  TripStatus.PICKED_UP,
  TripStatus.EN_ROUTE_TO_HOSPITAL,
  TripStatus.ARRIVED_AT_HOSPITAL,
];

export const AmbulanceService = {
  async createAmbulance(
    payload: {
      plateNumber: string;
      type: AmbulanceType;
      baseFare?: number;
      perKmRate?: number;
      lat?: number;
      lng?: number;
    },
    photoBuffer?: Buffer,
  ) {
    const existing = await prisma.ambulance.findUnique({
      where: { plateNumber: payload.plateNumber },
    });
    if (existing) {
      throw new AppError(409, `Ambulance with plate number ${payload.plateNumber} already exists`);
    }

    let photoUrl: string | undefined;
    if (photoBuffer) {
      const uploadRes = await uploadBuffer(photoBuffer, 'ambulances');
      photoUrl = uploadRes.secure_url;
    }

    const ambulance = await prisma.ambulance.create({
      data: {
        plateNumber: payload.plateNumber,
        type: payload.type,
        baseFare: payload.baseFare !== undefined ? payload.baseFare : 500,
        perKmRate: payload.perKmRate !== undefined ? payload.perKmRate : 30,
        lat: payload.lat,
        lng: payload.lng,
        status: AmbulanceStatus.OFFLINE,
        photoUrl,
        locationUpdatedAt: payload.lat && payload.lng ? new Date() : undefined,
      },
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    return ambulance;
  },

  async getAllAmbulances(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.hasDriver === 'true') {
      where.driverId = { not: null };
    } else if (query.hasDriver === 'false') {
      where.driverId = null;
    }

    if (query.searchTerm) {
      where.plateNumber = { contains: query.searchTerm, mode: 'insensitive' };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, ambulances] = await Promise.all([
      prisma.ambulance.count({ where }),
      prisma.ambulance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          driver: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
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
      data: ambulances,
    };
  },

  async getAvailableAmbulances(query: { lat?: number; lng?: number; type?: AmbulanceType }) {
    const where: any = {
      deletedAt: null,
      status: AmbulanceStatus.AVAILABLE,
      driverId: { not: null },
      driver: {
        isOnDuty: true,
        deletedAt: null,
      },
    };

    if (query.type) {
      where.type = query.type;
    }

    const ambulances = await prisma.ambulance.findMany({
      where,
      include: {
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    let results = ambulances.map((amb) => {
      let distanceKm: number | null = null;
      if (query.lat !== undefined && query.lng !== undefined && amb.lat !== null && amb.lng !== null) {
        distanceKm = calculateHaversineDistance(query.lat, query.lng, amb.lat, amb.lng);
      }
      return {
        id: amb.id,
        plateNumber: amb.plateNumber,
        type: amb.type,
        status: amb.status,
        baseFare: amb.baseFare,
        perKmRate: amb.perKmRate,
        photoUrl: amb.photoUrl,
        lat: amb.lat,
        lng: amb.lng,
        locationUpdatedAt: amb.locationUpdatedAt,
        distanceKm,
        driver: {
          name: amb.driver?.user?.name,
          phone: amb.driver?.user?.phone,
        },
      };
    });

    if (query.lat !== undefined && query.lng !== undefined) {
      results = results.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return results;
  },

  async getAmbulanceById(id: string, user: { id: string; role: string }) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    if (!ambulance || ambulance.deletedAt) {
      throw new AppError(404, 'Ambulance not found');
    }

    if (user.role === 'DRIVER') {
      if (ambulance.driver?.userId !== user.id) {
        throw new AppError(403, 'Forbidden: You can only view your own assigned ambulance');
      }
    }

    return ambulance;
  },

  async updateAmbulance(
    id: string,
    payload: {
      type?: AmbulanceType;
      baseFare?: number;
      perKmRate?: number;
      status?: AmbulanceStatus;
      lat?: number;
      lng?: number;
    },
    photoBuffer?: Buffer,
  ) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { in: ACTIVE_TRIP_STATUSES } },
        },
      },
    });

    if (!ambulance || ambulance.deletedAt) {
      throw new AppError(404, 'Ambulance not found');
    }

    if (ambulance.trips.length > 0) {
      if (payload.status && payload.status !== ambulance.status) {
        throw new AppError(400, 'Cannot change status while ambulance has an active trip in progress');
      }
    }

    let photoUrl = ambulance.photoUrl;
    if (photoBuffer) {
      const uploadRes = await uploadBuffer(photoBuffer, 'ambulances');
      if (ambulance.photoUrl) {
        await deleteByUrl(ambulance.photoUrl);
      }
      photoUrl = uploadRes.secure_url;
    }

    const updated = await prisma.ambulance.update({
      where: { id },
      data: {
        type: payload.type,
        baseFare: payload.baseFare,
        perKmRate: payload.perKmRate,
        status: payload.status,
        lat: payload.lat,
        lng: payload.lng,
        photoUrl,
        locationUpdatedAt: payload.lat && payload.lng ? new Date() : undefined,
      },
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    if (payload.status === AmbulanceStatus.AVAILABLE) {
      setTimeout(() => {
        DispatchService.dispatchNextPending().catch(console.error);
      }, 50);
    }

    return updated;
  },

  async deleteAmbulance(id: string) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { in: ACTIVE_TRIP_STATUSES } },
        },
      },
    });

    if (!ambulance || ambulance.deletedAt) {
      throw new AppError(404, 'Ambulance not found');
    }

    if (ambulance.status === AmbulanceStatus.ON_TRIP || ambulance.trips.length > 0) {
      throw new AppError(400, 'Cannot delete an ambulance that is currently on an active trip');
    }

    await prisma.ambulance.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: AmbulanceStatus.OFFLINE,
        driverId: null,
      },
    });
  },

  async assignDriver(id: string, driverId: string | null) {
    const result = await prisma.$transaction(async (tx) => {
      const ambulance = await tx.ambulance.findUnique({
        where: { id },
        include: {
          trips: {
            where: { status: { in: ACTIVE_TRIP_STATUSES } },
          },
        },
      });

      if (!ambulance || ambulance.deletedAt) {
        throw new AppError(404, 'Ambulance not found');
      }

      if (ambulance.status === AmbulanceStatus.ON_TRIP || ambulance.trips.length > 0) {
        throw new AppError(400, 'Cannot change driver assignment while ambulance is on an active trip');
      }

      // If unassigning
      if (driverId === null) {
        const updated = await tx.ambulance.update({
          where: { id },
          data: {
            driverId: null,
            status: AmbulanceStatus.OFFLINE,
          },
          include: {
            driver: {
              include: { user: { select: { id: true, name: true, phone: true, email: true } } },
            },
          },
        });
        return updated;
      }

      // Check driver
      const driver = await tx.driver.findUnique({
        where: { id: driverId },
        include: { ambulance: true },
      });

      if (!driver || driver.deletedAt) {
        throw new AppError(404, 'Driver not found');
      }

      if (driver.ambulance && driver.ambulance.id !== id && !driver.ambulance.deletedAt) {
        throw new AppError(409, `Driver is already assigned to ambulance ${driver.ambulance.plateNumber}`);
      }

      const updated = await tx.ambulance.update({
        where: { id },
        data: {
          driverId,
        },
        include: {
          driver: {
            include: { user: { select: { id: true, name: true, phone: true, email: true } } },
          },
        },
      });

      return updated;
    });

    if (driverId) {
      setTimeout(() => {
        DispatchService.dispatchNextPending().catch(console.error);
      }, 50);
    }

    return result;
  },
};
