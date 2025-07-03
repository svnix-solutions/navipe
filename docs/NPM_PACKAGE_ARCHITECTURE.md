# NaviPe NPM Package Architecture

This document outlines the modular npm package architecture for NaviPe payment gateway integrations.

## 📦 Package Structure

```
@navipe/
├── interfaces          # Core interfaces and types
├── factory            # Gateway factory and management
├── stripe             # Stripe payment gateway
├── razorpay           # Razorpay payment gateway  
└── paypal             # PayPal payment gateway
```

## 🎯 Design Principles

### 1. **Modularity**
- Each gateway is a separate npm package
- Install only the gateways you need
- Shared interfaces package for consistency

### 2. **Pluggability** 
- Factory pattern for gateway management
- Dynamic gateway discovery
- Runtime gateway registration

### 3. **Type Safety**
- Full TypeScript support across all packages
- Consistent interfaces and error handling
- Strongly typed gateway configurations

### 4. **Independence**
- Each package can be developed and versioned independently
- No circular dependencies
- Optional peer dependencies

## 📋 Package Details

### Core Packages

#### @navipe/interfaces
**Purpose**: Core interfaces, types, and enums  
**Dependencies**: None  
**Size**: ~5KB  

```typescript
export interface PaymentGateway { /* ... */ }
export interface PaymentRequest { /* ... */ }
export enum StandardErrorCodes { /* ... */ }
```

#### @navipe/factory  
**Purpose**: Gateway factory and management  
**Dependencies**: `@navipe/interfaces`  
**Peer Dependencies**: Gateway packages (optional)  
**Size**: ~8KB  

```typescript
import { gatewayFactory } from '@navipe/factory';
const gateway = gatewayFactory.createGateway('stripe');
```

### Gateway Packages

#### @navipe/stripe
**Purpose**: Stripe payment gateway integration  
**Dependencies**: `@navipe/interfaces`, `stripe`  
**Size**: ~25KB + Stripe SDK  

```typescript
import { StripeGateway } from '@navipe/stripe';
const gateway = new StripeGateway();
```

#### @navipe/razorpay
**Purpose**: Razorpay payment gateway integration  
**Dependencies**: `@navipe/interfaces`, `razorpay`  
**Size**: ~20KB + Razorpay SDK  

```typescript
import { RazorpayGateway } from '@navipe/razorpay';
const gateway = new RazorpayGateway();
```

#### @navipe/paypal
**Purpose**: PayPal payment gateway integration  
**Dependencies**: `@navipe/interfaces`  
**Size**: ~22KB  

```typescript
import { PayPalGateway } from '@navipe/paypal';
const gateway = new PayPalGateway();
```


## 🚀 Installation Options

### Option 1: Complete Suite (Recommended)
```bash
npm install @navipe/interfaces @navipe/factory @navipe/stripe @navipe/razorpay @navipe/paypal
```
**Use Case**: You need multiple gateways or want all options available with the factory pattern

### Option 2: Specific Gateways
```bash
npm install @navipe/interfaces @navipe/factory @navipe/stripe
```
**Use Case**: You only need specific gateways

### Option 3: Individual Gateway
```bash
npm install @navipe/interfaces @navipe/stripe
```
**Use Case**: You only need one gateway and want to manage it manually

## 💡 Usage Examples

### Using the Factory (Recommended)

```typescript
import { gatewayFactory } from '@navipe/factory';
import { PaymentRequest, GatewayConfig } from '@navipe/interfaces';

// Check available gateways (depends on installed packages)
console.log(gatewayFactory.getSupportedGateways()); 
// Output: ['stripe', 'razorpay', 'paypal'] (if all packages installed)

// Create gateway dynamically
const gateway = gatewayFactory.createGateway('stripe');

if (gateway) {
  const config: GatewayConfig = {
    gateway_code: 'stripe',
    credentials: { secret_key: 'sk_test_...' }
  };

  const request: PaymentRequest = {
    amount: 100.00,
    currency: 'USD',
    payment_method: 'card',
    merchant_reference: 'order-123'
  };

  const result = await gateway.processPayment(request, config);
}
```

### Using Gateway Directly

