# Pluggable Payment Gateway Architecture

This document explains the pluggable architecture for payment gateways in NaviPe, making it easy to add new payment integrations without modifying core logic.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Core Logic    │───▶│Gateway Factory  │───▶│ Gateway Plugin  │
│  (Windmill)     │    │                 │    │  (Stripe, etc.) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Interfaces    │
                       │   (Contracts)   │
                       └─────────────────┘
```

## Key Components

### 1. Interfaces (`interfaces.ts`)
Defines contracts that all payment gateways must implement:

```typescript
interface PaymentGateway {
  // Gateway identification
  getGatewayCode(): string;
  getSupportedMethods(): string[];
  getSupportedCurrencies(): string[];
  
  // Payment operations
  processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse>;
  processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse>;
  checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse>;
  
  // Webhook operations
  verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean>;
  parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent>;
}
```

### 2. Base Gateway (`base-gateway.ts`)
Provides common functionality and helper methods:

```typescript
abstract class BasePaymentGateway implements PaymentGateway {
  // Common implementations
  protected async makeApiRequest(url: string, options: RequestInit, config: GatewayConfig): Promise<any>
  protected generateRequestId(): string
  protected validateConfig(config: GatewayConfig, requiredFields: string[]): void
  
  // Response helpers
  protected createSuccessResponse(...)
  protected createErrorResponse(...)
  protected createPendingResponse(...)
}
```

### 3. Gateway Implementations
Each gateway extends `BasePaymentGateway`:

```typescript
class StripeGateway extends BasePaymentGateway {
  getGatewayCode(): string { return 'stripe'; }
  
  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    // Stripe-specific implementation
  }
}
```

### 4. Gateway Factory (`gateway-factory.ts`)
Creates gateway instances and manages registration:

```typescript
class PaymentGatewayFactoryImpl {
  createGateway(gatewayCode: string): PaymentGateway | null
  registerGateway(gatewayCode: string, factory: () => PaymentGateway): void
  getSupportedGateways(): string[]
}
```

## Adding a New Payment Gateway

### Step 1: Create Gateway Implementation

Create a new file: `windmill/scripts/payment/gateways/new-gateway.ts`

```typescript
import { BasePaymentGateway } from "./base-gateway.ts";
import { PaymentRequest, PaymentResponse, /* ... */ } from "../interfaces.ts";

export class NewGateway extends BasePaymentGateway {
  getGatewayCode(): string {
    return 'new_gateway';
  }

  getSupportedMethods(): string[] {
    return ['card', 'wallet']; // Supported payment methods
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR']; // Supported currencies
  }

  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    // Validate configuration
    this.validateConfig(config, ['api_key', 'secret_key']);
    
    // Prepare payment data
    const paymentData = {
      amount: this.formatAmount(request.amount, request.currency),
      currency: request.currency,
      // ... other gateway-specific fields
    };

    try {
      // Make API call to gateway
      const response = await this.makeApiRequest(
        'https://api.new-gateway.com/payments',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.credentials.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        },
        config
      );

      // Map response to standard format
      return this.mapGatewayResponse(request.merchant_reference, response);
    } catch (error) {
      return this.createErrorResponse(
        request.merchant_reference,
        this.mapErrorCode(error.message)
      );
    }
  }

  async processRefund(request: RefundRequest, config: GatewayConfig): Promise<RefundResponse> {
    // Implement refund logic
  }

  async checkTransactionStatus(gatewayTransactionId: string, config: GatewayConfig): Promise<PaymentResponse> {
    // Implement status check logic
  }

  async verifyWebhookSignature(request: WebhookVerificationRequest, config: GatewayConfig): Promise<boolean> {
    // Implement webhook signature verification
  }

  async parseWebhookEvent(request: WebhookVerificationRequest, config: GatewayConfig): Promise<WebhookEvent> {
    // Parse webhook payload and return standard event format
  }

  // Gateway-specific helper methods
  private mapGatewayResponse(merchantRef: string, response: any): PaymentResponse {
    // Map gateway response to standard PaymentResponse format
  }

  private formatAmount(amount: number, currency: string): number {
    // Gateway-specific amount formatting (cents, etc.)
    return Math.round(amount * 100);
  }

  mapErrorCode(gatewayErrorCode: string): string {
    // Map gateway error codes to standard error codes
    const errorMap = {
      'insufficient_balance': 'INSUFFICIENT_FUNDS',
      'invalid_card': 'CARD_DECLINED',
      // ... other mappings
    };
    return errorMap[gatewayErrorCode] || super.mapErrorCode(gatewayErrorCode);
  }
}
```

### Step 2: Register Gateway in Factory

Update `gateway-factory.ts`:

```typescript
import { NewGateway } from "./gateways/new-gateway.ts";

