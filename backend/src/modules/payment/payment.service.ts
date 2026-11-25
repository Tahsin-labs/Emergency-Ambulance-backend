import { PaymentStatus, Role, TripStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { sslcommerzConfig } from '../../config/sslcommerz';
import { AppError } from '../../utils/AppError';
import { createAuditLog } from '../../utils/audit';
import { createNotification } from '../../utils/notification';
import { QueryBuilder } from '../../utils/QueryBuilder';

export class PaymentService {
  static async initiatePayment(patientId: string, tripId: string, ip?: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        request: {
          include: { patient: true },
        },
        ambulance: true,
        payment: true,
      },
    });

    if (!trip) {
      throw new AppError(404, 'Trip not found');
    }

    if (trip.request.patientId !== patientId) {
      throw new AppError(403, 'Forbidden: You do not own this trip');
    }

    if (trip.status !== TripStatus.COMPLETED) {
      throw new AppError(400, 'Trip is not completed yet. Payment can only be initiated for completed trips');
    }

    // Check existing payment
    let payment = trip.payment;

    if (payment && payment.status === PaymentStatus.PAID) {
      throw new AppError(409, 'Payment for this trip has already been completed');
    }

    const fare = trip.fare || trip.ambulance.baseFare;
    const tranId = `TRAN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          tripId: trip.id,
          userId: patientId,
          amount: fare,
          currency: 'BDT',
          status: PaymentStatus.PENDING,
          tranId,
        },
      });
    } else {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          tranId,
          status: PaymentStatus.PENDING,
          amount: fare,
        },
      });
    }

    // Prepare SSLCommerz parameters
    const postData = new URLSearchParams({
      store_id: sslcommerzConfig.storeId,
      store_passwd: sslcommerzConfig.storePassword,
      total_amount: Number(payment.amount).toFixed(2),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${sslcommerzConfig.backendUrl}/api/v1/payments/success`,
      fail_url: `${sslcommerzConfig.backendUrl}/api/v1/payments/fail`,
      cancel_url: `${sslcommerzConfig.backendUrl}/api/v1/payments/cancel`,
      ipn_url: `${sslcommerzConfig.backendUrl}/api/v1/payments/ipn`,
      cus_name: trip.request.patientName || trip.request.patient.name || 'Emergency Patient',
      cus_email: trip.request.patient.email || 'patient@example.com',
      cus_phone: trip.request.patientPhone || trip.request.patient.phone || '01700000000',
      cus_add1: trip.request.pickupAddress || 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'Ambulance Service Fare',
      product_category: 'Healthcare',
      product_profile: 'general',
    });

    const response = await fetch(sslcommerzConfig.initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString(),
    });

    if (!response.ok) {
      throw new AppError(502, `Payment gateway failed with HTTP ${response.status}`);
    }

    const gatewayData = (await response.json()) as any;

    if (gatewayData.status !== 'SUCCESS' || !gatewayData.GatewayPageURL) {
      throw new AppError(
        502,
        `Payment gateway initiation failed: ${gatewayData.failedreason || gatewayData.message || 'Unknown reason'}`,
      );
    }

    await createAuditLog({
      actorId: patientId,
      action: 'PAYMENT_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: {
        tripId: trip.id,
        tranId,
        amount: Number(payment.amount),
      },
      ip,
    });

    return {
      paymentId: payment.id,
      tranId,
      amount: Number(payment.amount),
      paymentUrl: gatewayData.GatewayPageURL,
    };
  }

  static async verifyAndSettlePayment(tranId: string, valId?: string, rawPayload?: any) {
    const payment = await prisma.payment.findUnique({
      where: { tranId },
      include: {
        trip: {
          include: { request: true },
        },
      },
    });

    if (!payment) {
      return { success: false, reason: 'Payment not found', payment: null };
    }

    if (payment.status === PaymentStatus.PAID) {
      return { success: true, idempotent: true, payment };
    }

    if (!valId) {
      if (payment.status === PaymentStatus.PENDING) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
      return { success: false, reason: 'Missing val_id', payment };
    }

    // Call SSLCommerz validation API
    const validationUrl = new URL(sslcommerzConfig.validationUrl);
    validationUrl.searchParams.append('val_id', valId);
    validationUrl.searchParams.append('store_id', sslcommerzConfig.storeId);
    validationUrl.searchParams.append('store_passwd', sslcommerzConfig.storePassword);
    validationUrl.searchParams.append('format', 'json');

    try {
      const response = await fetch(validationUrl.toString());
      if (!response.ok) {
        throw new Error(`Validation HTTP status ${response.status}`);
      }
      const valData = (await response.json()) as any;

      // Sanitize gateway response: NEVER store passwords or secrets
      const sanitizedResponse: Record<string, any> = { ...valData };
      delete sanitizedResponse.store_passwd;
      delete sanitizedResponse.store_password;
      delete sanitizedResponse.password;

      const isValidStatus = valData.status === 'VALID' || valData.status === 'VALIDATED';
      const isTranMatch = valData.tran_id === tranId;
      const isAmountMatch = Math.abs(Number(valData.amount) - Number(payment.amount)) < 0.01;
      const isCurrencyMatch = valData.currency === payment.currency || (!valData.currency && payment.currency === 'BDT');

      if (isValidStatus && isTranMatch && isAmountMatch && isCurrencyMatch) {
        const updatedPayment = await prisma.$transaction(async (tx) => {
          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              valId,
              paidAt: new Date(),
              gatewayResponse: sanitizedResponse,
            },
          });

          await createNotification(
            tx,
            payment.userId,
            'Payment received',
            `Your payment of BDT ${Number(payment.amount)} for trip has been successfully received.`,
            'PAYMENT_SUCCESS',
          );

          return updated;
        });

        await createAuditLog({
          actorId: payment.userId,
          action: 'PAYMENT_SUCCESS',
          entity: 'Payment',
          entityId: payment.id,
          metadata: {
            tranId,
            valId,
            amount: Number(payment.amount),
          },
        });

        return { success: true, payment: updatedPayment };
      } else {
        if (payment.status === PaymentStatus.PENDING) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              valId,
              gatewayResponse: sanitizedResponse,
            },
          });
        }
        return {
          success: false,
          reason: `Gateway validation mismatch: status=${valData.status}, amount=${valData.amount}`,
          payment,
        };
      }
    } catch (err: any) {
      if (payment.status === PaymentStatus.PENDING) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
      return { success: false, reason: err.message, payment };
    }
  }

  static async markPaymentFailedOrCancelled(tranId: string, newStatus: 'FAILED' | 'CANCELLED') {
    const payment = await prisma.payment.findUnique({
      where: { tranId },
    });

    if (!payment) {
      return null;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return payment;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      await createNotification(
        tx,
        payment.userId,
        newStatus === PaymentStatus.FAILED ? 'Payment failed' : 'Payment cancelled',
        `Your payment attempt with transaction ID ${tranId} was ${newStatus.toLowerCase()}.`,
        newStatus === PaymentStatus.FAILED ? 'PAYMENT_FAILED' : 'PAYMENT_CANCELLED',
      );

      return p;
    });

    await createAuditLog({
      actorId: payment.userId,
      action: newStatus === PaymentStatus.FAILED ? 'PAYMENT_FAILED' : 'PAYMENT_CANCELLED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { tranId, status: newStatus },
    });

    return updated;
  }

  static async getMyPayments(userId: string, query: Record<string, any>) {
    const qb = new QueryBuilder(query);
    const { skip, take, page, limit } = qb.getPagination();

    const where: Record<string, any> = { userId };
    if (query.status) where.status = query.status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: {
            select: {
              id: true,
              status: true,
              distanceKm: true,
              fare: true,
              dispatchedAt: true,
              completedAt: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: payments,
    };
  }

  static async getAllPayments(query: Record<string, any>) {
    const qb = new QueryBuilder(query);
    const { skip, take, page, limit } = qb.getPagination();
    const sort = qb.getSort();

    const where: Record<string, any> = {};
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;
    if (query.searchTerm) {
      where.tranId = { contains: query.searchTerm, mode: 'insensitive' };
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: sort,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          trip: {
            select: { id: true, status: true, fare: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: payments,
    };
  }

  static async getPaymentById(id: string, user: { id: string; role: Role }) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        trip: {
          include: {
            request: {
              select: {
                id: true,
                patientName: true,
                patientPhone: true,
                pickupAddress: true,
                emergencyType: true,
                priority: true,
              },
            },
            ambulance: {
              select: {
                id: true,
                plateNumber: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    if (user.role !== Role.ADMIN && payment.userId !== user.id) {
      throw new AppError(403, 'Forbidden: You do not have access to this payment');
    }

    return payment;
  }
}
