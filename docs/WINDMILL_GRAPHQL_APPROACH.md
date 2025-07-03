# Windmill Scripts: GraphQL-Only Approach

This document explains why and how we use Hasura GraphQL APIs exclusively in Windmill scripts instead of direct PostgreSQL connections.

## Why GraphQL Over Direct PostgreSQL?

### ✅ Benefits of Using Hasura GraphQL

1. **Single Source of Truth**: Hasura is already managing our database schema and relationships
2. **Type Safety**: GraphQL provides strong typing and validation
3. **Security**: Hasura handles authentication, authorization, and permissions
4. **Consistency**: Same API layer used by frontend and backend
5. **Caching**: Hasura provides built-in query optimization and caching
6. **Real-time**: GraphQL subscriptions for real-time updates
7. **Simpler Resource Management**: Only need Hasura endpoint + admin secret

### ❌ Problems with Direct PostgreSQL

1. **Duplicate Logic**: Recreating database access patterns that Hasura already provides
2. **Security Risks**: Direct database access bypasses Hasura's security layer
3. **Connection Management**: Need to handle connection pooling, timeouts, etc.
4. **Schema Coupling**: Scripts become tightly coupled to database schema
5. **Maintenance Overhead**: Need to maintain both GraphQL and SQL queries

## Implementation Examples

### Before: Direct PostgreSQL
```typescript
// ❌ Complex connection management
import { Pool } from "pg";

async function getAvailableGateways(postgres: PostgresResource) {
  const pool = new Pool({
    host: postgres.host,
    port: postgres.port,
    database: postgres.database,
    user: postgres.username,
    password: postgres.password,
  });

  const query = `
    SELECT mg.gateway_id, g.gateway_code, mg.priority
    FROM merchant_gateways mg
    JOIN payment_gateways g ON mg.gateway_id = g.id
    WHERE mg.merchant_id = $1 AND mg.is_active = true
    ORDER BY mg.priority
  `;

  const result = await pool.query(query, [merchant_id]);
  await pool.end(); // Don't forget to close!
  return result.rows;
}
```

### After: Hasura GraphQL
```typescript
// ✅ Clean, type-safe GraphQL
async function getAvailableGateways(hasura: HasuraResource) {
  const query = `
    query GetAvailableGateways($merchant_id: uuid!) {
      merchant_gateways(
        where: {
          merchant_id: {_eq: $merchant_id},
          is_active: {_eq: true},
          gateway: {status: {_eq: "active"}}
        },
        order_by: {priority: asc}
      ) {
        gateway_id
        priority
        gateway {
          gateway_code
        }
      }
    }
  `;

  const response = await makeHasuraRequest(hasura, query, { merchant_id });
  return response.data.merchant_gateways;
}
```

## Resource Configuration

### Single Resource Required
```json
{
  "endpoint": "http://routepay-hasura:8080/v1/graphql",
  "admin_secret": "myadminsecret"
}
```

### Script Function Signature
```typescript
export async function main(
  input: InputType,
  hasura: HasuraResource  // Only resource needed!
): Promise<OutputType> {
  // All database operations through GraphQL
}
```

## Common GraphQL Patterns

### 1. Simple Query
```typescript
const query = `
  query GetTransaction($id: uuid!) {
    transactions_by_pk(id: $id) {
      id
      status
      amount
      merchant {
        name
        webhook_url
      }
    }
  }
`;
```

### 2. Complex Filtering
```typescript
const query = `
  query GetActiveGateways($merchant_id: uuid!, $method: payment_method!) {
    merchant_gateways(
      where: {
        merchant_id: {_eq: $merchant_id},
        is_active: {_eq: true},
        gateway: {
          status: {_eq: "active"},
          supported_methods: {_has_key: $method}
        }
      }
    ) {
      gateway {
        id
        gateway_code
        provider
      }
    }
  }
`;
```

