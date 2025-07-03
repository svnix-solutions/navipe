# @routepay/interfaces

Core interfaces and types for RoutePay payment gateway integrations.

## Installation

```bash
npm install @routepay/interfaces
```

## Usage

```typescript
import { 
  PaymentGateway, 
  PaymentRequest, 
  PaymentResponse,
  GatewayConfig,
  StandardErrorCodes
} from '@routepay/interfaces';

// Implement a payment gateway
class MyGateway implements PaymentGateway {
  getGatewayCode(): string {
    return 'my-gateway';
  }
  
  async processPayment(request: PaymentRequest, config: GatewayConfig): Promise<PaymentResponse> {
    // Implementation
  }
  
  // ... other methods
}
```

## Interfaces

### PaymentGateway
Core interface that all payment gateways must implement.

### PaymentRequest
Request structure for processing payments.

### PaymentResponse  
Response structure for payment operations.

### GatewayConfig
Configuration structure for gateway credentials and settings.

### StandardErrorCodes
Enum of standard error codes that all gateways should map to.

## License

MIT