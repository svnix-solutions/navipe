# @routepay/factory

Payment gateway factory for RoutePay - manages and creates gateway instances.

## Installation

```bash
npm install @routepay/factory
```

## Usage

### Basic Usage

```typescript
import { gatewayFactory } from '@routepay/factory';

// The factory automatically detects available gateway packages
const supportedGateways = gatewayFactory.getSupportedGateways();
console.log(supportedGateways); // ['stripe', 'razorpay', 'paypal'] (depends on installed packages)

// Create a gateway instance
const stripeGateway = gatewayFactory.createGateway('stripe');
if (stripeGateway) {
  // Use the gateway...
}
```

### Custom Factory

```typescript
import { PaymentGatewayFactoryImpl } from '@routepay/factory';
import { MyCustomGateway } from './my-custom-gateway';

const factory = new PaymentGatewayFactoryImpl();

// Register a custom gateway
factory.registerGateway('custom', () => new MyCustomGateway());

// Use the custom gateway
const customGateway = factory.createGateway('custom');
```

## Features

- ✅ **Automatic Discovery**: Detects installed gateway packages automatically
- ✅ **Optional Dependencies**: Only loads gateways that are installed
- ✅ **Dynamic Registration**: Register custom gateways at runtime  
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Singleton Support**: Pre-configured singleton instance available
- ✅ **Error Handling**: Graceful handling of missing or failed gateway initialization

## Supported Gateways

The factory automatically detects and loads these gateway packages if installed:

- **@routepay/stripe** - Stripe payment gateway
- **@routepay/razorpay** - Razorpay payment gateway  
- **@routepay/paypal** - PayPal payment gateway

## Installation with Gateways

To use specific gateways, install them alongside the factory:

```bash
# Install factory with Stripe gateway
npm install @routepay/factory @routepay/stripe

# Install factory with multiple gateways
npm install @routepay/factory @routepay/stripe @routepay/razorpay @routepay/paypal

# Install all packages
npm install @routepay/factory @routepay/stripe @routepay/razorpay @routepay/paypal
```

## API Reference

### PaymentGatewayFactoryImpl

#### Methods

- **`createGateway(gatewayCode: string): PaymentGateway | null`**
  - Creates a gateway instance for the specified gateway code
  - Returns `null` if gateway is not available

- **`getSupportedGateways(): string[]`**
  - Returns array of available gateway codes

- **`registerGateway(gatewayCode: string, factory: () => PaymentGateway): void`**
  - Registers a custom gateway factory function

- **`isGatewaySupported(gatewayCode: string): boolean`**
  - Checks if a gateway is available

- **`unregisterGateway(gatewayCode: string): void`**
  - Removes a gateway from the factory

### Singleton Instance

A pre-configured singleton instance is available:

```typescript
import { gatewayFactory } from '@routepay/factory';

// Use the singleton directly
const gateway = gatewayFactory.createGateway('stripe');
```

## Error Handling

The factory gracefully handles missing dependencies:

```typescript
import { gatewayFactory } from '@routepay/factory';

// This will return null if @routepay/stripe is not installed
const stripeGateway = gatewayFactory.createGateway('stripe');

if (!stripeGateway) {
  console.log('Stripe gateway not available. Install @routepay/stripe');
} else {
  // Use the gateway
  const result = await stripeGateway.processPayment(request, config);
}
```

## Best Practices

### 1. Check Gateway Availability

```typescript
if (gatewayFactory.isGatewaySupported('stripe')) {
  const gateway = gatewayFactory.createGateway('stripe');
  // Use gateway...
}
```

### 2. List Available Gateways

```typescript
const availableGateways = gatewayFactory.getSupportedGateways();
console.log('Available gateways:', availableGateways);
```

### 3. Handle Missing Gateways

```typescript
function createPaymentGateway(gatewayCode: string) {
  const gateway = gatewayFactory.createGateway(gatewayCode);
  
  if (!gateway) {
    throw new Error(`Gateway '${gatewayCode}' is not available. Please install the corresponding package.`);
  }
  
  return gateway;
}
```

## License

MIT