# @routepay/stripe

Stripe payment gateway integration for RoutePay.

## Installation

```bash
npm install @routepay/stripe
```

## Usage

```typescript
import { StripeGateway } from '@routepay/stripe';
import { PaymentRequest, GatewayConfig } from '@routepay/interfaces';

const stripeGateway = new StripeGateway();

const config: GatewayConfig = {
  gateway_code: 'stripe',
  credentials: {
    secret_key: 'sk_test_...'
  },
  webhook_secret: 'whsec_...'
};

const paymentRequest: PaymentRequest = {
  amount: 100.00,
  currency: 'USD',
  payment_method: 'card',
  merchant_reference: 'order-123'
};

const result = await stripeGateway.processPayment(paymentRequest, config);
console.log(result);
```

## Features

- ✅ Payment processing with Stripe Payment Intents
- ✅ Refund processing  
- ✅ Transaction status checking
- ✅ Webhook signature verification
- ✅ Comprehensive error handling
- ✅ TypeScript support
- ✅ Multiple payment methods (card, bank transfer, wallet)
- ✅ Multiple currencies support

## Configuration

### Required Configuration
- `secret_key`: Stripe secret key (sk_test_... or sk_live_...)

### Optional Configuration
- `webhook_secret`: Stripe webhook endpoint secret for signature verification
- `publishable_key`: Stripe publishable key for client-side integration

## Supported Payment Methods
- Card payments (Visa, MasterCard, American Express, etc.)
- Bank transfers
- Digital wallets (Apple Pay, Google Pay)

## Supported Currencies
- USD, EUR, GBP, AUD, CAD, JPY

## Error Handling

The gateway maps Stripe-specific errors to standard error codes:
- `CARD_DECLINED`
- `INSUFFICIENT_FUNDS`
- `EXPIRED_CARD`
- `INVALID_CVC`
- `PROCESSING_ERROR`
- `RATE_LIMITED`
- `AUTHENTICATION_ERROR`

## License

MIT