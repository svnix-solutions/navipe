-- Create triggers and views

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_gateways_updated_at 
    BEFORE UPDATE ON payment_gateways 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_gateways_updated_at 
    BEFORE UPDATE ON merchant_gateways 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at 
    BEFORE UPDATE ON routing_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW active_merchant_gateways AS
SELECT 
    mg.*,
    m.name as merchant_name,
    m.merchant_code,
    g.name as gateway_name,
    g.gateway_code,
    g.provider,
    g.supported_methods,
    g.supported_currencies
FROM merchant_gateways mg
JOIN merchants m ON mg.merchant_id = m.id
JOIN payment_gateways g ON mg.gateway_id = g.id
WHERE mg.is_active = true 
    AND m.status = 'active' 
    AND g.status = 'active';

CREATE VIEW transaction_summary AS
SELECT 
    t.*,
    m.name as merchant_name,
    m.merchant_code,
    g.name as gateway_name,
    g.gateway_code,
    g.provider as gateway_provider
FROM transactions t
JOIN merchants m ON t.merchant_id = m.id
LEFT JOIN payment_gateways g ON t.gateway_id = g.id;