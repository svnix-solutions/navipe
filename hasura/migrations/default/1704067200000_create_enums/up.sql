-- Create enum types for the payment router platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'success', 'failed', 'refunded', 'cancelled');
CREATE TYPE gateway_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE merchant_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE payment_method AS ENUM ('card', 'bank_transfer', 'upi', 'wallet', 'crypto');
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY');
CREATE TYPE rule_type AS ENUM ('percentage', 'volume', 'amount', 'gateway_priority', 'method_based');