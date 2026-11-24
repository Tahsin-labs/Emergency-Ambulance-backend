import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { AmbulanceStatus, TripStatus } from '@prisma/client';

const ACTIVE_TRIP_STATUSES = [
  TripStatus.DISPATCHED,
  TripStatus.EN_ROUTE,
  TripStatus.ARRIVED_AT_PICKUP,
  TripStatus.PICKED_UP,
  TripStatus.EN_ROUTE_TO_HOSPITAL,
  TripStatus.ARRIVED_AT_HOSPITAL,
];

export const DriverService = {
  async getAllDrivers(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      user: { deletedAt: null },
    };

    if (query.isOnDuty !== undefined) {
      where.isOnDuty = query.isOnDuty === 'true';
    }

    if (query.searchTerm) {
      where.OR = [
        { licenseNumber: { contains: query.searchTerm, mode: 'insensitive' } },
        { user: { name: { contains: query.searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: query.searchTerm, mode: 'insensitive' } } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, drivers] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatarUrl: true, status: true },
          },
          ambulance: true,
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
      data: drivers,
    };
  },

  async updateAvailability(userId: string, isOnDuty: boolean) {
    return await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { userId },
        include: {
          ambulance: {
            include: {
              trips: {
                where: { status: { in: ACTIVE_TRIP_STATUSES } },
              },
            },
          },
        },
      });

      if (!driver || driver.deletedAt) {
        throw new AppError(404, 'Driver profile not found');
      }

      // Going on duty requires an assigned ambulance
      if (isOnDuty) {
        if (!driver.ambulance || driver.ambulance.deletedAt) {
          throw new AppError(400, 'Cannot go on duty without an assigned ambulance');
        }

        await tx.ambulance.update({
          where: { id: driver.ambulance.id },
          data: { status: AmbulanceStatus.AVAILABLE },
        });
      } else {
        // Going off duty: blocked if ambulance is ON_TRIP
        if (driver.ambulance) {
          if (
            driver.ambulance.status === AmbulanceStatus.ON_TRIP ||
            driver.ambulance.trips.length > 0
          ) {
            throw new AppError(400, 'Cannot go off duty while on an active emergency trip');
          }

          await tx.ambulance.update({
            where: { id: driver.ambulance.id },
            data: { status: AmbulanceStatus.OFFLINE },
          });
        }
      }

      const updatedDriver = await tx.driver.update({
        where: { id: driver.id },
        data: { isOnDuty },
        include: {
          ambulance: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      return updatedDriver;
    });
  },

  async updateLocation(userId: string, coords: { lat: number; lng: number }) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { ambulance: true },
    });

    if (!driver || driver.deletedAt) {
      throw new AppError(404, 'Driver profile not found');
    }

    if (!driver.ambulance || driver.ambulance.deletedAt) {
      throw new AppError(400, 'No ambulance assigned to update location for');
    }

    const updatedAmbulance = await prisma.ambulance.update({
      where: { id: driver.ambulance.id },
      data: {
        lat: coords.lat,
        lng: coords.lng,
        locationUpdatedAt: new Date(),
      },
    });

    return updatedAmbulance;
  },

  async getMyTrips(userId: string, query: { page?: number; limit?: number; status?: TripStatus }) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { ambulance: true },
    });

    if (!driver || driver.deletedAt) {
      throw new AppError(404, 'Driver profile not found');
    }

    if (!driver.ambulance) {
      return {
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        data: [],
      };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {
      ambulanceId: driver.ambulance.id,
    };
    if (query.status) {
      where.status = query.status;
    }

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dispatchedAt: 'desc' },
        include: {
          request: true,
          hospital: true,
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

  async getCurrentTrip(userId: string) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { ambulance: true },
    });

    if (!driver || !driver.ambulance) {
      return null;
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        ambulanceId: driver.ambulance.id,
        status: { in: ACTIVE_TRIP_STATUSES },
      },
      include: {
        request: true,
        hospital: true,
      },
    });

    return activeTrip;
  },
};
