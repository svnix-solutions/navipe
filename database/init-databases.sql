-- Create multiple databases on the same PostgreSQL server
-- This script runs as the postgres superuser during initialization

-- Create databases
CREATE DATABASE routepay;
CREATE DATABASE hasura_metadata;
CREATE DATABASE windmill;

-- Grant all privileges to the main user (routepay) on all databases
GRANT ALL PRIVILEGES ON DATABASE routepay TO routepay;
GRANT ALL PRIVILEGES ON DATABASE hasura_metadata TO routepay;
GRANT ALL PRIVILEGES ON DATABASE windmill TO routepay;

-- Connect to each database and grant schema permissions
\c routepay
GRANT ALL ON SCHEMA public TO routepay;

\c hasura_metadata
GRANT ALL ON SCHEMA public TO routepay;

\c windmill
GRANT ALL ON SCHEMA public TO routepay;

-- Switch back to routepay database for the main schema
\c routepay