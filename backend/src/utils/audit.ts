import { prisma } from '../config/prisma';

export interface IAuditPayload {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
  ip?: string;
}

export const createAuditLog = async (payload: IAuditPayload): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: payload.actorId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        metadata: payload.metadata || {},
        ip: payload.ip,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
};
