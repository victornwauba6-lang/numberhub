import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { withTransaction } from "@/lib/db-transaction";
import { getSupplierAdapter } from "@/lib/suppliers/supplier-registry";

export type VerificationSyncResult = {
  orderId: string;
  status: string;
  phoneNumber: string | null;
  verificationCode: string | null;
  message: string | null;
  synced: boolean;
};

type VerificationOrder = {
  id: string;
  userId: string;
  status: string;
  supplierId: string;
  supplierSlug: string;
  supplierName: string;
  supplierOrderReference: string;
  verificationNumberId: string;
  phoneNumber: string;
  supplierNumberReference: string | null;
};

const ACTIVE_STATUSES = new Set([
  "NUMBER_ASSIGNED",
  "WAITING_FOR_SMS",
  "CODE_RECEIVED",
]);

function hashMessage(
  verificationCode: string,
  message: string | null,
): string {
  return createHash("sha256")
    .update(`${verificationCode}|${message ?? ""}`)
    .digest("hex");
}

async function getVerificationOrder(
  orderId: string,
): Promise<VerificationOrder | null> {
  const result = await db.query<VerificationOrder>(
    `
      SELECT
        o.id,
        o.user_id AS "userId",
        o.status,
        o.supplier_id AS "supplierId",
        s.slug AS "supplierSlug",
        s.name AS "supplierName",
        o.supplier_order_reference AS "supplierOrderReference",
        vn.id AS "verificationNumberId",
        vn.phone_number AS "phoneNumber",
        vn.supplier_number_reference AS "supplierNumberReference"
      FROM orders o
      JOIN suppliers s
        ON s.id = o.supplier_id
      JOIN verification_numbers vn
        ON vn.order_id = o.id
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId],
  );

  return result.rows[0] ?? null;
}

export async function syncVerificationOrder(
  orderId: string,
): Promise<VerificationSyncResult> {
  const order = await getVerificationOrder(orderId);

  if (!order) {
    throw new Error("Verification order not found.");
  }

  if (!ACTIVE_STATUSES.has(order.status)) {
    return {
      orderId: order.id,
      status: order.status,
      phoneNumber: order.phoneNumber,
      verificationCode: null,
      message: null,
      synced: false,
    };
  }

  const adapter = getSupplierAdapter(
    order.supplierSlug,
    order.supplierName,
  );

  if (!adapter.getVerificationStatus) {
    return {
      orderId: order.id,
      status: order.status,
      phoneNumber: order.phoneNumber,
      verificationCode: null,
      message: "Live verification status is not available for this supplier.",
      synced: false,
    };
  }

  const supplierStatus = await adapter.getVerificationStatus({
    orderId: order.id,
    supplierOrderReference: order.supplierOrderReference,
    supplierNumberReference: order.supplierNumberReference ?? "",
  });

  if (!supplierStatus.success) {
    throw new Error(
      supplierStatus.errorMessage ??
        "Unable to check verification status with the supplier.",
    );
  }

  const verificationCode =
    supplierStatus.verificationCode?.trim() || null;

  const nextStatus =
    supplierStatus.status === "UNKNOWN"
      ? order.status
      : supplierStatus.status;
  const message = supplierStatus.message?.trim() || null;
  const phoneNumber =
    supplierStatus.phoneNumber?.trim() || order.phoneNumber;

  await withTransaction(async (client) => {
    const currentResult = await client.query<{
      status: string;
    }>(
      `
        SELECT status
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [order.id],
    );

    if (currentResult.rowCount !== 1) {
      throw new Error("Verification order no longer exists.");
    }

    const currentStatus = currentResult.rows[0].status;

    if (phoneNumber !== order.phoneNumber) {
      await client.query(
        `
          UPDATE verification_numbers
          SET phone_number = $2
          WHERE id = $1
        `,
        [order.verificationNumberId, phoneNumber],
      );
    }

    if (nextStatus === "CODE_RECEIVED" && verificationCode) {
      const messageHash = hashMessage(verificationCode, message);

      const existingMessage = await client.query(
        `
          SELECT id
          FROM verification_messages
          WHERE order_id = $1
            AND message_hash = $2
          LIMIT 1
        `,
        [order.id, messageHash],
      );

      if (existingMessage.rowCount === 0) {
        await client.query(
          `
            INSERT INTO verification_messages (
              order_id,
              verification_number_id,
              message_hash,
              received_at,
              processed_at,
              code_received,
              metadata
            )
            VALUES (
              $1,
              $2,
              $3,
              NOW(),
              NOW(),
              TRUE,
              $4
            )
          `,
          [
            order.id,
            order.verificationNumberId,
            messageHash,
            JSON.stringify({
              supplier: order.supplierSlug,
              verificationCode,
              message,
            }),
          ],
        );
      }
    }

    if (currentStatus !== nextStatus) {
      await client.query(
        `
          UPDATE orders
          SET
            status = $2::varchar(40),
            completed_at = CASE
              WHEN $2::varchar(40) = 'COMPLETED' THEN NOW()
              ELSE completed_at
            END,
            updated_at = NOW()
          WHERE id = $1
        `,
        [order.id, nextStatus],
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
            $2::varchar(40),
            $3::varchar(40),
            $4::varchar(50),
            $5
          )
        `,
        [
          order.id,
          currentStatus,
          nextStatus,
          `VERIFICATION_${nextStatus}`,
          JSON.stringify({
            supplierId: order.supplierId,
            supplierName: order.supplierName,
            verificationNumberId: order.verificationNumberId,
            hasVerificationCode: Boolean(verificationCode),
          }),
        ],
      );
    }
  });

  return {
    orderId: order.id,
    status: nextStatus,
    phoneNumber,
    verificationCode,
    message,
    synced: true,
  };
}
