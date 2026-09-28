import type { PoolClient } from "pg";
import { getSupplierAdapter } from "@/lib/suppliers/supplier-registry";
import { automaticallyRefundFailedOrder } from "@/lib/order-processing/auto-refund-service";
import { findSupplierRoutes } from "@/lib/suppliers/supplier-routing-service";
import { getFiveSimCountryServiceOptions } from "@/lib/suppliers/catalog/fivesim-catalog-service";
import { calculateCustomerPrice } from "@/lib/pricing/pricing-engine";

export type ProcessOrderResult = {
  orderId: string;
  status: string;
  supplierId: string | null;
  supplierRequestId: string | null;
  message: string;
};

function extractActivationExpiresAt(rawResponse: unknown): Date | null {
  if (!rawResponse || typeof rawResponse !== "object") {
    return null;
  }

  const response = rawResponse as Record<string, unknown>;

  const candidates = [
    response.expiresAt,
    response.endsAt,
    (response.details as Record<string, unknown> | null)?.expiresAt,
    (response.details as Record<string, unknown> | null)?.endsAt,
    (response.created as Record<string, unknown> | null)?.expiresAt,
    (response.created as Record<string, unknown> | null)?.endsAt,
  ];

  for (const value of candidates) {
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

export async function processOrder(
  client: PoolClient,
  orderId: string,
): Promise<ProcessOrderResult> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID is required");
  }

  const orderResult = await client.query<{
    id: string;
    productOptionId: string;
    countryCode: string;
    serviceSlug: string;
    priceMinor: string;
    supplierId: string;
    supplierName: string;
    supplierSlug: string;
    status: string;
  }>(
    `
      SELECT
        o.id,
        o.product_option_id AS "productOptionId",
        c.code AS "countryCode",
        s.slug AS "serviceSlug",
        o.price_minor::text AS "priceMinor",
        sup.id AS "supplierId",
        sup.name AS "supplierName",
        sup.slug AS "supplierSlug",
        o.status
      FROM orders o
      INNER JOIN countries c
        ON c.id = o.country_id
      INNER JOIN services s
        ON s.id = o.service_id
      INNER JOIN suppliers sup
        ON sup.id = o.supplier_id
      WHERE o.id = $1
      FOR UPDATE
    `,
    [normalizedOrderId],
  );

  if (orderResult.rowCount !== 1) {
    throw new Error("Order not found");
  }

  const order = orderResult.rows[0];

  if (order.status !== "CREATED") {
    return {
      orderId: order.id,
      status: order.status,
      supplierId: order.supplierId,
      supplierRequestId: null,
      message: `Order is already ${order.status} and does not need initial processing.`,
    };
  }

  const attemptedSupplierIds: string[] = [];

  while (true) {
    const routes = await findSupplierRoutes(
      client,
      order.productOptionId,
      attemptedSupplierIds,
    );

    if (routes.length === 0) {
      break;
    }

    const route =
      routes.find((candidate) => candidate.supplierId === order.supplierId) ??
      routes[0];

    if (!route.supplierProductId) {
      attemptedSupplierIds.push(route.supplierId);
      continue;
    }

    const adapter = getSupplierAdapter(
      route.supplierSlug,
      route.supplierName,
    );

    const requestIdempotencyKey =
      `SUPPLIER-ACTIVATE-${order.id}-${route.supplierId}`;

    const existingRequestResult = await client.query<{
      id: string;
      status: string;
    }>(
      `
        SELECT id, status
        FROM supplier_requests
        WHERE order_id = $1
          AND supplier_id = $2
          AND request_type = 'ACTIVATE_NUMBER'
          AND idempotency_key = $3
        LIMIT 1
      `,
      [order.id, route.supplierId, requestIdempotencyKey],
    );

    let supplierRequestId: string;

    if (existingRequestResult.rowCount === 1) {
      supplierRequestId = existingRequestResult.rows[0].id;

      if (existingRequestResult.rows[0].status === "SUCCESS") {
        attemptedSupplierIds.push(route.supplierId);
        continue;
      }

      await client.query(
        `
          UPDATE supplier_requests
          SET
            status = 'PROCESSING',
            updated_at = NOW(),
            error_message = NULL
          WHERE id = $1
        `,
        [supplierRequestId],
      );
    } else {
      const requestResult = await client.query<{ id: string }>(
        `
          INSERT INTO supplier_requests (
            order_id,
            supplier_id,
            route_id,
            request_type,
            request_reference,
            status,
            idempotency_key
          )
          VALUES (
            $1,
            $2,
            $3,
            'ACTIVATE_NUMBER',
            $4,
            'PROCESSING',
            $5
          )
          RETURNING id
        `,
        [
          order.id,
          route.supplierId,
          route.routeId,
          requestIdempotencyKey,
          requestIdempotencyKey,
        ],
      );

      supplierRequestId = requestResult.rows[0].id;
    }

    if (order.status === "CREATED") {
      await client.query(
        `
          UPDATE orders
          SET status = 'PROCESSING', updated_at = NOW()
          WHERE id = $1
        `,
        [order.id],
      );

      await client.query(
        `
          INSERT INTO order_events (
            order_id,
            from_status,
            to_status,
            event_type,
            metadata
          )
          VALUES (
            $1,
            'CREATED',
            'PROCESSING',
            'ORDER_PROCESSING_STARTED',
            $2
          )
        `,
        [
          order.id,
          JSON.stringify({
            supplierId: route.supplierId,
            supplierName: route.supplierName,
          }),
        ],
      );
    }

    let activation: Awaited<ReturnType<typeof adapter.activateNumber>>;

    try {
      activation = await adapter.activateNumber({
        orderId: order.id,
        productOptionId: order.productOptionId,
        countryCode: order.countryCode,
        serviceSlug: order.serviceSlug,
        supplierProductId: route.supplierProductId,
      });
    } catch (error: unknown) {
      activation = {
        success: false,
        supplierOrderReference: null,
        phoneNumber: null,
        supplierNumberReference: null,
        errorCode: "SUPPLIER_ACTIVATION_EXCEPTION",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Supplier activation failed unexpectedly.",
      };
    }

    console.log("[ORDER_PROCESSING] supplier activation result", {
      orderId: order.id,
      supplier: route.supplierSlug,
      supplierProductId: route.supplierProductId,
      success: activation.success,
      errorCode: activation.errorCode,
      errorMessage: activation.errorMessage,
      hasSupplierOrderReference: Boolean(activation.supplierOrderReference),
      hasPhoneNumber: Boolean(activation.phoneNumber),
      hasSupplierNumberReference: Boolean(activation.supplierNumberReference),
      rawResponse: activation.rawResponse ?? null,
    });

    const rawActivationText =
      activation.rawResponse &&
      typeof activation.rawResponse === "object" &&
      "rawText" in activation.rawResponse &&
      typeof activation.rawResponse.rawText === "string"
        ? activation.rawResponse.rawText.trim().toLowerCase()
        : "";

    if (
      route.supplierSlug === "fivesim" &&
      rawActivationText === "no free phones"
    ) {
      try {
        const freshOperators = await getFiveSimCountryServiceOptions(
          order.countryCode,
          order.serviceSlug,
        );

        const paidPriceMinor = Number(order.priceMinor);

        const candidates = [];

        for (const operator of freshOperators) {
          if (
            !operator.operator ||
            operator.operator.trim().toLowerCase() ===
              route.supplierProductId.trim().toLowerCase() ||
            operator.count <= 0
          ) {
            continue;
          }

          const price = await calculateCustomerPrice({
            supplier: "fivesim",
            supplierOption: operator.operator,
            cost: operator.cost,
            currency: operator.currency,
            country: order.countryCode,
            service: order.serviceSlug,
          });

          if (
            price.customerPriceMinor !== null &&
            Number.isFinite(paidPriceMinor) &&
            price.customerPriceMinor <= paidPriceMinor
          ) {
            candidates.push({
              operator: operator.operator,
              count: operator.count,
              customerPriceMinor: price.customerPriceMinor,
            });
          }
        }

        candidates.sort(
          (a, b) =>
            b.count - a.count ||
            a.customerPriceMinor - b.customerPriceMinor,
        );

        for (const candidate of candidates) {
          console.log("[ORDER_PROCESSING] trying safe 5SIM operator fallback", {
            orderId: order.id,
            operator: candidate.operator,
            stock: candidate.count,
            customerPriceMinor: candidate.customerPriceMinor,
            paidPriceMinor,
          });

          await client.query(
            `
              UPDATE supplier_requests
              SET
                request_payload = request_payload || $2::jsonb,
                updated_at = NOW()
              WHERE id = $1
            `,
            [
              supplierRequestId,
              JSON.stringify({
                fallbackOperator: candidate.operator,
                fallbackStock: candidate.count,
                fallbackCustomerPriceMinor: candidate.customerPriceMinor,
                originalSupplierProductId: route.supplierProductId,
              }),
            ],
          );

          try {
            const fallbackActivation = await adapter.activateNumber({
              orderId: order.id,
              productOptionId: order.productOptionId,
              countryCode: order.countryCode,
              serviceSlug: order.serviceSlug,
              supplierProductId: candidate.operator,
            });

            console.log(
              "[ORDER_PROCESSING] 5SIM operator fallback result",
              {
                orderId: order.id,
                operator: candidate.operator,
                success: fallbackActivation.success,
                errorCode: fallbackActivation.errorCode,
                errorMessage: fallbackActivation.errorMessage,
                hasSupplierOrderReference: Boolean(
                  fallbackActivation.supplierOrderReference,
                ),
                hasPhoneNumber: Boolean(fallbackActivation.phoneNumber),
                hasSupplierNumberReference: Boolean(
                  fallbackActivation.supplierNumberReference,
                ),
                rawResponse: fallbackActivation.rawResponse ?? null,
              },
            );

            if (
              fallbackActivation.success &&
              fallbackActivation.supplierOrderReference &&
              fallbackActivation.phoneNumber &&
              fallbackActivation.supplierNumberReference
            ) {
              activation = fallbackActivation;
              break;
            }
          } catch (fallbackError: unknown) {
            console.error(
              "[ORDER_PROCESSING] 5SIM operator fallback exception",
              {
                orderId: order.id,
                operator: candidate.operator,
                error:
                  fallbackError instanceof Error
                    ? fallbackError.message
                    : "Unknown fallback activation error.",
              },
            );
          }
        }
      } catch (fallbackLookupError: unknown) {
        console.error(
          "[ORDER_PROCESSING] 5SIM operator fallback lookup failed",
          {
            orderId: order.id,
            error:
              fallbackLookupError instanceof Error
                ? fallbackLookupError.message
                : "Unknown fallback lookup error.",
          },
        );
      }
    }

    if (
      !activation.success ||
      !activation.supplierOrderReference ||
      !activation.phoneNumber ||
      !activation.supplierNumberReference
    ) {
      await client.query(
        `
          UPDATE supplier_requests
          SET
            status = 'FAILED',
            error_message = $2,
            response_payload = $3,
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          supplierRequestId,
          activation.errorMessage ??
            "Supplier activation failed or returned incomplete data.",
          JSON.stringify(activation.rawResponse ?? null),
        ],
      );

      await client.query(
        `
          UPDATE option_supplier_routes
          SET
            consecutive_failures = consecutive_failures + 1,
            last_failure_at = NOW(),
            cooldown_until = CASE
              WHEN consecutive_failures + 1 >= max_consecutive_failures
                THEN NOW() + MAKE_INTERVAL(secs => cooldown_seconds)
              ELSE cooldown_until
            END,
            updated_at = NOW()
          WHERE id = $1
        `,
        [route.routeId],
      );

      attemptedSupplierIds.push(route.supplierId);
      continue;
    }

    await client.query(
      `
        UPDATE supplier_requests
        SET
          status = 'SUCCESS',
          request_reference = $2,
          response_payload = $3,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        supplierRequestId,
        activation.supplierOrderReference,
        JSON.stringify(activation.rawResponse ?? null),
      ],
    );

    await client.query(
      `
        UPDATE option_supplier_routes
        SET
          consecutive_failures = 0,
          last_failure_at = NULL,
          cooldown_until = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [route.routeId],
    );

    const activationExpiresAt = extractActivationExpiresAt(
      activation.rawResponse,
    );

    await client.query(
      `
        UPDATE orders
        SET
          status = 'NUMBER_ASSIGNED',
          supplier_id = $2,
          supplier_order_reference = $3,
          expires_at = $4,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        order.id,
        route.supplierId,
        activation.supplierOrderReference,
        activationExpiresAt,
      ],
    );

    const numberResult = await client.query<{ id: string }>(
      `
        INSERT INTO verification_numbers (
          order_id,
          phone_number,
          country_code,
          supplier_number_reference,
          assigned_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `,
      [
        order.id,
        activation.phoneNumber,
        order.countryCode,
        activation.supplierNumberReference,
      ],
    );

    await client.query(
      `
        INSERT INTO order_events (
          order_id,
          from_status,
          to_status,
          event_type,
          metadata
        )
        VALUES (
          $1,
          'PROCESSING',
          'NUMBER_ASSIGNED',
          'NUMBER_ASSIGNED',
          $2
        )
      `,
      [
        order.id,
        JSON.stringify({
          supplierId: route.supplierId,
          supplierRequestId,
          verificationNumberId: numberResult.rows[0].id,
        }),
      ],
    );

    return {
      orderId: order.id,
      status: "NUMBER_ASSIGNED",
      supplierId: route.supplierId,
      supplierRequestId,
      message: `Number successfully assigned by ${route.supplierName}.`,
    };
  }

  await client.query(
    `
      UPDATE orders
      SET status = 'FAILED', updated_at = NOW()
      WHERE id = $1
    `,
    [order.id],
  );

  await client.query(
    `
      INSERT INTO order_events (
        order_id,
        from_status,
        to_status,
        event_type,
        metadata
      )
      VALUES (
        $1,
        'PROCESSING',
        'FAILED',
        'ALL_SUPPLIERS_FAILED',
        $2
      )
    `,
    [
      order.id,
      JSON.stringify({
        attemptedSupplierIds,
      }),
    ],
  );

  const refundResult = await automaticallyRefundFailedOrder(
    client,
    order.id,
  );

  return {
    orderId: order.id,
    status: refundResult.status,
    supplierId: order.supplierId,
    supplierRequestId: null,
    message:
      "All configured supplier routes failed. " +
      refundResult.message,
  };

}
