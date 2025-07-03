-- Seed data for Payment Router Platform

-- Insert sample payment gateways
INSERT INTO payment_gateways (gateway_code, name, provider, supported_methods, supported_currencies, api_endpoint, credentials) VALUES
('stripe_main', 'Stripe Main', 'stripe', ARRAY['card', 'bank_transfer']::payment_method[], ARRAY['USD', 'EUR', 'GBP']::currency_code[], 'https://api.stripe.com', '{"api_key": "encrypted_stripe_key"}'),
('razorpay_main', 'Razorpay Main', 'razorpay', ARRAY['card', 'upi', 'wallet']::payment_method[], ARRAY['INR']::currency_code[], 'https://api.razorpay.com', '{"key_id": "encrypted_razorpay_key", "key_secret": "encrypted_razorpay_secret"}'),
('paypal_main', 'PayPal Main', 'paypal', ARRAY['card', 'wallet']::payment_method[], ARRAY['USD', 'EUR', 'GBP', 'AUD']::currency_code[], 'https://api.paypal.com', '{"client_id": "encrypted_paypal_client", "client_secret": "encrypted_paypal_secret"}');

-- Insert sample merchants
INSERT INTO merchants (merchant_code, name, email, api_key, webhook_url) VALUES
('MERCH001', 'Acme Corporation', 'payments@acmecorp.com', 'mk_test_acme_1234567890', 'https://acmecorp.com/webhooks/payments'),
('MERCH002', 'Global Retail Inc', 'finance@globalretail.com', 'mk_test_global_0987654321', 'https://globalretail.com/api/payment-webhook');

-- Link merchants to gateways
INSERT INTO merchant_gateways (merchant_id, gateway_id, priority, merchant_gateway_id, fee_percentage, fee_fixed)
SELECT 
    m.id, 
    g.id, 
    CASE 
        WHEN g.gateway_code = 'stripe_main' THEN 1
        WHEN g.gateway_code = 'razorpay_main' THEN 2
        WHEN g.gateway_code = 'paypal_main' THEN 3
    END,
    CASE 
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH001' THEN 'acct_1234567890'
        WHEN g.gateway_code = 'razorpay_main' AND m.merchant_code = 'MERCH001' THEN 'acc_ABC123456789'
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH001' THEN 'PAYPAL_ACME_001'
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH002' THEN 'acct_0987654321'
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH002' THEN 'PAYPAL_GLOBAL_001'
    END,
    CASE 
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH001' THEN 0.029
        WHEN g.gateway_code = 'razorpay_main' AND m.merchant_code = 'MERCH001' THEN 0.02
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH001' THEN 0.0349
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH002' THEN 0.025
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH002' THEN 0.029
    END,
    CASE 
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH001' THEN 0.30
        WHEN g.gateway_code = 'razorpay_main' AND m.merchant_code = 'MERCH001' THEN 0
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH001' THEN 0.49
        WHEN g.gateway_code = 'stripe_main' AND m.merchant_code = 'MERCH002' THEN 0.25
        WHEN g.gateway_code = 'paypal_main' AND m.merchant_code = 'MERCH002' THEN 0.30
    END
FROM merchants m
CROSS JOIN payment_gateways g
WHERE (m.merchant_code = 'MERCH001' AND g.gateway_code IN ('stripe_main', 'razorpay_main', 'paypal_main'))
   OR (m.merchant_code = 'MERCH002' AND g.gateway_code IN ('stripe_main', 'paypal_main'));

-- Insert routing rules
INSERT INTO routing_rules (merchant_id, name, description, rule_type, priority, conditions, actions)
SELECT 
    m.id,
    'Small Amount to Razorpay',
    'Route small transactions through Razorpay',
    'amount',
    10,
    '{"amount": {"max": 50}, "currency": "INR"}',
    '{"preferred_gateway": "razorpay_main"}'
FROM merchants m WHERE m.merchant_code = 'MERCH001'

UNION ALL

SELECT 
    m.id,
    'UPI Routing',
    'Route all UPI payments through Razorpay',
    'method_based',
    5,
    '{"payment_method": "upi"}',
    '{"preferred_gateway": "razorpay_main"}'
FROM merchants m WHERE m.merchant_code = 'MERCH001'

UNION ALL

SELECT 
    m.id,
    'Load Balance High Value',
    'Distribute high-value transactions',
    'percentage',
    15,
    '{"amount": {"min": 1000}}',
    '{"distribution": {"stripe_main": 70, "paypal_main": 30}}'
FROM merchants m WHERE m.merchant_code = 'MERCH002'

UNION ALL

SELECT 
    m.id,
    'Default Gateway Priority',
    'Use gateway priority for routing',
    'gateway_priority',
    100,
    '{}',
    '{"use_priority": true}'
FROM merchants m WHERE m.merchant_code = 'MERCH001';