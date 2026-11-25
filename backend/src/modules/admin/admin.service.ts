import { Role, UserStatus, AmbulanceStatus, TripStatus, RequestStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { createAuditLog } from '../../utils/audit';
import { QueryBuilder } from '../../utils/QueryBuilder';

export class AdminService {
  static async getUsers(query: Record<string, any>) {
    const qb = new QueryBuilder(query, ['name', 'email', 'phone']);
    const { skip, take, page, limit } = qb.getPagination();
    const sort = qb.getSort();

    const where: Record<string, any> = {};

    if (query.includeDeleted !== 'true') {
      where.deletedAt = null;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.searchTerm) {
      where.OR = [
        { name: { contains: query.searchTerm, mode: 'insensitive' } },
        { email: { contains: query.searchTerm, mode: 'insensitive' } },
        { phone: { contains: query.searchTerm, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: sort,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          provider: true,
          avatarUrl: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          driver: {
            select: {
              id: true,
              licenseNumber: true,
              isOnDuty: true,
              ambulance: {
                select: {
                  id: true,
                  plateNumber: true,
                  status: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: users,
    };
  }

  static async updateUserRole(adminId: string, targetUserId: string, newRole: Role, ip?: string) {
    if (adminId === targetUserId) {
      throw new AppError(400, 'Admins cannot change their own role');
    }

    if (newRole === Role.DRIVER) {
      throw new AppError(400, 'Changing role to DRIVER is not allowed directly. Use register-driver endpoint');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        driver: {
          include: {
            ambulance: {
              include: {
                trips: {
                  where: {
                    status: {
                      notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    if (targetUser.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const remainingAdmins = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          deletedAt: null,
          status: UserStatus.ACTIVE,
        },
      });

      if (remainingAdmins <= 1) {
        throw new AppError(400, 'Cannot demote the last remaining active admin');
      }
    }

    if (targetUser.role === Role.DRIVER && (newRole as Role) !== Role.DRIVER) {
      if (targetUser.driver) {
        if (targetUser.driver.ambulance) {
          const activeTrips = targetUser.driver.ambulance.trips;
          if (activeTrips && activeTrips.length > 0) {
            throw new AppError(400, 'Cannot change driver role while ambulance has an active trip');
          }
          throw new AppError(400, 'Cannot change driver role while driver is assigned to an ambulance. Unassign ambulance first');
        }
      }
    }

    const oldRole = targetUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorId: adminId,
      action: 'ROLE_CHANGED',
      entity: 'User',
      entityId: targetUserId,
      metadata: {
        oldRole,
        newRole,
        userEmail: targetUser.email,
      },
      ip,
    });

    return updatedUser;
  }

  static async updateUserStatus(adminId: string, targetUserId: string, newStatus: UserStatus, ip?: string) {
    if (adminId === targetUserId) {
      throw new AppError(400, 'Admins cannot suspend themselves');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        driver: {
          include: {
            ambulance: {
              include: {
                trips: {
                  where: {
                    status: {
                      notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    if (newStatus === UserStatus.SUSPENDED && targetUser.role === Role.DRIVER && targetUser.driver) {
      const activeTrips = targetUser.driver.ambulance?.trips;
      if (activeTrips && activeTrips.length > 0) {
        throw new AppError(400, 'Cannot suspend a driver who is currently on an active trip');
      }
    }

    const oldStatus = targetUser.status;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: newStatus,
          refreshTokenHash: newStatus === UserStatus.SUSPENDED ? null : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      if (newStatus === UserStatus.SUSPENDED && targetUser.role === Role.DRIVER && targetUser.driver) {
        await tx.driver.update({
          where: { id: targetUser.driver.id },
          data: { isOnDuty: false },
        });

        if (targetUser.driver.ambulance) {
          await tx.ambulance.update({
            where: { id: targetUser.driver.ambulance.id },
            data: { status: AmbulanceStatus.OFFLINE },
          });
        }
      }

      return user;
    });

    await createAuditLog({
      actorId: adminId,
      action: newStatus === UserStatus.SUSPENDED ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      entity: 'User',
      entityId: targetUserId,
      metadata: {
        oldStatus,
        newStatus,
        userEmail: targetUser.email,
      },
      ip,
    });

    return updatedUser;
  }

  static async getDashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      usersTotal,
      usersByRole,
      ambulancesTotal,
      ambulancesByStatus,
      hospitalsTotal,
      hospitalsWithEmergency,
      hospitalsBedsAggregate,
      requestsTotal,
      requestsToday,
      requestsByStatus,
      requestsByPriority,
      pendingQueueSize,
      tripsActiveNow,
      tripsCompletedToday,
      tripsCompletedTotal,
      revenuePaid,
      revenuePending,
      responseTimesRaw,
      tripDurationsRaw,
    ] = await Promise.all([
      // Users
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { deletedAt: null },
      }),

      // Ambulances
      prisma.ambulance.count({ where: { deletedAt: null } }),
      prisma.ambulance.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),

      // Hospitals
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.hospital.count({ where: { deletedAt: null, hasEmergency: true } }),
      prisma.hospital.aggregate({
        where: { deletedAt: null },
        _sum: { availableBeds: true, totalBeds: true },
      }),

      // Requests
      prisma.emergencyRequest.count({ where: { deletedAt: null } }),
      prisma.emergencyRequest.count({
        where: { deletedAt: null, createdAt: { gte: todayStart } },
      }),
      prisma.emergencyRequest.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.emergencyRequest.groupBy({
        by: ['priority'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.emergencyRequest.count({
        where: { deletedAt: null, status: RequestStatus.PENDING },
      }),

      // Trips
      prisma.trip.count({
        where: {
          status: {
            notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED],
          },
        },
      }),
      prisma.trip.count({
        where: {
          status: TripStatus.COMPLETED,
          completedAt: { gte: todayStart },
        },
      }),
      prisma.trip.count({
        where: { status: TripStatus.COMPLETED },
      }),

      // Revenue
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),

      // Performance Raw SQL for response time (dispatchedAt - EmergencyRequest.createdAt)
      prisma.$queryRawUnsafe<Array<{ avg_response_seconds: number | null }>>(`
        SELECT AVG(EXTRACT(EPOCH FROM (t."dispatchedAt" - r."createdAt"))) AS avg_response_seconds
        FROM ambulance."Trip" t
        JOIN ambulance."EmergencyRequest" r ON t."requestId" = r."id"
        WHERE r."deletedAt" IS NULL
      `),

      // Performance Raw SQL for trip duration (completedAt - dispatchedAt)
      prisma.$queryRawUnsafe<Array<{ avg_duration_seconds: number | null }>>(`
        SELECT AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."dispatchedAt"))) AS avg_duration_seconds
        FROM ambulance."Trip" t
        WHERE t."status" = 'COMPLETED' AND t."completedAt" IS NOT NULL
      `),
    ]);

    const avgResponseSec = responseTimesRaw[0]?.avg_response_seconds || 0;
    const avgResponseMinutes = Number((Number(avgResponseSec) / 60).toFixed(2));

    const avgDurationSec = tripDurationsRaw[0]?.avg_duration_seconds || 0;
    const avgDurationMinutes = Number((Number(avgDurationSec) / 60).toFixed(2));

    return {
      users: {
        total: usersTotal,
        byRole: usersByRole.reduce((acc, curr) => {
          acc[curr.role] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      ambulances: {
        total: ambulancesTotal,
        byStatus: ambulancesByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      hospitals: {
        total: hospitalsTotal,
        withEmergency: hospitalsWithEmergency,
        totalAvailableBeds: hospitalsBedsAggregate._sum.availableBeds || 0,
        totalBeds: hospitalsBedsAggregate._sum.totalBeds || 0,
      },
      requests: {
        total: requestsTotal,
        today: requestsToday,
        pendingQueueSize,
        byStatus: requestsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        byPriority: requestsByPriority.reduce((acc, curr) => {
          acc[curr.priority] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      trips: {
        activeNow: tripsActiveNow,
        completedToday: tripsCompletedToday,
        completedTotal: tripsCompletedTotal,
      },
      performance: {
        averageResponseTimeMinutes: avgResponseMinutes,
        averageTripDurationMinutes: avgDurationMinutes,
      },
      revenue: {
        totalPaid: Number(revenuePaid._sum.amount || 0),
        pendingAmount: Number(revenuePending._sum.amount || 0),
      },
    };
  }

  static async getIncidentsReport(query: { from?: string; to?: string; groupBy?: string }) {
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groupBy = query.groupBy || 'day';

    // Summary queries
    const [totalRequests, completed, cancelled, responseTimeByPriorityRaw, topHospitalsRaw] =
      await Promise.all([
        prisma.emergencyRequest.count({
          where: {
            deletedAt: null,
            createdAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.emergencyRequest.count({
          where: {
            deletedAt: null,
            status: RequestStatus.COMPLETED,
            createdAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.emergencyRequest.count({
          where: {
            deletedAt: null,
            status: RequestStatus.CANCELLED,
            createdAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.$queryRawUnsafe<Array<{ priority: string; avg_response_seconds: number | null }>>(`
          SELECT r."priority"::text AS priority,
                 AVG(EXTRACT(EPOCH FROM (t."dispatchedAt" - r."createdAt"))) AS avg_response_seconds
          FROM ambulance."Trip" t
          JOIN ambulance."EmergencyRequest" r ON t."requestId" = r."id"
          WHERE r."deletedAt" IS NULL
            AND r."createdAt" >= $1 AND r."createdAt" <= $2
          GROUP BY r."priority"
        `, fromDate, toDate),
        prisma.$queryRawUnsafe<Array<{ hospital_id: string; hospital_name: string; trip_count: number }>>(`
          SELECT h."id" AS hospital_id, h."name" AS hospital_name, COUNT(t."id")::int AS trip_count
          FROM ambulance."Trip" t
          JOIN ambulance."Hospital" h ON t."hospitalId" = h."id"
          WHERE t."dispatchedAt" >= $1 AND t."dispatchedAt" <= $2
          GROUP BY h."id", h."name"
          ORDER BY trip_count DESC
          LIMIT 5
        `, fromDate, toDate),
      ]);

    const cancellationRate = totalRequests > 0 ? Number(((cancelled / totalRequests) * 100).toFixed(2)) : 0;

    const avgResponseTimeByPriority = responseTimeByPriorityRaw.reduce((acc, curr) => {
      acc[curr.priority] = Number(((Number(curr.avg_response_seconds || 0)) / 60).toFixed(2));
      return acc;
    }, {} as Record<string, number>);

    // Grouped counts
    let groupedCounts: any[] = [];

    if (groupBy === 'day') {
      groupedCounts = await prisma.$queryRawUnsafe<Array<{ date: string; count: number }>>(`
        SELECT TO_CHAR(r."createdAt", 'YYYY-MM-DD') AS date, COUNT(r."id")::int AS count
        FROM ambulance."EmergencyRequest" r
        WHERE r."deletedAt" IS NULL
          AND r."createdAt" >= $1 AND r."createdAt" <= $2
        GROUP BY TO_CHAR(r."createdAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `, fromDate, toDate);
    } else if (groupBy === 'priority') {
      const res = await prisma.emergencyRequest.groupBy({
        by: ['priority'],
        _count: { id: true },
        where: {
          deletedAt: null,
          createdAt: { gte: fromDate, lte: toDate },
        },
      });
      groupedCounts = res.map((r) => ({ priority: r.priority, count: r._count.id }));
    } else if (groupBy === 'emergencyType') {
      const res = await prisma.emergencyRequest.groupBy({
        by: ['emergencyType'],
        _count: { id: true },
        where: {
          deletedAt: null,
          createdAt: { gte: fromDate, lte: toDate },
        },
      });
      groupedCounts = res.map((r) => ({ emergencyType: r.emergencyType, count: r._count.id }));
    } else if (groupBy === 'hospital') {
      groupedCounts = await prisma.$queryRawUnsafe<Array<{ hospital_id: string; hospital_name: string; count: number }>>(`
        SELECT h."id" AS hospital_id, h."name" AS hospital_name, COUNT(t."id")::int AS count
        FROM ambulance."Trip" t
        JOIN ambulance."Hospital" h ON t."hospitalId" = h."id"
        WHERE t."dispatchedAt" >= $1 AND t."dispatchedAt" <= $2
        GROUP BY h."id", h."name"
        ORDER BY count DESC
      `, fromDate, toDate);
    }

    return {
      timeRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      groupBy,
      summary: {
        totalRequests,
        completed,
        cancelled,
        cancellationRate,
        averageResponseTimeByPriorityMinutes: avgResponseTimeByPriority,
        topHospitals: topHospitalsRaw.map((h) => ({
          hospitalId: h.hospital_id,
          hospitalName: h.hospital_name,
          tripCount: Number(h.trip_count),
        })),
      },
      groupedCounts,
    };
  }

  static async getAuditLogs(query: Record<string, any>) {
    const qb = new QueryBuilder(query);
    const { skip, take, page, limit } = qb.getPagination();

    const where: Record<string, any> = {};

    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Manually join actor details
    const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter(Boolean))) as string[];
    const actors = actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const logsWithActor = logs.map((log) => {
      const actor = log.actorId ? actorMap.get(log.actorId) || null : null;
      return {
        ...log,
        actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : null,
      };
    });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: logsWithActor,
    };
  }
}
