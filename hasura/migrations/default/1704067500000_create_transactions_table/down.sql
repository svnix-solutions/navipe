-- Drop transactions table

DROP TRIGGER IF EXISTS trigger_generate_transaction_ref ON transactions;
DROP FUNCTION IF EXISTS generate_transaction_ref();
DROP TABLE IF EXISTS transactions;