import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { createRefund } from "@/lib/refunds/refund-service";
import { getSupplierAdapter } from "@/lib/suppliers/supplier-registry";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id: orderId } = await context.params;

    if (!orderId?.trim()) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      const orderResult = await client.query<{
        id: string;
        status: string;
        userId: string;
        refundEnabled: boolean;
        supplierId: string | null;
        supplierName: string | null;
        supplierSlug: string | null;
        supplierOrderReference: string | null;
        supplierNumberReference: string | null;
      }>(
        `
          SELECT
            o.id,
            o.status,
            o.user_id AS "userId",
            o.refund_enabled_snapshot AS "refundEnabled",
            o.supplier_id AS "supplierId",
            sp.name AS "supplierName",
            sp.slug AS "supplierSlug",
            o.supplier_order_reference AS "supplierOrderReference",
            vn.supplier_number_reference AS "supplierNumberReference"
          FROM orders o
          LEFT JOIN suppliers sp
            ON sp.id = o.supplier_id
          LEFT JOIN verification_numbers vn
            ON vn.order_id = o.id
          WHERE o.id = $1
            AND o.user_id = $2
          FOR UPDATE OF o
        `,
        [orderId.trim(), user.id],
      );

      if (orderResult.rowCount !== 1) {
        throw new Error("Order not found");
      }

      const order = orderResult.rows[0];

      if (!order.refundEnabled) {
        throw new Error("Refund is not available for this order");
      }

      if (
        !["NUMBER_ASSIGNED", "WAITING_FOR_SMS"].includes(
          order.status,
        )
      ) {
        throw new Error(
          "This order can only be cancelled while waiting for OTP",
        );
      }

      if (
        !order.supplierId ||
        !order.supplierName ||
        !order.supplierSlug ||
        !order.supplierOrderReference ||
        !order.supplierNumberReference
      ) {
        throw new Error(
          "Supplier cancellation information is unavailable",
        );
      }

      const adapter = getSupplierAdapter(
        order.supplierSlug,
        order.supplierName,
      );

      if (!adapter.cancelNumber) {
        throw new Error(
          "This supplier does not support number cancellation",
        );
      }

      const cancellation = await adapter.cancelNumber({
        orderId: order.id,
        supplierOrderReference:
          order.supplierOrderReference,
        supplierNumberReference:
          order.supplierNumberReference,
      });

        if (!cancellation.success) {
          throw new Error(
            "This number could not be cancelled. If you have already received an OTP, the number cannot be cancelled. Please contact our support team if you need assistance.",
          );
        }

      await client.query(
        `
          UPDATE orders
          SET
            status = 'CANCELLED',
            updated_at = NOW()
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
            $2,
            'CANCELLED',
            'CUSTOMER_CANCELLED',
            $3
          )
        `,
        [
          order.id,
          order.status,
          JSON.stringify({
            reason: "Customer cancelled while waiting for OTP",
            supplier: order.supplierName,
          }),
        ],
      );

      return createRefund(client, {
        userId: user.id,
        orderId: order.id,
        idempotencyKey: `CUSTOMER-CANCEL-${order.id}`,
        reason: "Customer cancelled before OTP was received",
      });
    });

    return NextResponse.json({
      success: true,
      status: "REFUNDED",
      refund: result,
      message:
        "Number cancelled successfully and the refund has been credited to your wallet.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to cancel number";

    if (message === "Order not found") {
      return NextResponse.json(
        { error: message },
        { status: 404 },
      );
    }

    if (
      message === "Refund is not available for this order" ||
      message === "This order can only be cancelled while waiting for OTP" ||
      message === "Supplier cancellation information is unavailable" ||
      message === "This supplier does not support number cancellation"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 409 },
      );
    }

    console.error("Order cancellation error:", error);

    return NextResponse.json(
      {
        error:
          message ||
          "Unable to cancel number. Please contact our team.",
      },
      { status: 500 },
    );
  }
}
