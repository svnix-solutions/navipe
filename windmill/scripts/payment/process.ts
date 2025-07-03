// Payment Processing Workflow
import { gatewayFactory } from '@routepay/factory';
import { PaymentRequest, GatewayConfig } from '@routepay/interfaces';

type TransactionInput = {
  transactionId: string;
  routingStrategy?: "default" | "failover" | "loadbalance";
};

// Define resource types for Windmill
type HasuraResource = {
  endpoint: string;
  admin_secret: string;
};

type PaymentGateway = {
  id: string;
  gateway_code: string;
  provider: string;
  credentials: any;
  priority: number;
};

type Transaction = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer_email?: string;
  metadata?: any;
  merchant: {
    id: string;
    merchant_gateways: Array<{
      gateway: PaymentGateway;
      priority: number;
      is_active: boolean;
    }>;
    routing_rules: Array<{
      rule_type: string;
      priority: number;
      conditions: any;
      actions: any;
      is_active: boolean;
    }>;
  };
};

export async function main(
  input: TransactionInput,
  hasura: HasuraResource
): Promise<{
  success: boolean;
  message: string;
  transactionId?: string;
  gatewayUsed?: string;
  gatewayTransactionId?: string;
  error?: string;
}> {
  try {
    // 1. Fetch transaction details with merchant config
    const transactionQuery = `
      query GetTransactionForProcessing($id: uuid!) {
        transactions_by_pk(id: $id) {
          id
          amount
          currency
          payment_method
          customer_email
          metadata
          status
          merchant {
            id
            merchant_gateways(where: {is_active: {_eq: true}}) {
              gateway {
                id
                gateway_code
                provider
                credentials
              }
              priority
              is_active
            }
            routing_rules(where: {is_active: {_eq: true}}, order_by: {priority: asc}) {
              rule_type
              priority
              conditions
              actions
              is_active
            }
          }
        }
      }
    `;

    const { data } = await makeHasuraRequest(hasura, transactionQuery, {
      id: input.transactionId
    });

    const transaction: Transaction = data.transactions_by_pk;

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "pending") {
      throw new Error(`Transaction is already ${transaction.status}`);
    }

    // 2. Update transaction status to processing
    await updateTransactionStatus(hasura, input.transactionId, "processing");

    // 3. Determine gateway based on routing rules
    const selectedGateway = await selectGateway(
      transaction,
      input.routingStrategy || "default"
    );

    if (!selectedGateway) {
      throw new Error("No suitable gateway found for this transaction");
    }

    // 4. Process payment with selected gateway
    const startTime = Date.now();
    let paymentResult;

    try {
      paymentResult = await processPaymentThroughGateway(
        transaction,
        selectedGateway
      );
    } catch (error) {
      // Log failed attempt
      await logRoutingAttempt(hasura, {
        transaction_id: input.transactionId,
        gateway_id: selectedGateway.id,
        attempt_number: 1,
        status: "failed",
        error_message: error.message,
        processing_time_ms: Date.now() - startTime
      });

      // Try failover if enabled
      if (input.routingStrategy === "failover") {
        // Implement failover logic here
      }

      throw error;
    }

    // 5. Log successful attempt
    await logRoutingAttempt(hasura, {
      transaction_id: input.transactionId,
      gateway_id: selectedGateway.id,
      attempt_number: 1,
      status: "success",
      processing_time_ms: Date.now() - startTime,
      response_payload: paymentResult
    });

    // 6. Update transaction with success
    await updateTransactionStatus(
      hasura,
      input.transactionId,
      "success",
      paymentResult.transactionId,
      paymentResult
    );

    return {
      success: true,
      message: "Payment processed successfully",
      transactionId: input.transactionId,
      gatewayUsed: selectedGateway.gateway_code,
      gatewayTransactionId: paymentResult.transactionId
    };

  } catch (error) {
    // Update transaction status to failed
    await updateTransactionStatus(
      hasura,
      input.transactionId,
      "failed",
      null,
      { error: error.message }
    );

    return {
      success: false,
      message: "Payment processing failed",
      error: error.message
    };
  }
}

async function makeHasuraRequest(
  hasura: HasuraResource,
  query: string,
  variables: any
) {
  const response = await fetch(hasura.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": hasura.admin_secret
    },
    body: JSON.stringify({ query, variables })
  });

  return response.json();
}

