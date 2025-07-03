# @routepay/razorpay

Razorpay payment gateway integration for RoutePay.

## Installation

```bash
npm install @routepay/razorpay
```

## Usage

```typescript
import { RazorpayGateway } from '@routepay/razorpay';
import { PaymentRequest, GatewayConfig } from '@routepay/interfaces';

const razorpayGateway = new RazorpayGateway();

const config: GatewayConfig = {
  gateway_code: 'razorpay',
  credentials: {
    key_id: 'rzp_test_...',
    key_secret: 'your_secret_key'
  },
  webhook_secret: 'your_webhook_secret'
};

const paymentRequest: PaymentRequest = {
  amount: 500.00,
  currency: 'INR',
  payment_method: 'card',
  merchant_reference: 'order-123'
};

const result = await razorpayGateway.processPayment(paymentRequest, config);
console.log(result);
```

## Features

- ✅ Payment processing with Razorpay Orders API
- ✅ Refund processing  
- ✅ Transaction status checking
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Comprehensive error handling
- ✅ TypeScript support
- ✅ Multiple payment methods (card, UPI, wallet, bank transfer)
- ✅ INR currency support

## Configuration

### Required Configuration
- `key_id`: Razorpay key ID (rzp_test_... or rzp_live_...)
- `key_secret`: Razorpay key secret

### Optional Configuration
- `webhook_secret`: Razorpay webhook secret for signature verification

## Supported Payment Methods
- Card payments (Debit/Credit cards)
- UPI payments
- Digital wallets (Paytm, PhonePe, etc.)
- Net banking
- Bank transfers

## Supported Currencies
- INR (Indian Rupee)

## Error Handling

The gateway maps Razorpay-specific errors to standard error codes:
- `INVALID_REQUEST`
- `GATEWAY_ERROR`
- `PROCESSING_ERROR`

## Webhook Verification

The gateway properly verifies Razorpay webhook signatures using HMAC-SHA256:

```typescript
const isValid = await razorpayGateway.verifyWebhookSignature(webhookRequest, config);
```

## License

MIT