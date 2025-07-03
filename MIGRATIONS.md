# Database Migrations with Hasura CLI

This project uses Hasura CLI for database migrations, providing proper version control and tracking of database changes.

## Prerequisites

Install Hasura CLI:
```bash
curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
```

## Migration Workflow

### 1. Initial Setup
```bash
# Run the setup script (includes migrations)
./setup-with-migrations.sh
```

### 2. Making Database Changes

#### Creating a New Migration
```bash
cd hasura

# Create a new migration for schema changes
hasura migrate create "add_new_table" --admin-secret myadminsecret

# This creates:
# migrations/default/{timestamp}_add_new_table/up.sql
# migrations/default/{timestamp}_add_new_table/down.sql
```

#### Applying Migrations
```bash
# Apply all pending migrations
hasura migrate apply --admin-secret myadminsecret

# Apply specific migration
hasura migrate apply --version 1704067200000 --admin-secret myadminsecret
```

#### Rolling Back Migrations
```bash
# Rollback to specific version
hasura migrate apply --down 1 --admin-secret myadminsecret

# Rollback specific migration
hasura migrate apply --version 1704067200000 --type down --admin-secret myadminsecret
```

### 3. Managing Metadata

#### Export Current Metadata
```bash
# Export current Hasura metadata (relationships, permissions, etc.)
hasura metadata export --admin-secret myadminsecret
```

#### Apply Metadata
```bash
# Apply metadata to Hasura
hasura metadata apply --admin-secret myadminsecret
```

#### Reset Metadata
```bash
# Clear and reload metadata
hasura metadata clear --admin-secret myadminsecret
hasura metadata reload --admin-secret myadminsecret
```

### 4. Seed Data

#### Applying Seeds
```bash
# Apply all seed files
hasura seed apply --admin-secret myadminsecret

# Apply specific seed file
hasura seed apply --file seeds/default/1704067680000_seed_data.sql --admin-secret myadminsecret
```

## Migration Structure

```
hasura/
├── config.yaml                    # Hasura project config
├── migrations/
│   └── default/
│       ├── 1704067200000_create_enums/
│       │   ├── up.sql             # Forward migration
│       │   └── down.sql           # Rollback migration
│       ├── 1704067260000_create_merchants_table/
│       │   ├── up.sql
│       │   └── down.sql
│       └── ...
├── metadata/
│   ├── version.yaml
│   ├── databases/
│   │   ├── databases.yaml
│   │   └── default/
│   │       └── tables/
│   │           ├── tables.yaml
│   │           ├── public_merchants.yaml
│   │           └── ...
└── seeds/
    └── default/
        └── 1704067680000_seed_data.sql
```

## Common Workflows

### Adding a New Table

1. **Create Migration**
   ```bash
   hasura migrate create "add_payments_table" --admin-secret myadminsecret
   ```

2. **Edit up.sql**
   ```sql
   CREATE TABLE payments (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       amount DECIMAL(10,2) NOT NULL,
       -- ... other columns
   );
   
   CREATE INDEX idx_payments_amount ON payments(amount);
   ```

3. **Edit down.sql**
   ```sql
   DROP TABLE IF EXISTS payments;
   ```

4. **Apply Migration**
   ```bash
   hasura migrate apply --admin-secret myadminsecret
   ```

5. **Track Table in Hasura**
   - Go to Hasura Console
   - Track the new table
   - Set up relationships and permissions

6. **Export Metadata**
   ```bash
   hasura metadata export --admin-secret myadminsecret
   ```

### Modifying Existing Table

1. **Create Migration**
   ```bash
   hasura migrate create "add_column_to_merchants" --admin-secret myadminsecret
   ```

2. **Edit up.sql**
   ```sql
   ALTER TABLE merchants ADD COLUMN phone VARCHAR(20);
   CREATE INDEX idx_merchants_phone ON merchants(phone);
   ```

3. **Edit down.sql**
   ```sql
   DROP INDEX IF EXISTS idx_merchants_phone;
   ALTER TABLE merchants DROP COLUMN IF EXISTS phone;
   ```

### Environment-Specific Migrations

For different environments (dev, staging, prod):

```bash
# Development
hasura migrate apply --admin-secret dev_secret

# Staging
hasura migrate apply --endpoint https://staging-hasura.com --admin-secret staging_secret

# Production
hasura migrate apply --endpoint https://prod-hasura.com --admin-secret prod_secret
```

## Best Practices

1. **Always create down migrations** for rollback capability
2. **Use descriptive migration names** that explain the change
3. **Test migrations locally** before applying to production
4. **Export metadata after schema changes** to keep it in sync
5. **Use transactions** in complex migrations
6. **Review migration order** - migrations are applied in timestamp order
7. **Backup production data** before applying migrations

## Troubleshooting

### Migration Conflicts
```bash
# Check migration status
hasura migrate status --admin-secret myadminsecret

# Squash migrations if needed
hasura migrate squash --name "squashed_migration" --from 1704067200000 --admin-secret myadminsecret
```

### Reset Everything
```bash
# Reset database to initial state
hasura migrate apply --down all --admin-secret myadminsecret
hasura migrate apply --admin-secret myadminsecret
hasura metadata apply --admin-secret myadminsecret
```

### Manual SQL Execution
```bash
# Execute raw SQL
hasura migrate create "manual_fix" --sql-from-file fix.sql --admin-secret myadminsecret
```