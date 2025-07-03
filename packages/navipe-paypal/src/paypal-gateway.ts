// PayPal Payment Gateway Implementation

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

export class PayPalGateway extends BasePaymentGateway {
  getGatewayCode(): string {
    return 'paypal';
  }

  getSupportedMethods(): string[] {
    return ['card', 'wallet']; // PayPal, credit cards
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
  }

  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['client_id', 'client_secret']);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Get access token
      const accessToken = await this.getAccessToken(config);
      
      // Step 2: Create payment order
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: request.merchant_reference,
          amount: {
            currency_code: request.currency,
            value: request.amount.toFixed(2) // PayPal uses decimal format
          },
          description: `Payment for ${request.merchant_reference}`,
          custom_id: request.merchant_reference
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'NaviPe',
              locale: 'en-US',
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW'
            }
          }
        },
        application_context: {
          return_url: `${config.features?.return_url || 'https://example.com'}/success`,
          cancel_url: `${config.features?.return_url || 'https://example.com'}/cancel`
        }
      };

      const response = await this.makeApiRequest(
        `${this.getApiBaseUrl(config)}/v2/checkout/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId()
          },
          body: JSON.stringify(orderData)
        },
        config
      );

      const processingTime = Date.now() - startTime;
      return this.mapPayPalOrderResponse(request.merchant_reference, response, processingTime);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return this.createErrorResponse(
        request.merchant_reference,
        this.mapPayPalError(error),
        error,
        processingTime
      );
    }
  }

  async processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse> {
    this.validateConfig(config, ['client_id', 'client_secret']);
    
    const accessToken = await this.getAccessToken(config);
    
    const refundData = {
      amount: request.amount ? {
        currency_code: 'USD', // Should come from original transaction
        value: request.amount.toFixed(2)
      } : undefined,
      note_to_payer: request.reason || 'Refund processed'
    };

    try {
      const response = await this.makeApiRequest(
        `${this.getApiBaseUrl(config)}/v2/payments/captures/${request.original_transaction_id}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId()
          },
          body: JSON.stringify(refundData)
        },
        config
      );

      return {
        success: true,
        refund_id: response.data.id,
        gateway_refund_id: response.data.id,
        refunded_amount: parseFloat(response.data.amount.value),
        status: response.data.status === 'COMPLETED' ? 'success' : 'pending',
        gateway_response: response.data
      };
    } catch (error) {
      return {
        success: false,
        refund_id: '',
        gateway_refund_id: '',
        refunded_amount: 0,
        status: 'failed',
        error_message: this.mapPayPalError(error),
        gateway_response: error
      };
    }
  }

  async checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse> {
    this.validateConfig(config, ['client_id', 'client_secret']);
    
    const accessToken = await this.getAccessToken(config);

    try {
      const response = await this.makeApiRequest(
        `${this.getApiBaseUrl(config)}/v2/checkout/orders/${gatewayTransactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        },
        config
      );

      return this.mapPayPalOrderResponse(
        response.data.purchase_units[0]?.custom_id, 
        response
      );
    } catch (error) {
      return this.createErrorResponse(
        gatewayTransactionId,
        this.mapPayPalError(error),
        error
      );
    }
  }

  async verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean> {
    const signature = request.headers['paypal-transmission-sig'];
    const certId = request.headers['paypal-cert-id'];
    const transmissionId = request.headers['paypal-transmission-id'];
    const timestamp = request.headers['paypal-transmission-time'];
    
    if (!signature || !certId || !transmissionId || !timestamp) {
      return false;
    }

    try {
      // PayPal webhook verification (simplified)
      // In production, implement proper certificate verification
      const webhookId = config.features?.webhook_id;
      if (!webhookId) {
        console.warn('PayPal webhook ID not configured');
        return false;
      }

      // Verify webhook using PayPal's verification API
      const accessToken = await this.getAccessToken(config);
      
      const verificationData = {
        transmission_id: transmissionId,
        cert_id: certId,
        auth_algo: request.headers['paypal-auth-algo'],
        transmission_sig: signature,
        transmission_time: timestamp,
        webhook_id: webhookId,
        webhook_event: JSON.parse(request.body)
      };

      const response = await this.makeApiRequest(
        `${this.getApiBaseUrl(config)}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(verificationData)
        },
        config
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  async parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent> {
    const payload = JSON.parse(request.body);
    
    return {
      event_type: this.mapPayPalEventType(payload.event_type),
      transaction_id: payload.resource?.id,
      data: payload,
      timestamp: payload.create_time
    };
  }

  isTransactionIdValid(transactionId: string): boolean {
    // PayPal order IDs are typically 17 characters
    return transactionId && transactionId.length >= 10;
  }

  formatAmount(amount: number, currency: string): number {
    // PayPal uses decimal format (not cents)
    return amount;
  }

  // PayPal-specific helper methods
  private async getAccessToken(config: GatewayConfig): Promise<string> {
    const auth = btoa(`${config.credentials.client_id}:${config.credentials.client_secret}`);
    
    const response = await this.makeApiRequest(
      `${this.getApiBaseUrl(config)}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      },
      config
    );

    return response.data.access_token;
  }

  private getApiBaseUrl(config: GatewayConfig): string {
    return config.features?.sandbox ? 
      'https://api.sandbox.paypal.com' : 
      'https://api.paypal.com';
  }

  private mapPayPalOrderResponse(merchantReference: string, response: any, processingTime?: number): PaymentResponse {
    const order = response.data;
    const status = this.mapPayPalStatus(order.status);
    
    if (status === 'success') {
      return this.createSuccessResponse(
        merchantReference,
        order.id,
        order,
        processingTime
      );
    } else if (status === 'pending') {
      // Find approval link for redirect
      const approvalLink = order.links?.find(link => link.rel === 'approve');
      return this.createPendingResponse(
        merchantReference,
        order.id,
        approvalLink?.href,
        order,
        processingTime
      );
    } else {
      return this.createErrorResponse(
        merchantReference,
        'Payment failed or was cancelled',
        order,
        processingTime
      );
    }
  }

  private mapPayPalStatus(paypalStatus: string): string {
    const statusMap = {
      'COMPLETED': 'success',
      'APPROVED': 'success',
      'CREATED': 'pending',
      'SAVED': 'pending',
      'VOIDED': 'failed',
      'PAYER_ACTION_REQUIRED': 'pending'
    };
    return statusMap[paypalStatus] || 'failed';
  }

  private mapPayPalEventType(paypalEventType: string): string {
    const eventMap = {
      'CHECKOUT.ORDER.APPROVED': 'payment.success',
      'PAYMENT.CAPTURE.COMPLETED': 'payment.success',
      'PAYMENT.CAPTURE.DENIED': 'payment.failed',
      'PAYMENT.CAPTURE.REFUNDED': 'refund.processed'
    };
    return eventMap[paypalEventType] || paypalEventType;
  }

  private mapPayPalError(error: any): string {
    if (error.response && error.response.data && error.response.data.name) {
      return this.mapErrorCode(error.response.data.name);
    }
    return this.mapErrorCode(error.message || 'Unknown error');
  }

  mapErrorCode(gatewayErrorCode: string): string {
    const paypalErrorMap = {
      'INVALID_REQUEST': StandardErrorCodes.INVALID_REQUEST,
      'AUTHENTICATION_FAILURE': StandardErrorCodes.AUTHENTICATION_ERROR,
      'INSUFFICIENT_FUNDS': StandardErrorCodes.INSUFFICIENT_FUNDS,
      'INSTRUMENT_DECLINED': StandardErrorCodes.CARD_DECLINED,
      'PAYER_ACTION_REQUIRED': StandardErrorCodes.PROCESSING_ERROR
    };
    return paypalErrorMap[gatewayErrorCode] || super.mapErrorCode(gatewayErrorCode);
  }
}