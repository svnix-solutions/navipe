# Windmill Scripts: Resource Implementation Fixes

This document summarizes the fixes applied to the Windmill scripts to correctly handle resource management.

## Issues Fixed

### 1. Incorrect Resource Types

**❌ Before (Incorrect)**:
```typescript
import { Resource, getResource } from "windmill-client";

export async function main(
  input: any,
  hasura: Resource<"hasura">,          // ❌ Not a valid Windmill resource type
  postgres: Resource<"postgresql">     // ❌ Incorrect usage
) {
  // This doesn't work properly
}
```

**✅ After (Correct)**:
```typescript
import { Pool } from "pg";

type HasuraResource = {
  endpoint: string;
  admin_secret: string;
};

type PostgresResource = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export async function main(
  input: any,
  hasura: HasuraResource,             // ✅ Direct object type
  postgres: PostgresResource          // ✅ Direct object type
) {
  // This works correctly
}
```

### 2. Database Connection Handling

**❌ Before (Incorrect)**:
```typescript
// Assuming postgres.query() exists (it doesn't)
const result = await postgres.query(query, params);
```

**✅ After (Correct)**:
```typescript
// Proper PostgreSQL connection using pg Pool
const pool = new Pool({
  host: postgres.host,
  port: postgres.port,
  database: postgres.database,
  user: postgres.username,
  password: postgres.password,
});

try {
  const result = await pool.query(query, params);
  return result.rows;
} finally {
  await pool.end(); // Always close connections
}
```

## Files Updated

### 1. `/windmill/scripts/payment/process.ts`
- Fixed main function signature
- Updated all helper functions to use correct types
- Proper Hasura and PostgreSQL resource handling

### 2. `/windmill/scripts/payment/routing-engine.ts`
- Fixed main function signature  
- Updated database query functions
- Added proper connection pooling

### 3. `/windmill/scripts/webhooks/gateway-webhook.ts`
- Fixed main function signature
- Updated all webhook handler functions
- Fixed database and Hasura request functions

## Resource Configuration Required

To use these scripts, you need to create the following resources in Windmill:

### Hasura Resource
```json
{
  "endpoint": "http://routepay-hasura:8080/v1/graphql",
  "admin_secret": "myadminsecret"
}
```

### PostgreSQL Resource  
```json
{
  "host": "routepay-postgres",
  "port": 5432,
  "database": "routepay",
  "username": "routepay",
  "password": "routepay123"
}
```

## Key Changes Summary

### Type Definitions
- Added proper TypeScript types for resources
- Removed dependency on non-existent `Resource<"hasura">` type
- Used direct object types for better type safety

### Database Connections
- Replaced incorrect `postgres.query()` calls
- Added proper PostgreSQL Pool management
- Ensured connections are properly closed

### Function Signatures
- Updated all function parameters to use correct types
- Maintained consistent naming and structure
- Added proper error handling

### Import Changes
- Removed unused `getResource` import
- Added `Pool` import from `pg` package
- Simplified import structure

## Benefits of the Fix

1. **Type Safety**: Proper TypeScript types prevent runtime errors
2. **Resource Management**: Correct database connection handling
3. **Performance**: Proper connection pooling
4. **Maintainability**: Clear, consistent code structure
5. **Reliability**: Proper error handling and connection cleanup

## Testing the Scripts

After creating the resources in Windmill, test the scripts:

1. **Payment Processing**:
   ```typescript
   // Call the process payment script
   const result = await processPayment({
     transactionId: "uuid-here",
     routingStrategy: "default"
   });
   ```

2. **Webhook Handling**:
   ```typescript
   // Test webhook processing
   const result = await handleGatewayWebhook({
     gateway: "stripe",
     event_type: "payment.success",
     data: { /* webhook payload */ }
   });
   ```

3. **Routing Engine**:
   ```typescript
   // Test routing decisions
   const decision = await routingEngine({
     amount: 100.50,
     currency: "USD",
     payment_method: "card",
     merchant_id: "merchant-uuid"
   });
   ```

## Troubleshooting

### Common Issues

1. **Resource Not Found**: Ensure resources are created with correct names and paths
2. **Connection Errors**: Verify database/Hasura service connectivity  
3. **Type Errors**: Check that resource objects match the expected structure

### Debug Tips

1. Log resource configurations (without sensitive data)
2. Test database connectivity separately
3. Verify Hasura endpoint accessibility
4. Check Windmill logs for detailed error messages

## Next Steps

1. Create the required resources in Windmill UI/CLI
2. Deploy the updated scripts to Windmill
3. Test each workflow end-to-end
4. Monitor performance and adjust connection pooling as needed

See [WINDMILL_RESOURCES.md](WINDMILL_RESOURCES.md) for detailed resource setup instructions.