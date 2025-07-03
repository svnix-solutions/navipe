# Claude Code Instructions

This document provides context and instructions for Claude Code when working on the NaviPe payment router platform.

## Project Overview

NaviPe is a payment routing platform built with:
- **PostgreSQL**: Database with separate databases for app data, Hasura metadata, and Windmill
- **Hasura GraphQL**: API layer with migrations-based schema management
- **Windmill**: Workflow automation for payment processing
- **Docker**: Containerized services

## Architecture

```
Payment Router Platform
├── PostgreSQL (Single server, multiple databases)
│   ├── routepay (main application data)
│   ├── hasura_metadata (Hasura internal data)
│   └── windmill (Windmill internal data)
├── Hasura GraphQL Engine
├── Windmill Workflows
└── PgAdmin (Database management)
```

## Key Technologies

- **Database**: PostgreSQL 15 with UUID, JSONB, and custom enums
- **API**: Hasura GraphQL with role-based permissions
- **Workflows**: Windmill TypeScript scripts
- **Container**: Docker Compose for local development

## Development Workflow

### Database Changes
- Always use Hasura CLI migrations (`hasura migrate create`)
- Never edit the database directly
- Export metadata after schema changes (`hasura metadata export`)
- Test migrations with up/down scripts

### Code Structure
```
routepay/
├── database/
│   └── init-databases.sql          # Database initialization only
├── hasura/
│   ├── config.yaml                 # Hasura CLI config
│   ├── migrations/default/         # Database migrations (schema)
│   ├── metadata/                   # Hasura metadata
│   └── seeds/default/              # Seed data
├── windmill/scripts/               # Workflow scripts
│   ├── payment/                    # Payment processing
│   └── webhooks/                   # Webhook handlers
├── docs/
│   ├── DATABASE.md                 # Database documentation
│   └── ...                        # Other documentation
├── docker-compose.yml              # Service definitions
├── setup-with-migrations.sh       # Setup script with migrations
└── MIGRATIONS.md                   # Migration guide
```

## Common Commands

### Setup
```bash
# Full setup with migrations
./setup-with-migrations.sh

# Basic setup
./setup.sh
```

### Database Migrations
```bash
cd hasura

# Create new migration
hasura migrate create "description" --admin-secret myadminsecret

# Apply migrations
hasura migrate apply --admin-secret myadminsecret

# Export metadata after changes
hasura metadata export --admin-secret myadminsecret
```

### Docker Operations
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f hasura
docker compose logs -f windmill

# Stop services
docker compose down
```

## Database Schema

### Core Tables
- `merchants`: Merchant accounts and API keys
- `payment_gateways`: Gateway configurations (Stripe, Razorpay, PayPal)
- `merchant_gateways`: Merchant-specific gateway settings
- `routing_rules`: Intelligent routing logic
- `transactions`: Payment transactions
- `routing_attempts`: Routing decision logs

### Key Features
- **Enums**: `transaction_status`, `payment_method`, `currency_code`
- **JSONB fields**: Flexible metadata and configuration storage
- **UUIDs**: Primary keys for all entities
- **Triggers**: Auto-update timestamps
- **Views**: Pre-joined data for common queries

## Payment Processing Flow

1. **Transaction Creation**: Merchant creates transaction via GraphQL
2. **Routing Decision**: Windmill selects optimal gateway based on rules
3. **Payment Processing**: Execute payment through selected gateway
4. **Status Updates**: Update transaction status via webhooks
5. **Merchant Notification**: Notify merchant of payment result

## Routing Logic

Intelligent routing based on:
- Transaction amount and currency
- Payment method (card, UPI, wallet)
- Gateway health metrics
- Merchant-specific rules
- Cost optimization

## Security Considerations

- API key authentication for merchants
- Row-level security in Hasura
- Encrypted gateway credentials
- Webhook signature verification
- Comprehensive audit logging

## Testing

### Local Testing
```bash
# Start services
./setup-with-migrations.sh

# Access services
- Hasura Console: http://localhost:8080/console
- Windmill: http://localhost:8000
- PgAdmin: http://localhost:8090

# Test with sample data (automatically seeded)
```

### API Testing
```graphql
# Create transaction
mutation {
  insert_transactions_one(object: {
    merchant_id: "merchant-uuid"
    amount: 100.50
    currency: USD
    payment_method: card
    customer_email: "test@example.com"
  }) {
    id
    transaction_ref
    status
  }
}
```

## Code Style Guidelines

### Database
- Use descriptive table and column names
- Always include created_at/updated_at timestamps
- Use UUIDs for primary keys
- Index frequently queried columns
- Use JSONB for flexible data

### TypeScript (Windmill)
- Use async/await for asynchronous operations
- Implement proper error handling
- Log important events and errors
- Use type definitions for better code quality

### Migrations
- Use descriptive migration names
- Always provide down migrations
- Test migrations before applying
- Keep migrations focused and atomic

## Troubleshooting

### Common Issues

1. **Migration Conflicts**
   ```bash
   hasura migrate status --admin-secret myadminsecret
   ```

2. **Service Connection Issues**
   ```bash
   docker compose ps
   docker compose logs servicename
   ```

3. **Database Connection**
   ```bash
   # Check PostgreSQL
   docker compose exec postgres psql -U routepay -d routepay
   ```

### Debug Mode

Enable debug logging:
```bash
# Hasura debug logs
HASURA_GRAPHQL_ENABLED_LOG_TYPES: startup,http-log,webhook-log,websocket-log,query-log

# Docker compose logs
docker compose logs -f --tail=100
```

## Performance Considerations

### Database
- Use appropriate indexes for query patterns
- Monitor query performance with EXPLAIN
- Use connection pooling
- Regular VACUUM and ANALYZE

### Hasura
- Optimize GraphQL queries
- Use appropriate permissions and filters
- Monitor query complexity
- Cache frequently accessed data

## Deployment Notes

### Environment Variables
- Use different admin secrets for each environment
- Encrypt sensitive gateway credentials
- Configure proper database URLs
- Set appropriate connection limits

### Production Considerations
- Use managed PostgreSQL service
- Enable SSL/TLS for all connections
- Set up monitoring and alerting
- Implement proper backup strategies
- Use secrets management for credentials

## Additional Resources

- [Hasura Documentation](https://hasura.io/docs/)
- [Windmill Documentation](https://docs.windmill.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Project Documentation

1. **CLAUDE.md** (this file) - Claude Code instructions and context
2. **README.md** - General project overview and setup
3. **MIGRATIONS.md** - Database migration workflows
4. **docs/DATABASE.md** - Detailed database schema documentation

## Support

For development questions:
1. Check this CLAUDE.md file for context and guidelines
2. Review MIGRATIONS.md for database migration workflows
3. Check docs/DATABASE.md for schema details
4. See README.md for general setup instructions