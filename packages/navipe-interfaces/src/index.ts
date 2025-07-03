// Payment Gateway Plugin Interfaces

export interface PaymentRequest {
  amount: number;
  currency: string;
  payment_method: string;
  customer_email?: string;
  customer_phone?: string;
  billing_address?: BillingAddress;
  metadata?: Record<string, any>;
  merchant_reference?: string;
}

export interface BillingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id: string;
  gateway_transaction_id?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  gateway_response?: any;
  error_message?: string;
  redirect_url?: string; // For 3DS or redirect flows
  processing_time_ms?: number;
}

export interface RefundRequest {
  original_transaction_id: string;
  amount?: number; // If not provided, full refund
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  success: boolean;
  refund_id: string;
  gateway_refund_id?: string;
  refunded_amount: number;
  status: 'pending' | 'success' | 'failed';
  gateway_response?: any;
  error_message?: string;
}

export interface WebhookVerificationRequest {
  headers: Record<string, string>;
  body: string;
  signature?: string;
}

export interface WebhookEvent {
  event_type: string;
  transaction_id?: string;
  data: any;
  timestamp: string;
}

export interface GatewayConfig {
  gateway_code: string;
  credentials: Record<string, any>;
  features?: Record<string, any>;
  webhook_secret?: string;
}

// Core Payment Gateway Interface
export interface PaymentGateway {
  // Gateway identification
  getGatewayCode(): string;
  getSupportedMethods(): string[];
  getSupportedCurrencies(): string[];
  
  // Payment operations
  processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse>;
  processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse>;
  
  // Status operations
  checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse>;
  
  // Webhook operations
  verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean>;
  parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent>;
  
  // Gateway-specific operations
  isTransactionIdValid(transactionId: string): boolean;
  formatAmount(amount: number, currency: string): number; // Handle currency formatting (cents, paise, etc.)
  
  // Error handling
  mapErrorCode(gatewayErrorCode: string): string;
}

// Factory for creating gateway instances
export interface PaymentGatewayFactory {
  createGateway(gatewayCode: string): PaymentGateway | null;
  getSupportedGateways(): string[];
  registerGateway(gatewayCode: string, gatewayFactory: () => PaymentGateway): void;
  isGatewaySupported(gatewayCode: string): boolean;
}

// Standard error codes that all gateways should map to
export enum StandardErrorCodes {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_DECLINED = 'CARD_DECLINED',
  INVALID_CARD = 'INVALID_CARD',
  EXPIRED_CARD = 'EXPIRED_CARD',
  INVALID_CVC = 'INVALID_CVC',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Payment method types
export enum PaymentMethodTypes {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  UPI = 'upi',
  NETBANKING = 'netbanking'
}

// Currency codes
export enum CurrencyCodes {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD'
}

// Gateway status types
export enum GatewayStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed'
}

// Webhook event types
export enum WebhookEventTypes {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PROCESSING = 'payment.processing',
  REFUND_PROCESSED = 'refund.processed',
  DISPUTE_CREATED = 'dispute.created'
}