// Base Payment Gateway Implementation

import { 
  PaymentGateway, 
  PaymentRequest, 
  PaymentResponse, 
  RefundRequest, 
  RefundResponse,
  WebhookVerificationRequest,
  WebhookEvent,
  GatewayConfig,
  StandardErrorCodes
} from "@navipe/interfaces";

export abstract class BasePaymentGateway implements PaymentGateway {
  // Abstract methods that must be implemented by each gateway
  abstract getGatewayCode(): string;
  abstract getSupportedMethods(): string[];
  abstract getSupportedCurrencies(): string[];
  
  abstract processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse>;
  abstract processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse>;
  abstract checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse>;
  
  abstract verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean>;
  abstract parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent>;

  // Common implementations with defaults that can be overridden
  isTransactionIdValid(transactionId: string): boolean {
    return transactionId && transactionId.length > 0;
  }

  formatAmount(amount: number, currency: string): number {
    // Default: assume gateway uses smallest currency unit (cents, paise, etc.)
    return Math.round(amount * 100);
  }

  mapErrorCode(gatewayErrorCode: string): string {
    // Default error mapping - can be overridden by specific gateways
    const errorMap: Record<string, string> = {
      'insufficient_funds': StandardErrorCodes.INSUFFICIENT_FUNDS,
      'card_declined': StandardErrorCodes.CARD_DECLINED,
      'invalid_card': StandardErrorCodes.INVALID_CARD,
      'expired_card': StandardErrorCodes.EXPIRED_CARD,
      'processing_error': StandardErrorCodes.PROCESSING_ERROR,
      'network_error': StandardErrorCodes.NETWORK_ERROR
    };
    
    return errorMap[gatewayErrorCode] || StandardErrorCodes.UNKNOWN_ERROR;
  }

  // Helper methods for common operations
  protected async makeApiRequest(
    url: string, 
    options: RequestInit, 
    config: GatewayConfig
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RoutePay/1.0',
          ...options.headers
        }
      });

      const responseData = await response.json();
      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseData.message || 'Request failed'}`);
      }

      return {
        data: responseData,
        processing_time_ms: processingTime,
        status_code: response.status
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      throw new Error(`API request failed: ${error.message} (${processingTime}ms)`);
    }
  }

  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateConfig(config: GatewayConfig, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!config.credentials || !config.credentials[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }

  protected createSuccessResponse(
    transactionId: string,
    gatewayTransactionId: string,
    gatewayResponse: any,
    processingTime?: number
  ): PaymentResponse {
    return {
      success: true,
      transaction_id: transactionId,
      gateway_transaction_id: gatewayTransactionId,
      status: 'success',
      gateway_response: gatewayResponse,
      processing_time_ms: processingTime
    };
  }

  protected createErrorResponse(
    transactionId: string,
    errorMessage: string,
    gatewayResponse?: any,
    processingTime?: number
  ): PaymentResponse {
    return {
      success: false,
      transaction_id: transactionId,
      status: 'failed',
      error_message: errorMessage,
      gateway_response: gatewayResponse,
      processing_time_ms: processingTime
    };
  }

  protected createPendingResponse(
    transactionId: string,
    gatewayTransactionId: string,
    redirectUrl?: string,
    gatewayResponse?: any,
    processingTime?: number
  ): PaymentResponse {
    return {
      success: true,
      transaction_id: transactionId,
      gateway_transaction_id: gatewayTransactionId,
      status: 'pending',
      redirect_url: redirectUrl,
      gateway_response: gatewayResponse,
      processing_time_ms: processingTime
    };
  }
}