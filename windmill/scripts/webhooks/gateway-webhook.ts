// Gateway Webhook Handler
import { gatewayFactory } from "../payment/gateway-factory.ts";
import { WebhookVerificationRequest, GatewayConfig } from "../payment/interfaces.ts";

type WebhookPayload = {
  gateway: string;
  event_type: string;
  data: any;
  signature?: string;
  headers?: Record<string, string>;
  body?: string;
};

type HasuraResource = {
  endpoint: string;
  admin_secret: string;
};

export async function main(
  payload: WebhookPayload,
  hasura: HasuraResource
): Promise<{
  success: boolean;
  message: string;
  processed: boolean;
}> {
  try {
    // 1. Verify webhook signature (gateway-specific)
    const isValid = await verifyWebhookSignature(payload, hasura);
    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }

    // 2. Log webhook receipt
    const webhookId = await logWebhook(hasura, {
      source: "gateway",
      event_type: payload.event_type,
      payload: payload.data,
      gateway_code: payload.gateway
    });

    // 3. Process based on event type
    let processed = false;
    let transactionUpdate = null;

    switch (payload.event_type) {
      case "payment.success":
      case "payment_capture.completed":
        transactionUpdate = await handlePaymentSuccess(payload, hasura);
        processed = true;
        break;

      case "payment.failed":
      case "payment_capture.failed":
        transactionUpdate = await handlePaymentFailure(payload, hasura);
        processed = true;
        break;

      case "refund.processed":
        transactionUpdate = await handleRefundProcessed(payload, hasura);
        processed = true;
        break;

      case "dispute.created":
        await handleDisputeCreated(payload, hasura);
        processed = true;
        break;

      default:
        console.log(`Unhandled webhook event type: ${payload.event_type}`);
    }

    // 4. Update transaction if needed
    if (transactionUpdate) {
      await updateTransaction(hasura, transactionUpdate);
    }

    // 5. Mark webhook as processed
    await markWebhookProcessed(hasura, webhookId, processed);

    // 6. Send notification to merchant if needed
    if (transactionUpdate && transactionUpdate.notify_merchant) {
      await notifyMerchant(
        hasura,
        transactionUpdate.transaction_id,
        payload.event_type
      );
    }

    return {
      success: true,
      message: `Webhook processed successfully`,
      processed
    };

  } catch (error) {
    console.error("Webhook processing error:", error);
    return {
      success: false,
      message: error.message,
      processed: false
    };
  }
}

async function verifyWebhookSignature(
  payload: WebhookPayload, 
  hasura: HasuraResource
): Promise<boolean> {
  // Get gateway configuration from database
  const gatewayConfig = await getGatewayConfig(hasura, payload.gateway);
  if (!gatewayConfig) {
    console.warn(`Gateway configuration not found: ${payload.gateway}`);
    return false;
  }

  // Get the appropriate gateway implementation
  const gateway = gatewayFactory.createGateway(gatewayConfig.provider);
  if (!gateway) {
    console.warn(`Unsupported gateway: ${gatewayConfig.provider}`);
    return true; // Allow processing if gateway not supported
  }

  // Prepare webhook verification request
  const verificationRequest: WebhookVerificationRequest = {
    headers: payload.headers || {},
    body: payload.body || JSON.stringify(payload.data),
    signature: payload.signature
  };

  // Prepare gateway config
  const config: GatewayConfig = {
    gateway_code: gatewayConfig.gateway_code,
    credentials: gatewayConfig.credentials,
    webhook_secret: gatewayConfig.webhook_secret
  };

  try {
    return await gateway.verifyWebhookSignature(verificationRequest, config);
  } catch (error) {
    console.error(`Webhook verification failed for ${payload.gateway}:`, error);
    return false;
  }
}

