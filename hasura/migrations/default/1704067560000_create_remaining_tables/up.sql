-- Create remaining tables

-- Transaction routing attempts
CREATE TABLE routing_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
    attempt_number INTEGER NOT NULL,
    status transaction_status NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table for logging
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    gateway_id UUID REFERENCES payment_gateways(id),
    merchant_id UUID REFERENCES merchants(id),
    transaction_id UUID REFERENCES transactions(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gateway health metrics
CREATE TABLE gateway_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id) ON DELETE CASCADE,
    success_rate DECIMAL(5,2),
    average_response_time_ms INTEGER,
    total_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    measurement_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    measurement_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_routing_attempts_transaction ON routing_attempts(transaction_id);
CREATE INDEX idx_webhooks_transaction ON webhooks(transaction_id);
CREATE INDEX idx_webhooks_processed ON webhooks(processed);
CREATE INDEX idx_gateway_health_metrics_gateway ON gateway_health_metrics(gateway_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);