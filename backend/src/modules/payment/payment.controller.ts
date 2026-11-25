import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import { sslcommerzConfig } from '../../config/sslcommerz';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

export class PaymentController {
  static initiate = catchAsync(async (req: Request, res: Response) => {
    const patientId = req.user!.id;
    const { tripId } = req.body;
    const ip = req.ip;

    const result = await PaymentService.initiatePayment(patientId, tripId, ip);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment initiated successfully',
      data: result,
    });
  });

  static handleSuccess = catchAsync(async (req: Request, res: Response) => {
    const tranId = req.body.tran_id || req.query.tran_id;
    const valId = req.body.val_id || req.query.val_id;

    if (!tranId) {
      res.status(400).send('<h3>Invalid payment response: Missing tran_id</h3>');
      return;
    }

    const verification = await PaymentService.verifyAndSettlePayment(tranId, valId, req.body);

    if (sslcommerzConfig.clientSuccessUrl) {
      res.redirect(`${sslcommerzConfig.clientSuccessUrl}?tranId=${tranId}&status=${verification.success ? 'success' : 'failed'}`);
      return;
    }

    if (verification.success) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Payment Successful</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #2e7d32;">Payment Successful</h1>
            <p>Thank you. Your ambulance service fare has been settled.</p>
            <p><strong>Transaction ID:</strong> ${tranId}</p>
            <p><strong>Amount:</strong> BDT ${verification.payment ? Number(verification.payment.amount) : ''}</p>
          </body>
        </html>
      `);
    } else {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Payment Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #c62828;">Payment Verification Failed</h1>
            <p>${verification.reason || 'We could not verify your payment with SSLCommerz.'}</p>
            <p><strong>Transaction ID:</strong> ${tranId}</p>
          </body>
        </html>
      `);
    }
  });

  static handleFail = catchAsync(async (req: Request, res: Response) => {
    const tranId = req.body.tran_id || req.query.tran_id;

    if (tranId) {
      await PaymentService.markPaymentFailedOrCancelled(tranId, PaymentStatus.FAILED);
    }

    if (sslcommerzConfig.clientFailUrl) {
      res.redirect(`${sslcommerzConfig.clientFailUrl}?tranId=${tranId}&status=failed`);
      return;
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Payment Failed</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
          <h1 style="color: #c62828;">Payment Failed</h1>
          <p>The transaction could not be completed.</p>
          <p><strong>Transaction ID:</strong> ${tranId || 'N/A'}</p>
        </body>
      </html>
    `);
  });

  static handleCancel = catchAsync(async (req: Request, res: Response) => {
    const tranId = req.body.tran_id || req.query.tran_id;

    if (tranId) {
      await PaymentService.markPaymentFailedOrCancelled(tranId, PaymentStatus.CANCELLED);
    }

    if (sslcommerzConfig.clientCancelUrl) {
      res.redirect(`${sslcommerzConfig.clientCancelUrl}?tranId=${tranId}&status=cancelled`);
      return;
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Payment Cancelled</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
          <h1 style="color: #ef6c00;">Payment Cancelled</h1>
          <p>You have cancelled the payment process.</p>
          <p><strong>Transaction ID:</strong> ${tranId || 'N/A'}</p>
        </body>
      </html>
    `);
  });

  static handleIPN = catchAsync(async (req: Request, res: Response) => {
    const tranId = req.body.tran_id || req.query.tran_id;
    const valId = req.body.val_id || req.query.val_id;

    if (!tranId) {
      res.status(200).json({ received: true, error: 'Missing tran_id' });
      return;
    }

    await PaymentService.verifyAndSettlePayment(tranId, valId, req.body);
    res.status(200).json({ received: true });
  });

  static getMyPayments = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await PaymentService.getMyPayments(userId, req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'My payments fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  });

  static getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.getAllPayments(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All payments fetched successfully',
      meta: result.meta,
      data: result.data,
    });
  });

  static getPaymentById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = { id: req.user!.id, role: req.user!.role };
    const result = await PaymentService.getPaymentById(id, user);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment fetched successfully',
      data: result,
    });
  });
}
