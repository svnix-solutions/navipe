# Windmill Resources Configuration

This document explains how to configure resources in Windmill for the NaviPe platform.

## What are Windmill Resources?

Windmill Resources are a secure way to store and manage credentials, configurations, and connections to external services. Instead of hardcoding sensitive information in scripts, you define resources that can be reused across multiple workflows.

## Required Resources for NaviPe

### Hasura Resource (Only Resource Needed!)

**Resource Type**: `object`
**Resource Name**: `hasura_config`

```json
{
  "endpoint": "http://routepay-hasura:8080/v1/graphql",
  "admin_secret": "myadminsecret"
}
```

**Usage in Scripts**:
```typescript
export async function main(
  input: any,
  hasura: {
    endpoint: string;
    admin_secret: string;
  }
) {
  // All database operations via GraphQL
  const response = await makeHasuraRequest(hasura, query, variables);
}
```

### Why Only Hasura?

We use **GraphQL-only approach** instead of direct PostgreSQL connections because:

- ✅ **Simpler**: Only one resource to configure
- ✅ **Secure**: Hasura handles all permissions and validation
- ✅ **Consistent**: Same API layer used everywhere
- ✅ **Type-safe**: GraphQL provides strong typing
- ✅ **Optimized**: Hasura's query optimization and caching

See [WINDMILL_GRAPHQL_APPROACH.md](WINDMILL_GRAPHQL_APPROACH.md) for detailed explanation.

## Setting up Resources in Windmill

### Via Windmill UI

1. **Access Windmill**: Go to http://localhost:8000
2. **Navigate to Resources**: Click on "Resources" in the sidebar
3. **Create New Resource**: Click "New Resource"
4. **Configure Resource**:
   - **Type**: Select "object"
   - **Path**: Enter resource name (e.g., `u/admin/hasura_config`)
   - **Value**: Enter the JSON configuration

### Via Windmill CLI

```bash
# Install Windmill CLI
npm install -g windmill-cli

# Login
wmill workspace add routepay http://localhost:8000

# Create resources
wmill resource create object u/admin/hasura_config '{
  "endpoint": "http://postgres:8080/v1/graphql",
  "admin_secret": "myadminsecret"
}'

wmill resource create object u/admin/postgres_config '{
  "host": "postgres",
  "port": 5432,
  "database": "routepay",
  "username": "routepay",
  "password": "routepay123"
}'
```

## Resource Structure

### Development Environment
```json
{
  "hasura": {
    "endpoint": "http://routepay-hasura:8080/v1/graphql",
    "admin_secret": "myadminsecret"
  },
  "postgres": {
    "host": "routepay-postgres",
    "port": 5432,
    "database": "routepay",
    "username": "routepay",
    "password": "routepay123"
  }
}
```

### Production Environment
```json
{
  "hasura": {
    "endpoint": "https://hasura.yourdomain.com/v1/graphql",
    "admin_secret": "$HASURA_ADMIN_SECRET"
  },
  "postgres": {
    "host": "your-postgres-host.com",
    "port": 5432,
    "database": "routepay_prod",
    "username": "routepay_user",
    "password": "$POSTGRES_PASSWORD"
  }
}
```

## Script Configuration

### Function Signatures

All Windmill scripts should follow this pattern:

```typescript
export async function main(
  // Input parameters
  input: YourInputType,
  
  // Resources (automatically injected by Windmill)
  hasura: HasuraResource,
  postgres: PostgresResource,
  
  // Optional: other resources
  stripe?: StripeResource,
  slack?: SlackResource
): Promise<YourReturnType> {
  // Script logic here
}
```

### Resource Types

Define clear TypeScript types for your resources:

```typescript
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

type StripeResource = {
  secret_key: string;
  webhook_secret: string;
};
```

## Security Best Practices

### 1. Environment Variables
Use environment variables for sensitive values:

```json
{
  "admin_secret": "$HASURA_ADMIN_SECRET",
  "password": "$POSTGRES_PASSWORD"
}
```

### 2. Resource Permissions
- Set appropriate permissions on resources
- Use workspace-level or group-level resources for shared configurations
- Use user-level resources for personal configurations

### 3. Connection Pooling
Always close database connections:

```typescript
const pool = new Pool(postgres);
try {
  const result = await pool.query(query, params);
  return result.rows;
} finally {
  await pool.end();
}
```

## Troubleshooting

### Common Issues

1. **Resource Not Found**
   ```
   Error: Resource 'hasura_config' not found
   ```
   **Solution**: Ensure the resource is created and the path is correct

2. **Connection Refused**
   ```
   Error: connect ECONNREFUSED
   ```
   **Solution**: Check if services are running and network configuration

3. **Authentication Failed**
   ```
   Error: Invalid admin secret
   ```
   **Solution**: Verify the admin secret in the resource configuration

### Debug Tips

1. **Log Resource Values** (be careful with sensitive data):
   ```typescript
   console.log("Hasura endpoint:", hasura.endpoint);
   // DON'T log secrets in production!
   ```

2. **Test Connections**:
   ```typescript
   // Test Hasura connection
   const response = await fetch(hasura.endpoint, {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "x-hasura-admin-secret": hasura.admin_secret
     },
     body: JSON.stringify({
       query: "{ __schema { queryType { name } } }"
     })
   });
   ```

3. **Validate Resource Structure**:
   ```typescript
   if (!hasura.endpoint || !hasura.admin_secret) {
     throw new Error("Invalid Hasura resource configuration");
   }
   ```

## Environment-Specific Configuration

### Docker Compose (Development)
Service names in Docker Compose network:
- Hasura: `routepay-hasura:8080`
- PostgreSQL: `routepay-postgres:5432`

### Production
Use actual hostnames or IP addresses:
- Hasura: `hasura.yourdomain.com`
- PostgreSQL: `postgres.internal.yourdomain.com`

## Migration Guide

If you're updating from `Resource<"type">` to the object approach:

### Before
```typescript
export async function main(
  input: any,
  hasura: Resource<"hasura">
) {
  // This doesn't work
}
```

### After
```typescript
type HasuraResource = {
  endpoint: string;
  admin_secret: string;
};

export async function main(
  input: any,
  hasura: HasuraResource
) {
  // This works correctly
}
```

## Additional Resources

- [Windmill Resources Documentation](https://docs.windmill.dev/docs/core_concepts/resources_and_types)
- [Windmill TypeScript Documentation](https://docs.windmill.dev/docs/getting_started/scripts_quickstart/typescript)
- [PostgreSQL Node.js Driver](https://node-postgres.com/)