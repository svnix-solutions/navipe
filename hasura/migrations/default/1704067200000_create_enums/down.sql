-- Drop enum types

DROP TYPE IF EXISTS rule_type;
DROP TYPE IF EXISTS currency_code;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS merchant_status;
DROP TYPE IF EXISTS gateway_status;
DROP TYPE IF EXISTS transaction_status;

DROP EXTENSION IF EXISTS "uuid-ossp";