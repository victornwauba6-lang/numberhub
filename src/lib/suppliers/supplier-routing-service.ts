import type { PoolClient } from "pg";

export type SupplierRoute = {
  routeId: string;
  supplierId: string;
  supplierName: string;
  supplierSlug: string;
  supplierProductId: string;
  routePriority: number;
  isPrimary: boolean;
  maxConsecutiveFailures: number;
  cooldownSeconds: number;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
};

export async function findSupplierRoutes(
  client: PoolClient,
  productOptionId: string,
  excludedSupplierIds: string[] = [],
): Promise<SupplierRoute[]> {
  const normalizedProductOptionId = productOptionId.trim();

  if (!normalizedProductOptionId) {
    throw new Error("Product option ID is required");
  }

  const result = await client.query<SupplierRoute>(
    `
      SELECT
        r.id AS "routeId",
        r.supplier_id AS "supplierId",
        sup.name AS "supplierName",
        sup.slug AS "supplierSlug",
        r.supplier_product_id AS "supplierProductId",
        r.route_priority AS "routePriority",
        r.is_primary AS "isPrimary",
        r.max_consecutive_failures AS "maxConsecutiveFailures",
        r.cooldown_seconds AS "cooldownSeconds",
        r.consecutive_failures AS "consecutiveFailures",
        r.last_failure_at AS "lastFailureAt",
        r.cooldown_until AS "cooldownUntil"
      FROM option_supplier_routes r
      INNER JOIN suppliers sup
        ON sup.id = r.supplier_id
      WHERE r.product_option_id = $1
        AND r.is_active = TRUE
        AND sup.is_active = TRUE
        AND sup.is_test = FALSE
        AND r.supplier_product_id IS NOT NULL
        AND NOT (r.supplier_id = ANY($2::uuid[]))
        AND (
          r.cooldown_until IS NULL
          OR r.cooldown_until <= NOW()
        )
      ORDER BY
        r.is_primary DESC,
        r.route_priority ASC,
        r.created_at ASC
    `,
    [
      normalizedProductOptionId,
      excludedSupplierIds,
    ],
  );

  return result.rows;
}

export async function recordSupplierFailure(
  client: PoolClient,
  routeId: string,
): Promise<void> {
  const normalizedRouteId = routeId.trim();

  if (!normalizedRouteId) {
    throw new Error("Route ID is required");
  }

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
    [normalizedRouteId],
  );
}

export async function recordSupplierSuccess(
  client: PoolClient,
  routeId: string,
): Promise<void> {
  const normalizedRouteId = routeId.trim();

  if (!normalizedRouteId) {
    throw new Error("Route ID is required");
  }

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
    [normalizedRouteId],
  );
}