async function getGatewayConfig(hasura: HasuraResource, gatewayCode: string) {
  const query = `
    query GetGatewayConfig($gateway_code: String!) {
      payment_gateways(where: {gateway_code: {_eq: $gateway_code}}) {
        gateway_code
        provider
        credentials
        webhook_secret: features(path: "webhook_secret")
      }
    }
  `;

  const response = await makeHasuraRequest(hasura, query, { gateway_code: gatewayCode });
  return response.data.payment_gateways[0] || null;
}

async function handlePaymentSuccess(
  payload: WebhookPayload,
  hasura: HasuraResource
): Promise<any> {
  const gatewayTransactionId = extractGatewayTransactionId(payload);
  
  const query = `
    query GetTransactionByGatewayId($gateway_transaction_id: String!) {
      transactions(where: {gateway_transaction_id: {_eq: $gateway_transaction_id}}) {
        id
        status
        merchant_id
      }
    }
  `;
  
  const response = await makeHasuraRequest(hasura, query, {
    gateway_transaction_id: gatewayTransactionId
  });
  
  if (response.data.transactions.length === 0) {
    console.warn(`Transaction not found for gateway ID: ${gatewayTransactionId}`);
    return null;
  }

  const transaction = response.data.transactions[0];
  
  // Only update if current status is processing
  if (transaction.status !== "processing") {
    console.log(`Transaction ${transaction.id} already in status: ${transaction.status}`);
    return null;
  }

  return {
    transaction_id: transaction.id,
    status: "success",
    gateway_response: payload.data,
    notify_merchant: true
  };
}

async function handlePaymentFailure(
  payload: WebhookPayload,
  hasura: HasuraResource
): Promise<any> {
  const gatewayTransactionId = extractGatewayTransactionId(payload);
  
  const query = `
    query GetTransactionByGatewayId($gateway_transaction_id: String!) {
      transactions(where: {gateway_transaction_id: {_eq: $gateway_transaction_id}}) {
        id
        status
        merchant_id
      }
    }
  `;
  
  const response = await makeHasuraRequest(hasura, query, {
    gateway_transaction_id: gatewayTransactionId
  });
  
  if (response.data.transactions.length === 0) {
    return null;
  }

  const transaction = response.data.transactions[0];
  
  return {
    transaction_id: transaction.id,
    status: "failed",
    gateway_response: payload.data,
    notify_merchant: true
  };
}

async function handleRefundProcessed(
  payload: WebhookPayload,
  hasura: HasuraResource
): Promise<any> {
  const gatewayTransactionId = extractGatewayTransactionId(payload);
  const refundAmount = extractRefundAmount(payload);
  
  const query = `
    query GetTransactionByGatewayId($gateway_transaction_id: String!) {
      transactions(where: {gateway_transaction_id: {_eq: $gateway_transaction_id}}) {
        id
        amount
        merchant_id
      }
    }
  `;
  
  const response = await makeHasuraRequest(hasura, query, {
    gateway_transaction_id: gatewayTransactionId
  });
  
  if (response.data.transactions.length === 0) {
    return null;
  }

  const transaction = response.data.transactions[0];
  
  // Check if partial or full refund
  const status = refundAmount >= transaction.amount ? "refunded" : "success";
  
  return {
    transaction_id: transaction.id,
    status,
    gateway_response: payload.data,
    metadata: { refund_amount: refundAmount },
    notify_merchant: true
  };
}

async function handleDisputeCreated(
  payload: WebhookPayload,
  hasura: HasuraResource
): Promise<void> {
  // Create audit log entry for dispute
  const mutation = `
    mutation CreateAuditLog($object: audit_logs_insert_input!) {
      insert_audit_logs_one(object: $object) {
        id
      }
    }
  `;

  await makeHasuraRequest(hasura, mutation, {
    object: {
      entity_type: "transaction",
      entity_id: extractTransactionId(payload),
      action: "dispute_created",
      changes: payload.data
    }
  });
}

