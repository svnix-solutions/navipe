-- Create merchant gateways table

CREATE TABLE merchant_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    merchant_gateway_id VARCHAR(255),
    credentials JSONB,
    fee_percentage DECIMAL(5,4) DEFAULT 0,
    fee_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, gateway_id)
);

-- Create indexes
CREATE INDEX idx_merchant_gateways_active ON merchant_gateways(merchant_id, is_active);