```typescript
import { StripeGateway } from '@navipe/stripe';
import { PaymentRequest, GatewayConfig } from '@navipe/interfaces';

const stripeGateway = new StripeGateway();

const config: GatewayConfig = {
  gateway_code: 'stripe',
  credentials: { secret_key: 'sk_test_...' }
};

const request: PaymentRequest = {
  amount: 100.00,
  currency: 'USD', 
  payment_method: 'card',
  merchant_reference: 'order-123'
};

const result = await stripeGateway.processPayment(request, config);
```

### Custom Gateway Registration

```typescript
import { gatewayFactory } from '@navipe/factory';
import { MyCustomGateway } from './my-custom-gateway';

// Register custom gateway
gatewayFactory.registerGateway('custom', () => new MyCustomGateway());

// Use custom gateway
const customGateway = gatewayFactory.createGateway('custom');
```

## 🔧 Development Workflow

### Package Development

1. **Core Changes**: Update `@navipe/interfaces` first
2. **Gateway Changes**: Update individual gateway packages
3. **Factory Changes**: Update `@navipe/factory` for new features
4. **Meta Package**: Update `@navipe/all` version dependencies

### Version Management

```bash
# Version individual packages
cd packages/routepay-stripe
npm version patch
npm publish

# Version interfaces (may require updates to all gateway packages)
cd packages/routepay-interfaces  
npm version minor
npm publish

```

### Testing Strategy

1. **Unit Tests**: Each package has its own test suite
2. **Integration Tests**: Test packages working together
3. **E2E Tests**: Test full payment flows

## 🏗️ Build and Deployment

### Local Development

```bash
# Build all packages
cd packages/routepay-interfaces && npm run build
cd packages/routepay-stripe && npm run build
cd packages/routepay-razorpay && npm run build
cd packages/routepay-paypal && npm run build
cd packages/routepay-factory && npm run build
```

### CI/CD Pipeline

```yaml
# .github/workflows/publish.yml
name: Publish Packages
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      # Publish in dependency order
      - run: cd packages/routepay-interfaces && npm ci && npm run build && npm publish
      - run: cd packages/routepay-stripe && npm ci && npm run build && npm publish  
      - run: cd packages/routepay-razorpay && npm ci && npm run build && npm publish
      - run: cd packages/routepay-paypal && npm ci && npm run build && npm publish
      - run: cd packages/routepay-factory && npm ci && npm run build && npm publish
      - run: cd packages/routepay-all && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🔒 Security Considerations

### Package Security
- Regular dependency audits (`npm audit`)
- Minimal dependencies in each package
- No secrets in package code

### Access Control
- Scoped packages under `@navipe` organization
- Team-based npm publish permissions
- Two-factor authentication required

### Dependency Management
- Lock file committed for each package
- Regular security updates
- Peer dependency warnings for version mismatches

## 📊 Benefits of This Architecture

### ✅ For Developers
- **Smaller Bundle Sizes**: Only install what you need
- **Faster Installation**: Fewer dependencies to download
- **Better Tree Shaking**: Unused gateways are completely excluded
- **Independent Updates**: Update gateways independently

### ✅ For Platform
- **Easier Maintenance**: Each gateway can be maintained separately
- **Independent Versioning**: Bug fixes don't require updating all packages
- **Better Testing**: Isolated test suites for each gateway
- **Cleaner Dependencies**: No unused gateway SDKs

### ✅ For Users
- **Easy Integration**: Simple npm install and import
- **Type Safety**: Full TypeScript support
- **Consistent API**: Same interface across all gateways
- **Documentation**: Each package has focused documentation

## 🚀 Cloud Deployment

### Docker Support

```dockerfile
# Only install needed packages in production
FROM node:18-alpine
WORKDIR /app

# For Stripe-only deployment
COPY package*.json ./
RUN npm ci --only=production
# Results in smaller image with only Stripe dependencies

# For all gateways
RUN npm install @navipe/all
# Larger image but all gateways available
```

### Serverless Deployment

```typescript
// Lambda function with only Stripe
import { StripeGateway } from '@navipe/stripe';

export const handler = async (event) => {
  const gateway = new StripeGateway();
  // Process payment...
};
```

### Environment Variables

```bash
# Only include credentials for installed gateways
STRIPE_SECRET_KEY=sk_live_...
# No need for RAZORPAY_KEY_ID if @navipe/razorpay not installed
```

This modular architecture provides maximum flexibility while maintaining code quality and developer experience!