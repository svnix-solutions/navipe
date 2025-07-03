-- Drop triggers and views

DROP VIEW IF EXISTS transaction_summary;
DROP VIEW IF EXISTS active_merchant_gateways;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON routing_rules;
DROP TRIGGER IF EXISTS update_merchant_gateways_updated_at ON merchant_gateways;
DROP TRIGGER IF EXISTS update_payment_gateways_updated_at ON payment_gateways;
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;

DROP FUNCTION IF EXISTS update_updated_at_column();