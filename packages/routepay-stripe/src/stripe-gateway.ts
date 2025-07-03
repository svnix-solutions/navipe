// Stripe Payment Gateway Implementation

import Stripe from 'stripe';
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
} from "@routepay/interfaces";

export class StripeGateway extends BasePaymentGateway {
  getGatewayCode(): string {
    return 'stripe';
  }

  getSupportedMethods(): string[] {
    return ['card', 'bank_transfer', 'wallet'];
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
  }

  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['secret_key']);
    
    const stripe = new Stripe(config.credentials.secret_key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    const startTime = Date.now();

    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: this.formatAmount(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        payment_method_types: this.mapPaymentMethod(request.payment_method),
        metadata: {
          merchant_reference: request.merchant_reference || '',
          customer_email: request.customer_email || '',
          ...request.metadata
        },
        description: `Payment for ${request.merchant_reference || 'Order'}`
      };

      if (request.customer_email) {
        paymentIntentParams.receipt_email = request.customer_email;
      }

      if (request.billing_address) {
        paymentIntentParams.shipping = {
          address: this.mapStripeAddress(request.billing_address),
          name: request.billing_address.name || 'Customer'
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      const processingTime = Date.now() - startTime;

      return this.mapStripePaymentIntent(request.merchant_reference, paymentIntent, processingTime);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return this.createErrorResponse(
        request.merchant_reference,
        this.mapStripeError(error),
        error,
        processingTime
      );
    }
  }

  async processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse> {
    this.validateConfig(config, ['secret_key']);

    const stripe = new Stripe(config.credentials.secret_key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.original_transaction_id,
        reason: this.mapRefundReason(request.reason)
      };

      if (request.amount) {
        refundParams.amount = this.formatAmount(request.amount, 'USD'); // Currency should come from original transaction
      }

      if (request.metadata) {
        refundParams.metadata = request.metadata;
      }

      const refund = await stripe.refunds.create(refundParams);

      return {
        success: true,
        refund_id: refund.id,
        gateway_refund_id: refund.id,
        refunded_amount: refund.amount / 100, // Convert from cents
        status: refund.status === 'succeeded' ? 'success' : 'pending',
        gateway_response: refund
      };
    } catch (error) {
      return {
        success: false,
        refund_id: '',
        gateway_refund_id: '',
        refunded_amount: 0,
        status: 'failed',
        error_message: this.mapStripeError(error)
      };
    }
  }

  async checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['secret_key']);

    const stripe = new Stripe(config.credentials.secret_key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(gatewayTransactionId);
      return this.mapStripePaymentIntent(
        paymentIntent.metadata?.merchant_reference, 
        paymentIntent
      );
    } catch (error) {
      return this.createErrorResponse(
        gatewayTransactionId,
        this.mapStripeError(error)
      );
    }
  }

  async verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean> {
    const signature = request.headers['stripe-signature'] || request.signature;
    const webhookSecret = config.webhook_secret;

    if (!signature || !webhookSecret) {
      return false;
    }

    const stripe = new Stripe(config.credentials.secret_key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    try {
      // Use Stripe SDK for webhook verification - much more reliable!
      const event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret);
      return true; // If no exception thrown, signature is valid
    } catch (error) {
      console.error('Stripe webhook verification failed:', error.message);
      return false;
    }
  }

  async parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent> {
    const stripe = new Stripe(config.credentials.secret_key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    try {
      // Use Stripe SDK to parse webhook event - handles versioning automatically
      const event = stripe.webhooks.constructEvent(
        request.body, 
        request.headers['stripe-signature'] || request.signature, 
        config.webhook_secret
      );
      
      return {
        event_type: this.mapStripeEventType(event.type),
        transaction_id: event.data?.object?.id,
        data: event,
        timestamp: new Date(event.created * 1000).toISOString()
      };
    } catch (error) {
      // Fallback to manual parsing if SDK fails
      const payload = JSON.parse(request.body);
      return {
        event_type: this.mapStripeEventType(payload.type),
        transaction_id: payload.data?.object?.id,
        data: payload,
        timestamp: new Date(payload.created * 1000).toISOString()
      };
    }
  }

  isTransactionIdValid(transactionId: string): boolean {
    return transactionId && transactionId.startsWith('pi_');
  }

  // Stripe-specific helper methods
  private mapPaymentMethod(method: string): Stripe.PaymentIntentCreateParams.PaymentMethodType[] {
    const methodMap: Record<string, Stripe.PaymentIntentCreateParams.PaymentMethodType[]> = {
      'card': ['card'],
      'bank_transfer': ['us_bank_account'],
      'wallet': ['card'] // Apple Pay, Google Pay through card
    };
    return methodMap[method] || ['card'];
  }

  private mapStripePaymentIntent(
    merchantReference: string, 
    paymentIntent: Stripe.PaymentIntent, 
    processingTime?: number
  ): PaymentResponse {
    const status = this.mapStripeStatus(paymentIntent.status);
    
    if (status === 'success') {
      return this.createSuccessResponse(
        merchantReference,
        paymentIntent.id,
        paymentIntent,
        processingTime
      );
    } else if (status === 'pending') {
      return this.createPendingResponse(
        merchantReference,
        paymentIntent.id,
        paymentIntent.next_action?.redirect_to_url?.url,
        paymentIntent,
        processingTime
      );
    } else {
      return this.createErrorResponse(
        merchantReference,
        paymentIntent.last_payment_error?.message || 'Payment failed',
        paymentIntent,
        processingTime
      );
    }
  }

  private mapStripeAddress(address: any): Stripe.AddressParam {
    return {
      line1: address.line1 || '',
      line2: address.line2,
      city: address.city || '',
      state: address.state,
      postal_code: address.postal_code || '',
      country: address.country || 'US'
    };
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason {
    const reasonMap: Record<string, Stripe.RefundCreateParams.Reason> = {
      'duplicate': 'duplicate',
      'fraudulent': 'fraudulent',
      'customer_request': 'requested_by_customer'
    };
    return reasonMap[reason || 'customer_request'] || 'requested_by_customer';
  }

  private mapStripeStatus(stripeStatus: string): string {
    const statusMap = {
      'succeeded': 'success',
      'processing': 'processing',
      'requires_payment_method': 'failed',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'canceled': 'failed'
    };
    return statusMap[stripeStatus] || 'failed';
  }

  private mapStripeEventType(stripeEventType: string): string {
    const eventMap = {
      'payment_intent.succeeded': 'payment.success',
      'payment_intent.payment_failed': 'payment.failed',
      'payment_intent.processing': 'payment.processing',
      'charge.dispute.created': 'dispute.created'
    };
    return eventMap[stripeEventType] || stripeEventType;
  }

  private mapStripeError(error: any): string {
    if (error.type === 'StripeCardError') {
      // Card was declined
      return this.mapErrorCode(error.decline_code || error.code);
    } else if (error.type === 'StripeRateLimitError') {
      return StandardErrorCodes.RATE_LIMITED;
    } else if (error.type === 'StripeInvalidRequestError') {
      return StandardErrorCodes.INVALID_REQUEST;
    } else if (error.type === 'StripeAPIError') {
      return StandardErrorCodes.PROCESSING_ERROR;
    } else if (error.type === 'StripeConnectionError') {
      return StandardErrorCodes.NETWORK_ERROR;
    } else if (error.type === 'StripeAuthenticationError') {
      return StandardErrorCodes.AUTHENTICATION_ERROR;
    }
    
    return this.mapErrorCode(error.code || error.message);
  }

  mapErrorCode(gatewayErrorCode: string): string {
    const stripeErrorMap = {
      'card_declined': StandardErrorCodes.CARD_DECLINED,
      'insufficient_funds': StandardErrorCodes.INSUFFICIENT_FUNDS,
      'lost_card': StandardErrorCodes.CARD_DECLINED,
      'stolen_card': StandardErrorCodes.CARD_DECLINED,
      'expired_card': StandardErrorCodes.EXPIRED_CARD,
      'incorrect_cvc': StandardErrorCodes.INVALID_CVC,
      'processing_error': StandardErrorCodes.PROCESSING_ERROR,
      'rate_limit': StandardErrorCodes.RATE_LIMITED
    };
    return stripeErrorMap[gatewayErrorCode] || super.mapErrorCode(gatewayErrorCode);
  }
}