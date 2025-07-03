// Payment Gateway Factory

import { PaymentGateway, PaymentGatewayFactory } from "@navipe/interfaces";

export class PaymentGatewayFactoryImpl implements PaymentGatewayFactory {
  private gateways: Map<string, () => PaymentGateway>;
  private gatewayModules: Map<string, any> = new Map();

  constructor() {
    this.gateways = new Map();
    this.initializeGateways();
  }

  private initializeGateways(): void {
    // Try to load gateway modules
    this.tryLoadGateway('stripe', '@navipe/stripe', 'StripeGateway');
    this.tryLoadGateway('razorpay', '@navipe/razorpay', 'RazorpayGateway');
    this.tryLoadGateway('paypal', '@navipe/paypal', 'PayPalGateway');
  }

  private tryLoadGateway(gatewayCode: string, moduleName: string, className: string): void {
    try {
      // Use require for synchronous loading of optional dependencies
      const module = require(moduleName);
      const GatewayClass = module[className];
      if (GatewayClass) {
        this.gateways.set(gatewayCode, () => new GatewayClass());
        this.gatewayModules.set(gatewayCode, module);
      }
    } catch (error) {
      // Module not available - this is expected for optional dependencies
      console.debug(`Gateway ${gatewayCode} not available. Install ${moduleName} to use ${gatewayCode} integration.`);
    }
  }

  createGateway(gatewayCode: string): PaymentGateway | null {
    const gatewayFactory = this.gateways.get(gatewayCode);
    if (!gatewayFactory) {
      console.warn(`Gateway ${gatewayCode} is not available. Make sure the corresponding package is installed.`);
      return null;
    }
    
    try {
      return gatewayFactory();
    } catch (error) {
      console.error(`Failed to create gateway ${gatewayCode}:`, error);
      return null;
    }
  }

  getSupportedGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  // Method to register new gateways dynamically
  registerGateway(gatewayCode: string, gatewayFactory: () => PaymentGateway): void {
    this.gateways.set(gatewayCode, gatewayFactory);
  }

  // Method to check if a gateway is supported
  isGatewaySupported(gatewayCode: string): boolean {
    return this.gateways.has(gatewayCode);
  }

  // Method to remove a gateway
  unregisterGateway(gatewayCode: string): void {
    this.gateways.delete(gatewayCode);
  }
}

// Singleton instance
export const gatewayFactory = new PaymentGatewayFactoryImpl();