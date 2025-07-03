# @navipe/paypal

PayPal payment gateway integration for NaviPe.

## Installation

```bash
npm install @navipe/paypal
```

## Usage

```typescript
import { PayPalGateway } from '@navipe/paypal';
import { PaymentRequest, GatewayConfig } from '@navipe/interfaces';

const paypalGateway = new PayPalGateway();

const config: GatewayConfig = {
  gateway_code: 'paypal',
  credentials: {
    client_id: 'your_client_id',
    client_secret: 'your_client_secret'
  },
  features: {
    sandbox: true, // Use false for production
    return_url: 'https://yoursite.com',
    webhook_id: 'your_webhook_id'
  }
};

const paymentRequest: PaymentRequest = {
  amount: 100.00,
  currency: 'USD',
  payment_method: 'wallet',
  merchant_reference: 'order-123'
};

const result = await paypalGateway.processPayment(paymentRequest, config);
console.log(result);
```

## Features

- ✅ Payment processing with PayPal Orders API
- ✅ Refund processing  
- ✅ Transaction status checking
- ✅ Webhook signature verification
- ✅ Comprehensive error handling
- ✅ TypeScript support
- ✅ Sandbox and production environment support
- ✅ OAuth2 token management

## Configuration

### Required Configuration
- `client_id`: PayPal application client ID
- `client_secret`: PayPal application client secret

### Optional Configuration
- `features.sandbox`: Set to `true` for sandbox environment (default: false)
- `features.return_url`: Return URL for successful payments
- `features.webhook_id`: PayPal webhook ID for signature verification

## Supported Payment Methods
- PayPal wallet payments
- Credit/debit card payments through PayPal

## Supported Currencies
- USD, EUR, GBP, AUD, CAD, JPY

## Error Handling

The gateway maps PayPal-specific errors to standard error codes:
- `INVALID_REQUEST`
- `AUTHENTICATION_ERROR`
- `INSUFFICIENT_FUNDS`
- `CARD_DECLINED`
- `PROCESSING_ERROR`

## Webhook Verification

The gateway supports PayPal webhook signature verification:

```typescript
const isValid = await paypalGateway.verifyWebhookSignature(webhookRequest, config);
```

## Environment Configuration

### Sandbox
```typescript
const config = {
  credentials: { /* sandbox credentials */ },
  features: { sandbox: true }
};
```

### Production
```typescript
const config = {
  credentials: { /* live credentials */ },
  features: { sandbox: false }
};
```

## License

MIT