function extractGatewayTransactionId(payload: WebhookPayload): string {
  switch (payload.gateway) {
    case "stripe":
      return payload.data.object?.id || payload.data.id;
    case "razorpay":
      return payload.data.payload?.payment?.entity?.id || payload.data.entity?.id;
    case "paypal":
      return payload.data.resource?.id || payload.data.id;
    default:
      return payload.data.transaction_id || payload.data.id;
  }
}

function extractRefundAmount(payload: WebhookPayload): number {
  switch (payload.gateway) {
    case "stripe":
      return payload.data.object?.amount_refunded / 100; // Convert from cents
    case "razorpay":
      return payload.data.payload?.refund?.entity?.amount / 100; // Convert from paise
    case "paypal":
      return parseFloat(payload.data.resource?.amount?.value || 0);
    default:
      return payload.data.refund_amount || 0;
  }
}

function extractTransactionId(payload: WebhookPayload): string {
  // Extract transaction ID from metadata or payment reference
  return payload.data.metadata?.transaction_id || 
         payload.data.reference ||
         payload.data.order_id ||
         "";
}

async function logWebhook(
  hasura: HasuraResource,
  webhook: any
): Promise<string> {
  const mutation = `
    mutation LogWebhook($object: webhooks_insert_input!) {
      insert_webhooks_one(object: $object) {
        id
      }
    }
  `;

  const response = await makeHasuraRequest(hasura, mutation, { object: webhook });
  return response.data.insert_webhooks_one.id;
}

async function markWebhookProcessed(
  hasura: HasuraResource,
  webhookId: string,
  processed: boolean
): Promise<void> {
  const mutation = `
    mutation UpdateWebhook($id: uuid!, $processed: Boolean!) {
      update_webhooks_by_pk(
        pk_columns: {id: $id},
        _set: {
          processed: $processed,
          processed_at: "now()"
        }
      ) {
        id
      }
    }
  `;

  await makeHasuraRequest(hasura, mutation, { id: webhookId, processed });
}

async function updateTransaction(
  hasura: HasuraResource,
  update: any
): Promise<void> {
  const mutation = `
    mutation UpdateTransaction(
      $id: uuid!,
      $status: transaction_status!,
      $gateway_response: jsonb,
      $metadata: jsonb
    ) {
      update_transactions_by_pk(
        pk_columns: {id: $id},
        _set: {
          status: $status,
          gateway_response: $gateway_response
        },
        _append: {
          metadata: $metadata
        }
      ) {
        id
      }
    }
  `;

  await makeHasuraRequest(hasura, mutation, {
    id: update.transaction_id,
    status: update.status,
    gateway_response: update.gateway_response,
    metadata: update.metadata
  });
}

async function notifyMerchant(
  hasura: HasuraResource,
  transactionId: string,
  eventType: string
): Promise<void> {
  const query = `
    query GetTransactionForNotification($transaction_id: uuid!) {
      transactions_by_pk(id: $transaction_id) {
        transaction_ref
        amount
        currency
        status
        merchant {
          webhook_url
          api_key
        }
      }
    }
  `;

  const response = await makeHasuraRequest(hasura, query, {
    transaction_id: transactionId
  });
  
  const transaction = response.data.transactions_by_pk;
  
  if (!transaction || !transaction.merchant.webhook_url) {
    return;
  }
  
  // Send webhook to merchant
  // In production, this would be queued for retry logic
  try {
    await fetch(transaction.merchant.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": generateMerchantWebhookSignature(transaction, eventType)
      },
      body: JSON.stringify({
        event: eventType,
        transaction: {
          ref: transaction.transaction_ref,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status
        },
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error("Failed to notify merchant:", error);
  }
}

function generateMerchantWebhookSignature(transaction: any, eventType: string): string {
  // Implement HMAC signature generation
  return "signature_placeholder";
}

async function makeHasuraRequest(
  hasura: HasuraResource,
  query: string,
  variables: any
): Promise<any> {
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