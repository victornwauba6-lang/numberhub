import type { PoolClient } from "pg";
import { debitWallet } from "@/lib/wallet/wallet-debit";

export type CreateOrderInput = {
  userId: string;
  walletId: string;
  productOptionId: string;
  idempotencyKey: string;
};

export type CreatedOrder = {
  orderId: string;
  userId: string;
  walletId: string;
  productOptionId: string;
  countryId: string;
  serviceId: string;
  supplierId: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
};

export async function createOrder(
  client: PoolClient,
  input: CreateOrderInput,
): Promise<CreatedOrder> {
  const walletOwnershipResult = await client.query<{ id: string }>(
    `
      SELECT id
      FROM wallets
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
    `,
    [input.walletId, input.userId],
  );

  if (walletOwnershipResult.rowCount !== 1) {
    throw new Error("Wallet does not belong to user");
  }

  const optionResult = await client.query<{
    optionId: string;
    productId: string;
    countryId: string;
    serviceId: string;
    supplierId: string;
    priceMinor: string;
    currency: string;
    refundEnabled: boolean;
    purchaseLimit: number | null;
    optionActive: boolean;
    optionAvailable: boolean;
    productActive: boolean;
    countryActive: boolean;
    serviceActive: boolean;
    supplierActive: boolean;
  }>(
    `
      SELECT
        po.id AS "optionId",
        p.id AS "productId",
        p.country_id AS "countryId",
        p.service_id AS "serviceId",
        po.supplier_id AS "supplierId",
        COALESCE(po.promo_price_minor, po.price_minor)::text AS "priceMinor",
        po.currency,
        po.refund_enabled AS "refundEnabled",
        po.purchase_limit_per_customer AS "purchaseLimit",
        po.is_active AS "optionActive",
        po.is_available AS "optionAvailable",
        p.is_active AS "productActive",
        c.is_active AS "countryActive",
        s.is_active AS "serviceActive",
        sup.is_active AS "supplierActive"
      FROM product_options po
      INNER JOIN products p
        ON p.id = po.product_id
      INNER JOIN countries c
        ON c.id = p.country_id
      INNER JOIN services s
        ON s.id = p.service_id
      INNER JOIN suppliers sup
        ON sup.id = po.supplier_id
      WHERE po.id = $1
      FOR UPDATE OF po
    `,
    [input.productOptionId],
  );

  if (optionResult.rowCount !== 1) {
    throw new Error("Product option not found");
  }

  const option = optionResult.rows[0];

  if (
    !option.optionActive ||
    !option.optionAvailable ||
    !option.productActive ||
    !option.countryActive ||
    !option.serviceActive ||
    !option.supplierActive
  ) {
    throw new Error("Product option is unavailable");
  }

  if (option.purchaseLimit !== null) {
    const purchaseCountResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM orders
        WHERE user_id = $1
          AND product_option_id = $2
          AND status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')
      `,
      [input.userId, input.productOptionId],
    );

    const purchaseCount = Number(purchaseCountResult.rows[0].count);

    if (purchaseCount >= option.purchaseLimit) {
      throw new Error("Purchase limit reached for this option");
    }
  }

  const priceMinor = BigInt(option.priceMinor);

  if (priceMinor <= BigInt(0)) {
    throw new Error("Product option price must be greater than zero");
  }

  const orderResult = await client.query<{
    id: string;
  }>(
    `
      INSERT INTO orders (
        user_id,
        wallet_id,
        product_option_id,
        country_id,
        service_id,
        supplier_id,
        status,
        currency,
        price_minor,
        idempotency_key,
        purchase_limit_snapshot,
        refund_enabled_snapshot
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'CREATED',
        $7,
        $8,
        $9,
        $10,
        $11
      )
      RETURNING id
    `,
    [
      input.userId,
      input.walletId,
      input.productOptionId,
      option.countryId,
      option.serviceId,
      option.supplierId,
      option.currency,
      priceMinor.toString(),
      input.idempotencyKey,
      option.purchaseLimit,
      option.refundEnabled,
    ],
  );

  const orderId = orderResult.rows[0].id;

  await debitWallet(
    client,
    input.walletId,
    priceMinor,
    `ORDER-${orderId}`,
    "Verification number purchase",
    {
      orderId,
      productOptionId: input.productOptionId,
    },
  );

  await client.query(
    `
      INSERT INTO order_events (
        order_id,
        from_status,
        to_status,
        event_type,
        actor_user_id,
        metadata
      )
      VALUES ($1, NULL, 'CREATED', 'ORDER_CREATED', $2, $3)
    `,
    [
      orderId,
      input.userId,
      JSON.stringify({
        priceMinor: priceMinor.toString(),
        productOptionId: input.productOptionId,
      }),
    ],
  );

  return {
    orderId,
    userId: input.userId,
    walletId: input.walletId,
    productOptionId: input.productOptionId,
    countryId: option.countryId,
    serviceId: option.serviceId,
    supplierId: option.supplierId,
    status: "CREATED",
    currency: option.currency,
    priceMinor: priceMinor.toString(),
    refundEnabled: option.refundEnabled,
  };
}
