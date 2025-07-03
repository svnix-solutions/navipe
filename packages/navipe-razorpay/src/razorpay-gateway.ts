// Razorpay Payment Gateway Implementation

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { BasePaymentGateway } from "./base-gateway";
import { 
  PaymentRequest, 
  PaymentResponse, 
  RefundRequest, 
  RefundResponse,
  WebhookVerificationRequest,
  WebhookEvent,
  GatewayConfig,
  StandardErrorCodes
} from "@navipe/interfaces";

export class RazorpayGateway extends BasePaymentGateway {
  getGatewayCode(): string {
    return 'razorpay';
  }

  getSupportedMethods(): string[] {
    return ['card', 'upi', 'wallet', 'bank_transfer'];
  }

  getSupportedCurrencies(): string[] {
    return ['INR'];
  }

  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['key_id', 'key_secret']);
    
    const razorpay = new Razorpay({
      key_id: config.credentials.key_id,
      key_secret: config.credentials.key_secret,
    });

    const startTime = Date.now();

    try {
      const orderOptions = {
        amount: this.formatAmount(request.amount, request.currency), // Razorpay uses paise
        currency: request.currency,
        receipt: request.merchant_reference,
        notes: {
          customer_email: request.customer_email || '',
          customer_phone: request.customer_phone || '',
          ...request.metadata
        }
      };

      const order = await razorpay.orders.create(orderOptions);
      const processingTime = Date.now() - startTime;

      return this.mapRazorpayOrder(request.merchant_reference, order, processingTime);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return this.createErrorResponse(
        request.merchant_reference,
        this.mapRazorpayError(error),
        error,
        processingTime
      );
    }
  }

  async processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse> {
    this.validateConfig(config, ['key_id', 'key_secret']);

    const razorpay = new Razorpay({
      key_id: config.credentials.key_id,
      key_secret: config.credentials.key_secret,
    });

    try {
      const refundOptions = {
        amount: request.amount ? this.formatAmount(request.amount, 'INR') : undefined,
        notes: {
          reason: request.reason || 'Customer request',
          ...request.metadata
        }
      };

      const refund = await razorpay.payments.refund(request.original_transaction_id, refundOptions);

      return {
        success: true,
        refund_id: refund.id,
        gateway_refund_id: refund.id,
        refunded_amount: refund.amount / 100, // Convert from paise
        status: refund.status === 'processed' ? 'success' : 'pending',
        gateway_response: refund
      };
    } catch (error) {
      return {
        success: false,
        refund_id: '',
        gateway_refund_id: '',
        refunded_amount: 0,
        status: 'failed',
        error_message: this.mapRazorpayError(error),
        gateway_response: error
      };
    }
  }

  async checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['key_id', 'key_secret']);

    const razorpay = new Razorpay({
      key_id: config.credentials.key_id,
      key_secret: config.credentials.key_secret,
    });

    try {
      const payment = await razorpay.payments.fetch(gatewayTransactionId);
      return this.mapRazorpayPayment(payment.notes?.receipt, payment);
    } catch (error) {
      return this.createErrorResponse(
        gatewayTransactionId,
        this.mapRazorpayError(error)
      );
    }
  }

  async verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean> {
    const signature = request.headers['x-razorpay-signature'] || request.signature;
    const webhookSecret = config.webhook_secret;

    if (!signature || !webhookSecret) {
      return false;
    }

    try {
      // Razorpay signature verification
      const expectedSignature = this.computeRazorpaySignature(request.body, webhookSecret);
      return signature === expectedSignature;
    } catch (error) {
      console.error('Razorpay webhook verification failed:', error);
      return false;
    }
  }

  async parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent> {
    const payload = JSON.parse(request.body);
    
    return {
      event_type: this.mapRazorpayEventType(payload.event),
      transaction_id: payload.payload?.payment?.entity?.id || payload.payload?.order?.entity?.id,
      data: payload,
      timestamp: new Date(payload.created_at * 1000).toISOString()
    };
  }

  isTransactionIdValid(transactionId: string): boolean {
    return transactionId && (transactionId.startsWith('pay_') || transactionId.startsWith('order_'));
  }

  // Razorpay-specific helper methods
  private mapRazorpayOrder(merchantReference: string, order: any, processingTime?: number): PaymentResponse {
    // Razorpay orders are created first, then payments are made against them
    return this.createPendingResponse(
      merchantReference,
      order.id,
      undefined, // No redirect URL for orders
      order,
      processingTime
    );
  }

  private mapRazorpayPayment(merchantReference: string, payment: any, processingTime?: number): PaymentResponse {
    const status = this.mapRazorpayStatus(payment.status);
    
    if (status === 'success') {
      return this.createSuccessResponse(
        merchantReference,
        payment.id,
        payment,
        processingTime
      );
    } else if (status === 'pending') {
      return this.createPendingResponse(
        merchantReference,
        payment.id,
        undefined,
        payment,
        processingTime
      );
    } else {
      return this.createErrorResponse(
        merchantReference,
        payment.error_description || 'Payment failed',
        payment,
        processingTime
      );
    }
  }

  private mapRazorpayStatus(razorpayStatus: string): string {
    const statusMap = {
      'captured': 'success',
      'authorized': 'pending',
      'created': 'pending',
      'failed': 'failed',
      'refunded': 'success' // Handled separately for refunds
    };
    return statusMap[razorpayStatus] || 'failed';
  }

  private mapRazorpayEventType(razorpayEventType: string): string {
    const eventMap = {
      'payment.captured': 'payment.success',
      'payment.failed': 'payment.failed',
      'payment.authorized': 'payment.processing',
      'refund.processed': 'refund.processed',
      'dispute.created': 'dispute.created'
    };
    return eventMap[razorpayEventType] || razorpayEventType;
  }

  private computeRazorpaySignature(payload: string, secret: string): string {
    // Razorpay uses HMAC-SHA256 for webhook signature verification
    return crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  formatAmount(amount: number, currency: string): number {
    // Razorpay uses paise for INR (smallest unit)
    return Math.round(amount * 100);
  }

  private mapRazorpayError(error: any): string {
    if (error.error && error.error.code) {
      return this.mapErrorCode(error.error.code);
    }
    return this.mapErrorCode(error.message || 'Unknown error');
  }

  mapErrorCode(gatewayErrorCode: string): string {
    const razorpayErrorMap = {
      'BAD_REQUEST_ERROR': StandardErrorCodes.INVALID_REQUEST,
      'GATEWAY_ERROR': StandardErrorCodes.GATEWAY_ERROR,
      'INVALID_REQUEST': StandardErrorCodes.INVALID_REQUEST,
      'SERVER_ERROR': StandardErrorCodes.PROCESSING_ERROR,
      'payment_failed': StandardErrorCodes.PROCESSING_ERROR,
      'amount_exceeded': StandardErrorCodes.INVALID_REQUEST
    };
    return razorpayErrorMap[gatewayErrorCode] || super.mapErrorCode(gatewayErrorCode);
  }
}