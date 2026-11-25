import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const AdminValidation = {
  getUsersQuery: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    includeDeleted: z.enum(['true', 'false']).optional(),
    searchTerm: z.string().optional(),
  }),

  updateRoleBody: z.object({
    role: z.nativeEnum(Role, {
      required_error: 'Role is required',
      invalid_type_error: 'Role must be PATIENT, DRIVER, or ADMIN',
    }),
  }),

  updateStatusBody: z.object({
    status: z.nativeEnum(UserStatus, {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be ACTIVE or SUSPENDED',
    }),
  }),

  getIncidentsReportQuery: z.object({
    from: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    to: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    groupBy: z.enum(['day', 'priority', 'emergencyType', 'hospital']).optional(),
  }),

  getAuditLogsQuery: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    actorId: z.string().uuid().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    entityId: z.string().optional(),
    from: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    to: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
  }),
};
