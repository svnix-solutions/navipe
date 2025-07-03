// Advanced Routing Engine for Payment Processing

type RoutingDecision = {
  gateway_id: string;
  gateway_code: string;
  reason: string;
  score: number;
};

type GatewayHealth = {
  gateway_id: string;
  success_rate: number;
  average_response_time_ms: number;
  is_healthy: boolean;
};

type HasuraResource = {
  endpoint: string;
  admin_secret: string;
};

export async function main(
  transaction: {
    amount: number;
    currency: string;
    payment_method: string;
    merchant_id: string;
  },
  hasura: HasuraResource
): Promise<RoutingDecision> {
  // 1. Get available gateways for merchant
  const availableGateways = await getAvailableGateways(
    hasura,
    transaction.merchant_id,
    transaction.payment_method,
    transaction.currency
  );

  if (availableGateways.length === 0) {
    throw new Error("No available gateways for this transaction");
  }

  // 2. Get gateway health metrics
  const healthMetrics = await getGatewayHealthMetrics(
    hasura,
    availableGateways.map(g => g.gateway_id)
  );

  // 3. Apply routing rules
  const routingRules = await getRoutingRules(
    hasura,
    transaction.merchant_id
  );

  // 4. Calculate scores for each gateway
  const scoredGateways = availableGateways.map(gateway => {
    let score = 100; // Base score
    let reasons = [];

    // Priority score (lower priority number = higher score)
    score += (10 - gateway.priority) * 5;
    reasons.push(`Priority: ${gateway.priority}`);

    // Health score
    const health = healthMetrics.find(h => h.gateway_id === gateway.gateway_id);
    if (health) {
      score += health.success_rate;
      score -= health.average_response_time_ms / 100;
      reasons.push(`Health: ${health.success_rate}% success`);
    }

    // Fee score (lower fees = higher score)
    const transactionFee = calculateFee(
      transaction.amount,
      gateway.fee_percentage,
      gateway.fee_fixed
    );
    score -= transactionFee;
    reasons.push(`Fee: ${transactionFee}`);

    // Apply routing rules
    for (const rule of routingRules) {
      if (evaluateRule(rule, transaction, gateway)) {
        const adjustment = applyRuleScoreAdjustment(rule, gateway);
        score += adjustment;
        if (adjustment !== 0) {
          reasons.push(`Rule: ${rule.name} (${adjustment > 0 ? '+' : ''}${adjustment})`);
        }
      }
    }

    return {
      ...gateway,
      score,
      reasons
    };
  });

  // 5. Select the best gateway
  const bestGateway = scoredGateways
    .filter(g => {
      const health = healthMetrics.find(h => h.gateway_id === g.gateway_id);
      return !health || health.is_healthy;
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestGateway) {
    throw new Error("No healthy gateways available");
  }

  return {
    gateway_id: bestGateway.gateway_id,
    gateway_code: bestGateway.gateway_code,
    reason: bestGateway.reasons.join("; "),
    score: bestGateway.score
  };
}

async function getAvailableGateways(
  hasura: HasuraResource,
  merchant_id: string,
  payment_method: string,
  currency: string
) {
  const query = `
    query GetAvailableGateways($merchant_id: uuid!, $payment_method: payment_method!, $currency: currency_code!) {
      merchant_gateways(
        where: {
          merchant_id: {_eq: $merchant_id},
          is_active: {_eq: true},
          gateway: {
            status: {_eq: "active"},
            supported_methods: {_has_key: $payment_method},
            supported_currencies: {_has_key: $currency}
          }
        },
        order_by: {priority: asc}
      ) {
        gateway_id: gateway_id
        gateway_code: gateway_code
        priority
        fee_percentage
        fee_fixed
        gateway {
          gateway_code
        }
      }
    }
  `;

  const response = await makeHasuraRequest(hasura, query, {
    merchant_id,
    payment_method,
    currency
  });

  return response.data.merchant_gateways.map(mg => ({
    gateway_id: mg.gateway_id,
    gateway_code: mg.gateway.gateway_code,
    priority: mg.priority,
    fee_percentage: mg.fee_percentage,
    fee_fixed: mg.fee_fixed
  }));
}

async function getGatewayHealthMetrics(
  hasura: HasuraResource,
  gateway_ids: string[]
): Promise<GatewayHealth[]> {
  const query = `
    query GetGatewayHealthMetrics($gateway_ids: [uuid!]!, $one_hour_ago: timestamptz!) {
      gateway_health_metrics_aggregate(
        where: {
          gateway_id: {_in: $gateway_ids},
          created_at: {_gt: $one_hour_ago}
        }
        group_by: [gateway_id]
      ) {
        aggregate {
          avg {
            success_rate
            average_response_time_ms
          }
        }
        nodes {
          gateway_id
        }
      }
    }
  `;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const response = await makeHasuraRequest(hasura, query, {
    gateway_ids,
    one_hour_ago: oneHourAgo
  });

  return response.data.gateway_health_metrics_aggregate.map(metric => ({
    gateway_id: metric.nodes[0].gateway_id,
    success_rate: metric.aggregate.avg.success_rate || 95, // Default if no data
    average_response_time_ms: metric.aggregate.avg.average_response_time_ms || 1000,
    is_healthy: (metric.aggregate.avg.success_rate || 95) >= 80 && 
                (metric.aggregate.avg.average_response_time_ms || 1000) <= 5000
  }));
}

async function getRoutingRules(
  hasura: HasuraResource,
  merchant_id: string
) {
  const query = `
    query GetRoutingRules($merchant_id: uuid!, $now: timestamptz!) {
      routing_rules(
        where: {
          merchant_id: {_eq: $merchant_id},
          is_active: {_eq: true},
          _or: [
            {valid_from: {_is_null: true}},
            {valid_from: {_lte: $now}}
          ],
          _and: [
            {
              _or: [
                {valid_until: {_is_null: true}},
                {valid_until: {_gt: $now}}
              ]
            }
          ]
        },
        order_by: {priority: asc}
      ) {
        id
        name
        rule_type
        priority
        conditions
        actions
        is_active
      }
    }
  `;

  const now = new Date().toISOString();
  
  const response = await makeHasuraRequest(hasura, query, {
    merchant_id,
    now
  });

  return response.data.routing_rules;
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

  if (!response.ok) {
    throw new Error(`Hasura request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

function calculateFee(amount: number, percentage: number, fixed: number): number {
  return (amount * percentage) + fixed;
}

function evaluateRule(rule: any, transaction: any, gateway: any): boolean {
  const conditions = rule.conditions;

  // Amount conditions
  if (conditions.amount) {
    if (conditions.amount.min && transaction.amount < conditions.amount.min) {
      return false;
    }
    if (conditions.amount.max && transaction.amount > conditions.amount.max) {
      return false;
    }
  }

  // Currency conditions
  if (conditions.currency && transaction.currency !== conditions.currency) {
    return false;
  }

  // Payment method conditions
  if (conditions.payment_method && transaction.payment_method !== conditions.payment_method) {
    return false;
  }

  // Time-based conditions
  if (conditions.time_of_day) {
    const hour = new Date().getHours();
    if (hour < conditions.time_of_day.start || hour > conditions.time_of_day.end) {
      return false;
    }
  }

  return true;
}

function applyRuleScoreAdjustment(rule: any, gateway: any): number {
  const actions = rule.actions;

  // Preferred gateway boost
  if (actions.preferred_gateway === gateway.gateway_code) {
    return 50;
  }

  // Avoided gateway penalty
  if (actions.avoided_gateway === gateway.gateway_code) {
    return -50;
  }

  // Distribution-based adjustment
  if (actions.distribution && actions.distribution[gateway.gateway_code]) {
    return actions.distribution[gateway.gateway_code];
  }

  return 0;
}