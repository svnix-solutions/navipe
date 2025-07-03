-- Create transactions table

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_ref VARCHAR(100) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    gateway_id UUID REFERENCES payment_gateways(id),
    amount DECIMAL(10,2) NOT NULL,
    currency currency_code NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status DEFAULT 'pending',
    gateway_transaction_id VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    billing_address JSONB,
    metadata JSONB DEFAULT '{}',
    gateway_response JSONB,
    fees DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- Auto-generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_ref() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_ref IS NULL OR NEW.transaction_ref = '' THEN
        NEW.transaction_ref := 'TXN' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_transaction_ref
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_ref();