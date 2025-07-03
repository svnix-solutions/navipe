-- Create payment gateways table

CREATE TABLE payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    status gateway_status DEFAULT 'active',
    supported_methods payment_method[] NOT NULL,
    supported_currencies currency_code[] NOT NULL,
    api_endpoint VARCHAR(500),
    webhook_endpoint VARCHAR(500),
    credentials JSONB NOT NULL,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_payment_gateways_status ON payment_gateways(status);