### 3. Aggregations
```typescript
const query = `
  query GetGatewayHealth($gateway_ids: [uuid!]!, $since: timestamptz!) {
    gateway_health_metrics_aggregate(
      where: {
        gateway_id: {_in: $gateway_ids},
        created_at: {_gt: $since}
      }
      group_by: [gateway_id]
    ) {
      aggregate {
        avg {
          success_rate
          average_response_time_ms
        }
      }
      nodes {
        gateway_id
      }
    }
  }
`;
```

### 4. Mutations
```typescript
const mutation = `
  mutation UpdateTransactionStatus(
    $id: uuid!,
    $status: transaction_status!,
    $gateway_response: jsonb
  ) {
    update_transactions_by_pk(
      pk_columns: {id: $id},
      _set: {
        status: $status,
        gateway_response: $gateway_response
      }
    ) {
      id
      status
    }
  }
`;
```

## Helper Function

### Reusable Hasura Request Function
```typescript
async function makeHasuraRequest(
  hasura: HasuraResource,
  query: string,
  variables: any
): Promise<any> {
  const response = await fetch(hasura.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": hasura.admin_secret
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Hasura request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result;
}
```

## Updated Script Structure

### 1. Payment Processing Script
```typescript
// windmill/scripts/payment/process.ts
export async function main(
  input: TransactionInput,
  hasura: HasuraResource  // Only Hasura needed
): Promise<ProcessResult> {
  // All database operations via GraphQL
  const transaction = await getTransactionDetails(hasura, input.transactionId);
  const routing = await determineRouting(hasura, transaction);
  const result = await processPayment(hasura, transaction, routing);
  return result;
}
```

### 2. Webhook Handler
```typescript
// windmill/scripts/webhooks/gateway-webhook.ts  
export async function main(
  payload: WebhookPayload,
  hasura: HasuraResource  // Only Hasura needed
): Promise<WebhookResult> {
  // All database operations via GraphQL
  const transaction = await findTransaction(hasura, payload);
  await updateTransactionStatus(hasura, transaction, payload);
  await notifyMerchant(hasura, transaction);
  return { success: true };
}
```

### 3. Routing Engine
```typescript
// windmill/scripts/payment/routing-engine.ts
export async function main(
  transaction: TransactionData,
  hasura: HasuraResource  // Only Hasura needed
): Promise<RoutingDecision> {
  // All database operations via GraphQL
  const gateways = await getAvailableGateways(hasura, transaction);
  const health = await getGatewayHealth(hasura, gateways);
  const rules = await getRoutingRules(hasura, transaction.merchant_id);
  return calculateBestGateway(gateways, health, rules);
}
```

## Advantages in Practice

### 1. Simplified Dependencies
- **Before**: `pg`, `windmill-client`, custom connection management
- **After**: Just `fetch` (built-in) and Hasura endpoint

### 2. Better Error Handling
```typescript
// GraphQL errors are structured and informative
if (result.errors) {
  throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
}
```

### 3. Type Safety
```typescript
// GraphQL schema provides strong typing
interface Transaction {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  amount: number;
  merchant: {
    name: string;
    webhook_url?: string;
  };
}
```

### 4. Consistent Authorization
- All queries go through Hasura's permission system
- No need to implement database-level security in scripts
- Row-level security handled automatically

## Migration Summary

### Files Updated
- ✅ `windmill/scripts/payment/process.ts` - Removed PostgreSQL dependency
- ✅ `windmill/scripts/payment/routing-engine.ts` - Pure GraphQL implementation  
- ✅ `windmill/scripts/webhooks/gateway-webhook.ts` - GraphQL-only approach

### Resource Changes
- ❌ **Removed**: PostgreSQL resource configuration
- ✅ **Kept**: Hasura resource (endpoint + admin_secret)

### Benefits Achieved
1. **Simpler Scripts**: Less boilerplate code
2. **Better Performance**: Hasura's optimized query engine
3. **Consistency**: Same API layer across all components
4. **Maintainability**: Single source of truth for data access
5. **Security**: Centralized authorization through Hasura

This approach aligns with GraphQL best practices and leverages Hasura's full capabilities while keeping Windmill scripts clean and focused on business logic.