private registerDefaultGateways(): void {
  this.gateways.set('stripe', () => new StripeGateway());
  this.gateways.set('razorpay', () => new RazorpayGateway());
  this.gateways.set('new_gateway', () => new NewGateway()); // Add this line
}
```

### Step 3: Add Gateway Configuration to Database

Insert gateway configuration into the database:

```sql
INSERT INTO payment_gateways (
  gateway_code, 
  name, 
  provider, 
  supported_methods, 
  supported_currencies, 
  api_endpoint, 
  credentials
) VALUES (
  'new_gateway_main',
  'New Gateway',
  'new_gateway',
  ARRAY['card', 'wallet']::payment_method[],
  ARRAY['USD', 'EUR']::currency_code[],
  'https://api.new-gateway.com',
  '{"api_key": "encrypted_key", "secret_key": "encrypted_secret"}'
);
```

### Step 4: Test Integration

The gateway is now ready to use! The core logic will automatically:

1. **Discovery**: Factory will find and instantiate your gateway
2. **Routing**: Routing engine will consider it for payment routing
3. **Processing**: Payment processor will use your implementation
4. **Webhooks**: Webhook handler will verify and parse events

## Benefits of Pluggable Architecture

### ✅ Easy Integration
- **Standard Interface**: All gateways implement the same contract
- **Helper Methods**: Base class provides common functionality
- **Error Handling**: Consistent error mapping and handling
- **Configuration**: Unified configuration management

### ✅ Maintainability
- **Separation of Concerns**: Gateway logic isolated from core logic
- **Single Responsibility**: Each gateway only handles its own protocol
- **Testability**: Easy to unit test individual gateways
- **Code Reuse**: Common functionality shared via base class

### ✅ Scalability
- **Dynamic Registration**: Add gateways without restarting
- **Feature Flags**: Enable/disable gateways per merchant
- **A/B Testing**: Test new gateways alongside existing ones
- **Performance**: Only load gateways when needed

## Gateway Configuration Examples

### Stripe Configuration
```json
{
  "gateway_code": "stripe_main",
  "credentials": {
    "secret_key": "sk_live_...",
    "publishable_key": "pk_live_..."
  },
  "features": {
    "webhook_secret": "whsec_...",
    "capture_method": "automatic"
  }
}
```

### Razorpay Configuration
```json
{
  "gateway_code": "razorpay_main", 
  "credentials": {
    "key_id": "rzp_live_...",
    "key_secret": "..."
  },
  "features": {
    "webhook_secret": "...",
    "auto_capture": true
  }
}
```

## Testing New Gateways

### Unit Tests
```typescript
// Test gateway implementation
describe('NewGateway', () => {
  const gateway = new NewGateway();
  const mockConfig = { /* test config */ };

  test('should process payment successfully', async () => {
    const request = { /* test payment request */ };
    const response = await gateway.processPayment(request, mockConfig);
    
    expect(response.success).toBe(true);
    expect(response.gateway_transaction_id).toBeDefined();
  });

  test('should handle payment failures', async () => {
    // Test error scenarios
  });
});
```

### Integration Tests
```typescript
// Test through main workflow
describe('Payment Processing with New Gateway', () => {
  test('should route payment to new gateway', async () => {
    const result = await processPayment({
      transactionId: 'test-txn',
      routingStrategy: 'default'
    });
    
    expect(result.gatewayUsed).toBe('new_gateway_main');
  });
});
```

## Error Handling Strategy

### Standard Error Codes
All gateways should map to these standard codes:

- `INSUFFICIENT_FUNDS`
- `CARD_DECLINED`
- `INVALID_CARD`
- `EXPIRED_CARD`
- `INVALID_CVC`
- `PROCESSING_ERROR`
- `NETWORK_ERROR`
- `RATE_LIMITED`
- `UNKNOWN_ERROR`

### Error Mapping Example
```typescript
mapErrorCode(gatewayErrorCode: string): string {
  const errorMap = {
    // Gateway-specific codes -> Standard codes
    'card_declined': 'CARD_DECLINED',
    'insufficient_balance': 'INSUFFICIENT_FUNDS',
    'invalid_cvv': 'INVALID_CVC',
    'expired': 'EXPIRED_CARD',
    'processing_failed': 'PROCESSING_ERROR'
  };
  
  return errorMap[gatewayErrorCode] || 'UNKNOWN_ERROR';
}
```

## Security Considerations

### Credential Management
- Store encrypted credentials in database
- Use environment variables for sensitive keys
- Implement credential rotation
- Audit credential access

### Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement replay protection
- Rate limit webhook calls

### API Security
- Use TLS for all API calls
- Implement request signing where required
- Add request timeouts
- Log security events

## Performance Optimization

### Caching
- Cache gateway configurations
- Cache exchange rates
- Cache routing decisions

### Connection Pooling
- Reuse HTTP connections
- Implement connection timeouts
- Monitor connection health

### Monitoring
- Track response times per gateway
- Monitor success/failure rates
- Alert on anomalies
- Dashboard for gateway health

This pluggable architecture makes NaviPe highly extensible while maintaining code quality and reliability!