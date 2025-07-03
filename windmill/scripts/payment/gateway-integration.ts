// RoutePay Gateway Integration - Using NPM Packages

import { gatewayFactory } from '@routepay/factory';
import { 
  PaymentRequest, 
  PaymentResponse, 
  RefundRequest, 
  RefundResponse,
  GatewayConfig,
  WebhookVerificationRequest,
  WebhookEvent
} from '@routepay/interfaces';

/**
 * Process a payment using the specified gateway
 */
export async function processPayment(
  gatewayCode: string,
  request: PaymentRequest,
  config: GatewayConfig
): Promise<PaymentResponse> {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    return {
      success: false,
      transaction_id: request.merchant_reference || 'unknown',
      status: 'failed',
      error_message: `Gateway '${gatewayCode}' is not available`
    };
  }

  try {
    return await gateway.processPayment(request, config);
  } catch (error) {
    return {
      success: false,
      transaction_id: request.merchant_reference || 'unknown',
      status: 'failed',
      error_message: `Payment processing failed: ${error.message}`
    };
  }
}

/**
 * Process a refund using the specified gateway
 */
export async function processRefund(
  gatewayCode: string,
  request: RefundRequest,
  config: GatewayConfig
): Promise<RefundResponse> {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    return {
      success: false,
      refund_id: '',
      gateway_refund_id: '',
      refunded_amount: 0,
      status: 'failed',
      error_message: `Gateway '${gatewayCode}' is not available`
    };
  }

  try {
    return await gateway.processRefund(request, config);
  } catch (error) {
    return {
      success: false,
      refund_id: '',
      gateway_refund_id: '',
      refunded_amount: 0,
      status: 'failed',
      error_message: `Refund processing failed: ${error.message}`
    };
  }
}

/**
 * Check transaction status using the specified gateway
 */
export async function checkTransactionStatus(
  gatewayCode: string,
  gatewayTransactionId: string,
  config: GatewayConfig
): Promise<PaymentResponse> {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    return {
      success: false,
      transaction_id: gatewayTransactionId,
      status: 'failed',
      error_message: `Gateway '${gatewayCode}' is not available`
    };
  }

  try {
    return await gateway.checkTransactionStatus(gatewayTransactionId, config);
  } catch (error) {
    return {
      success: false,
      transaction_id: gatewayTransactionId,
      status: 'failed',
      error_message: `Status check failed: ${error.message}`
    };
  }
}

/**
 * Verify webhook signature using the specified gateway
 */
export async function verifyWebhookSignature(
  gatewayCode: string,
  request: WebhookVerificationRequest,
  config: GatewayConfig
): Promise<boolean> {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    console.error(`Gateway '${gatewayCode}' is not available for webhook verification`);
    return false;
  }

  try {
    return await gateway.verifyWebhookSignature(request, config);
  } catch (error) {
    console.error(`Webhook verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Parse webhook event using the specified gateway
 */
export async function parseWebhookEvent(
  gatewayCode: string,
  request: WebhookVerificationRequest,
  config: GatewayConfig
): Promise<WebhookEvent | null> {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    console.error(`Gateway '${gatewayCode}' is not available for webhook parsing`);
    return null;
  }

  try {
    return await gateway.parseWebhookEvent(request, config);
  } catch (error) {
    console.error(`Webhook parsing failed: ${error.message}`);
    return null;
  }
}

/**
 * Get list of available payment gateways
 */
export function getAvailableGateways(): string[] {
  return gatewayFactory.getSupportedGateways();
}

/**
 * Check if a specific gateway is available
 */
export function isGatewayAvailable(gatewayCode: string): boolean {
  return gatewayFactory.isGatewaySupported(gatewayCode);
}

/**
 * Get gateway information including supported methods and currencies
 */
export function getGatewayInfo(gatewayCode: string): {
  code: string;
  supported_methods: string[];
  supported_currencies: string[];
  available: boolean;
} | null {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    return {
      code: gatewayCode,
      supported_methods: [],
      supported_currencies: [],
      available: false
    };
  }

  return {
    code: gateway.getGatewayCode(),
    supported_methods: gateway.getSupportedMethods(),
    supported_currencies: gateway.getSupportedCurrencies(),
    available: true
  };
}