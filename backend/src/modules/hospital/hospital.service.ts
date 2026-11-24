import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { calculateHaversineDistance } from '../../utils/haversine';
import { uploadBuffer, deleteByUrl } from '../../utils/cloudinaryUpload';
import { TripStatus } from '@prisma/client';

const ACTIVE_TRIP_STATUSES = [
  TripStatus.DISPATCHED,
  TripStatus.EN_ROUTE,
  TripStatus.ARRIVED_AT_PICKUP,
  TripStatus.PICKED_UP,
  TripStatus.EN_ROUTE_TO_HOSPITAL,
  TripStatus.ARRIVED_AT_HOSPITAL,
];

export const HospitalService = {
  async createHospital(
    payload: {
      name: string;
      address: string;
      city: string;
      lat: number;
      lng: number;
      phone: string;
      specialties: string[];
      totalBeds: number;
      availableBeds: number;
      hasEmergency?: boolean;
    },
    imageBuffer?: Buffer,
  ) {
    let imageUrl: string | undefined;
    if (imageBuffer) {
      const uploadRes = await uploadBuffer(imageBuffer, 'hospitals');
      imageUrl = uploadRes.secure_url;
    }

    const hospital = await prisma.hospital.create({
      data: {
        name: payload.name,
        address: payload.address,
        city: payload.city,
        lat: payload.lat,
        lng: payload.lng,
        phone: payload.phone,
        specialties: payload.specialties,
        totalBeds: payload.totalBeds,
        availableBeds: payload.availableBeds,
        hasEmergency: payload.hasEmergency ?? true,
        imageUrl,
      },
    });

    return hospital;
  },

  async getAllHospitals(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.hasEmergency !== undefined) {
      where.hasEmergency = query.hasEmergency === 'true';
    }

    if (query.specialty) {
      where.specialties = { has: query.specialty };
    }

    if (query.searchTerm) {
      where.OR = [
        { name: { contains: query.searchTerm, mode: 'insensitive' } },
        { address: { contains: query.searchTerm, mode: 'insensitive' } },
        { city: { contains: query.searchTerm, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, hospitals] = await Promise.all([
      prisma.hospital.count({ where }),
      prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: hospitals,
    };
  },

  async getNearbyHospitals(query: { lat: number; lng: number; specialty?: string; radiusKm?: number }) {
    const radius = query.radiusKm || 20;

    const where: any = {
      deletedAt: null,
      hasEmergency: true,
      availableBeds: { gt: 0 },
    };

    if (query.specialty) {
      where.specialties = { has: query.specialty };
    }

    const hospitals = await prisma.hospital.findMany({
      where,
    });

    const nearbyHospitals = hospitals
      .map((hosp) => {
        const distanceKm = calculateHaversineDistance(query.lat, query.lng, hosp.lat, hosp.lng);
        return {
          ...hosp,
          distanceKm,
        };
      })
      .filter((hosp) => hosp.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return nearbyHospitals;
  },

  async getHospitalById(id: string) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
    });

    if (!hospital || hospital.deletedAt) {
      throw new AppError(404, 'Hospital not found');
    }

    return hospital;
  },

  async updateHospital(
    id: string,
    payload: {
      name?: string;
      address?: string;
      city?: string;
      lat?: number;
      lng?: number;
      phone?: string;
      specialties?: string[];
      totalBeds?: number;
      availableBeds?: number;
      hasEmergency?: boolean;
    },
    imageBuffer?: Buffer,
  ) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
    });

    if (!hospital || hospital.deletedAt) {
      throw new AppError(404, 'Hospital not found');
    }

    // Verify bed counts
    const finalTotalBeds = payload.totalBeds !== undefined ? payload.totalBeds : hospital.totalBeds;
    const finalAvailableBeds = payload.availableBeds !== undefined ? payload.availableBeds : hospital.availableBeds;

    if (finalAvailableBeds > finalTotalBeds) {
      throw new AppError(400, 'Available beds cannot exceed total beds');
    }

    let imageUrl = hospital.imageUrl;
    if (imageBuffer) {
      const uploadRes = await uploadBuffer(imageBuffer, 'hospitals');
      if (hospital.imageUrl) {
        await deleteByUrl(hospital.imageUrl);
      }
      imageUrl = uploadRes.secure_url;
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        ...payload,
        imageUrl,
      },
    });

    return updated;
  },

  async deleteHospital(id: string) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { in: ACTIVE_TRIP_STATUSES } },
        },
      },
    });

    if (!hospital || hospital.deletedAt) {
      throw new AppError(404, 'Hospital not found');
    }

    if (hospital.trips.length > 0) {
      throw new AppError(400, 'Cannot delete a hospital that is assigned to an active emergency trip');
    }

    await prisma.hospital.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