async function updateTransactionStatus(
  hasura: HasuraResource,
  transactionId: string,
  status: string,
  gatewayTransactionId?: string,
  gatewayResponse?: any
) {
  const mutation = `
    mutation UpdateTransactionStatus(
      $id: uuid!,
      $status: transaction_status!,
      $gateway_transaction_id: String,
      $gateway_response: jsonb
    ) {
      update_transactions_by_pk(
        pk_columns: {id: $id},
        _set: {
          status: $status,
          gateway_transaction_id: $gateway_transaction_id,
          gateway_response: $gateway_response
        }
      ) {
        id
      }
    }
  `;

  await makeHasuraRequest(hasura, mutation, {
    id: transactionId,
    status,
    gateway_transaction_id: gatewayTransactionId,
    gateway_response: gatewayResponse
  });
}

async function selectGateway(
  transaction: Transaction,
  strategy: string
): Promise<PaymentGateway | null> {
  // Apply routing rules
  for (const rule of transaction.merchant.routing_rules) {
    if (evaluateRule(rule, transaction)) {
      const gateway = applyRuleAction(
        rule,
        transaction.merchant.merchant_gateways
      );
      if (gateway) return gateway.gateway;
    }
  }

  // Default: use priority
  const sortedGateways = [...transaction.merchant.merchant_gateways]
    .sort((a, b) => a.priority - b.priority);

  return sortedGateways[0]?.gateway || null;
}

function evaluateRule(rule: any, transaction: Transaction): boolean {
  const conditions = rule.conditions;

  switch (rule.rule_type) {
    case "amount":
      if (conditions.amount) {
        const amount = transaction.amount;
        if (conditions.amount.min && amount < conditions.amount.min) return false;
        if (conditions.amount.max && amount > conditions.amount.max) return false;
      }
      break;

    case "method_based":
      if (conditions.payment_method) {
        return transaction.payment_method === conditions.payment_method;
      }
      break;

    case "gateway_priority":
      return true; // Always applies
  }

  return true;
}

function applyRuleAction(rule: any, merchantGateways: any[]): any {
  const actions = rule.actions;

  if (actions.preferred_gateway) {
    return merchantGateways.find(
      mg => mg.gateway.gateway_code === actions.preferred_gateway
    );
  }

  if (actions.use_priority) {
    return merchantGateways.sort((a, b) => a.priority - b.priority)[0];
  }

  return null;
}

async function logRoutingAttempt(hasura: HasuraResource, attempt: any) {
  const mutation = `
    mutation CreateRoutingAttempt($object: routing_attempts_insert_input!) {
      insert_routing_attempts_one(object: $object) {
        id
      }
    }
  `;

  await makeHasuraRequest(hasura, mutation, { object: attempt });
}

// Pluggable gateway processing
async function processPaymentThroughGateway(
  transaction: Transaction, 
  gatewayConfig: any
): Promise<any> {
  // Get the appropriate gateway implementation
  const gateway = gatewayFactory.createGateway(gatewayConfig.gateway.provider);
  
  if (!gateway) {
    throw new Error(`Unsupported gateway: ${gatewayConfig.gateway.provider}`);
  }

  // Prepare payment request
  const paymentRequest: PaymentRequest = {
    amount: transaction.amount,
    currency: transaction.currency,
    payment_method: transaction.payment_method,
    customer_email: transaction.customer_email,
    merchant_reference: transaction.id,
    metadata: transaction.metadata
  };

  // Prepare gateway configuration
  const config: GatewayConfig = {
    gateway_code: gatewayConfig.gateway.gateway_code,
    credentials: gatewayConfig.gateway.credentials,
    features: gatewayConfig.gateway.features,
    webhook_secret: gatewayConfig.gateway.webhook_secret
  };

  // Process payment through the gateway
  const result = await gateway.processPayment(paymentRequest, config);
  
  return {
    transactionId: result.gateway_transaction_id,
    status: result.status,
    amount: transaction.amount,
    currency: transaction.currency,
    success: result.success,
    gateway_response: result.gateway_response,
    redirect_url: result.redirect_url,
    error_message: result.error_message
  };
}