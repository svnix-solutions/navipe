# RoutePay - Payment Router Platform

A sophisticated payment routing platform built with Hasura GraphQL, Windmill workflows, and PostgreSQL. RoutePay intelligently routes payment transactions through multiple payment gateways based on configurable rules, optimizing for success rates, costs, and performance.

## Features

- **Multi-Gateway Support**: Integrate with Stripe, Razorpay, PayPal, and more
- **Intelligent Routing**: Route payments based on:
  - Transaction amount
  - Payment method
  - Gateway health metrics
  - Custom business rules
  - Load balancing
- **Real-time Monitoring**: Track gateway performance and transaction status
- **Webhook Management**: Handle gateway webhooks and merchant notifications
- **GraphQL API**: Powered by Hasura for flexible data access
- **Workflow Automation**: Windmill-based payment processing workflows
- **Comprehensive Logging**: Audit trails and routing attempt history

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Merchant  │────▶│   RoutePay  │────▶│   Payment   │
│     API     │     │   Platform  │     │   Gateways  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼────┐
              │  Hasura   │ │Windmill │
              │  GraphQL  │ │Workflows│
              └─────┬─────┘ └────┬────┘
                    │             │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │  Database   │
                    └─────────────┘
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd routepay
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with migrations** (Recommended)
   ```bash
   ./setup-with-migrations.sh
   ```
   
   Or start without migrations:
   ```bash
   ./setup.sh
   ```

4. **Access services**
   - Hasura Console: http://localhost:8080/console
   - Windmill: http://localhost:8000
   - PgAdmin: http://localhost:8090

## Database Migrations

This project uses Hasura CLI for database migrations. See [MIGRATIONS.md](MIGRATIONS.md) for detailed instructions on:
- Creating new migrations
- Applying/rolling back changes
- Managing metadata
- Best practices

## Database Schema

The platform uses a comprehensive schema including:

- **merchants**: Store merchant accounts and API keys
- **payment_gateways**: Gateway configurations and credentials
- **merchant_gateways**: Merchant-specific gateway settings
- **routing_rules**: Configurable routing logic
- **transactions**: Payment transaction records
- **routing_attempts**: Track routing decisions and attempts
- **gateway_health_metrics**: Monitor gateway performance
- **webhooks**: Log incoming webhooks
- **audit_logs**: Compliance and debugging

See [docs/DATABASE.md](docs/DATABASE.md) for detailed schema documentation.

## API Usage

### Create a Transaction

```graphql
mutation CreatePayment {
  insert_transactions_one(
    object: {
      merchant_id: "merchant-uuid",
      amount: 100.50,
      currency: USD,
      payment_method: card,
      customer_email: "customer@example.com"
    }
  ) {
    id
    transaction_ref
    status
  }
}
```

### Process Payment

```graphql
mutation ProcessPayment {
  processPayment(
    transactionId: "transaction-uuid",
    routingStrategy: "default"
  ) {
    success
    message
    gatewayUsed
    gatewayTransactionId
  }
}
```

### Query Transaction Status

```graphql
query GetTransaction {
  transactions(where: {transaction_ref: {_eq: "TXN123456"}}) {
    status
    amount
    gateway {
      name
    }
    routing_attempts {
      gateway {
        name
      }
      status
      error_message
    }
  }
}
```

## Routing Rules

Configure routing rules to control payment flow:

### Amount-Based Routing
```json
{
  "conditions": {
    "amount": {"min": 0, "max": 100}
  },
  "actions": {
    "preferred_gateway": "razorpay_main"
  }
}
```

### Method-Based Routing
```json
{
  "conditions": {
    "payment_method": "upi"
  },
  "actions": {
    "preferred_gateway": "razorpay_main"
  }
}
```

### Load Balancing
```json
{
  "conditions": {},
  "actions": {
    "distribution": {
      "stripe_main": 70,
      "razorpay_main": 30
    }
  }
}
```

## Windmill Workflows

The platform uses Windmill for:

1. **Payment Processing** (`windmill/scripts/payment/process.ts`)
   - Transaction validation
   - Gateway selection
   - Payment execution
   - Error handling and retries

2. **Routing Engine** (`windmill/scripts/payment/routing-engine.ts`)
   - Advanced routing logic
   - Health-based decisions
   - Cost optimization

3. **Webhook Handling** (`windmill/scripts/webhooks/gateway-webhook.ts`)
   - Signature verification
   - Status updates
   - Merchant notifications

## Security

- API key authentication for merchants
- Encrypted gateway credentials
- Webhook signature verification
- Comprehensive audit logging
- Row-level security in Hasura

## Monitoring

- Real-time transaction status via GraphQL subscriptions
- Gateway health metrics dashboard
- Failed transaction analysis
- Routing decision insights

## Development

### Adding a New Gateway

1. Add gateway configuration to `payment_gateways` table
2. Implement gateway-specific logic in Windmill scripts
3. Add webhook handler for the gateway
4. Update routing engine if needed

### Testing

1. Use seed data for testing:
   ```bash
   psql -d routepay -f database/seed-data.sql
   ```

2. Test payment flow:
   - Create transaction via GraphQL
   - Trigger Windmill workflow
   - Monitor status updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-issues-url]
- Documentation: See `/docs` folder
- Email: support@routepay.com