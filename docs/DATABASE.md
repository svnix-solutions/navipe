# Payment Router Platform Database Documentation

## Overview
This document describes the database schema for the NaviPe payment routing platform. The schema is managed through Hasura CLI migrations located in `hasura/migrations/default/`.

## Core Entities

### 1. Merchants
- Stores merchant information and API credentials
- Each merchant can have multiple gateway configurations
- Supports webhook URLs for transaction notifications

### 2. Payment Gateways
- Defines available payment gateways (Stripe, Razorpay, PayPal, etc.)
- Stores gateway credentials and supported features
- Tracks supported payment methods and currencies

### 3. Merchant Gateways
- Links merchants to gateways with specific configurations
- Defines merchant-specific fees and priorities
- Stores merchant's gateway-specific credentials

### 4. Routing Rules
- Configurable rules for intelligent payment routing
- Supports various rule types:
  - Percentage-based routing
  - Volume-based routing
  - Amount-based routing
  - Gateway priority routing
  - Payment method-based routing

### 5. Transactions
- Records all payment transactions
- Tracks transaction status and gateway used
- Stores customer information and metadata

### 6. Routing Attempts
- Logs each attempt to process a transaction through a gateway
- Useful for debugging and analytics

### 7. Gateway Health Metrics
- Tracks gateway performance metrics
- Used for intelligent routing decisions

## Schema Management

The database schema is managed through Hasura CLI migrations:

1. **Migrations Location**: `hasura/migrations/default/`
2. **Metadata Location**: `hasura/metadata/`
3. **Seed Data**: `hasura/seeds/default/`

### Migration Files Structure
```
hasura/migrations/default/
├── 1704067200000_create_enums/
├── 1704067260000_create_merchants_table/
├── 1704067320000_create_payment_gateways_table/
├── 1704067380000_create_merchant_gateways_table/
├── 1704067440000_create_routing_rules_table/
├── 1704067500000_create_transactions_table/
├── 1704067560000_create_remaining_tables/
└── 1704067620000_create_triggers_and_views/
```

### Setup Instructions

1. **Automated Setup** (Recommended)
   ```bash
   ./setup-with-migrations.sh
   ```

2. **Manual Setup**
   ```bash
   # Start services
   docker compose up -d
   
   # Apply migrations
   cd hasura
   hasura migrate apply --admin-secret myadminsecret
   hasura metadata apply --admin-secret myadminsecret
   hasura seed apply --admin-secret myadminsecret
   ```

For detailed migration workflows, see [MIGRATIONS.md](../MIGRATIONS.md).

## Key Features

- **Multi-Gateway Support**: Route payments through multiple gateways
- **Intelligent Routing**: Use rules to optimize for cost, success rate, or other factors
- **Failover Support**: Automatically retry failed transactions with different gateways
- **Comprehensive Logging**: Track all routing attempts and webhook events
- **Performance Monitoring**: Monitor gateway health and performance
- **Audit Trail**: Complete audit log for compliance

## Example Routing Rules

### 1. Amount-Based Routing
```json
{
  "conditions": {
    "amount": {
      "min": 0,
      "max": 100
    }
  },
  "actions": {
    "gateway_preference": ["gateway_1", "gateway_2"]
  }
}
```

### 2. Method-Based Routing
```json
{
  "conditions": {
    "payment_method": "upi"
  },
  "actions": {
    "gateway_preference": ["razorpay"]
  }
}
```

### 3. Load Balancing
```json
{
  "conditions": {
    "percentage_split": true
  },
  "actions": {
    "distribution": {
      "stripe": 60,
      "razorpay": 40
    }
  }
}
```