import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { processOrder } from "@/lib/order-processing/order-processing-service";
import { createPurchase } from "@/lib/purchases/purchase-service";
import { captureServerEvent } from "@/lib/analytics/posthog-server";

export const runtime = "nodejs";

type PurchaseRequestBody = {
  productOptionId?: unknown;
  idempotencyKey?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 },
    );
  }

  let body: PurchaseRequestBody;

  try {
    body = (await request.json()) as PurchaseRequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON request body",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.productOptionId !== "string" ||
    !body.productOptionId.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "productOptionId is required",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.idempotencyKey !== "string" ||
    !body.idempotencyKey.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "idempotencyKey is required",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createPurchase({
      userId: user.id,
      productOptionId: body.productOptionId.trim(),
      idempotencyKey: body.idempotencyKey.trim(),
    });

    const processing = await withTransaction(async (client) => {
      return processOrder(client, result.orderId);
    });

    await captureServerEvent(user.id, "numberhub_purchase", {
      order_id: result.orderId,
      status: result.status,
      currency: result.currency,
      price_minor: result.priceMinor,
      refund_enabled: result.refundEnabled,
      replayed: result.replayed,
      processing_status:
        typeof processing === "object" &&
        processing !== null &&
        "status" in processing
          ? processing.status
          : undefined,
    });

    return NextResponse.json({
      success: true,
      purchase: result,
      processing,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Purchase could not be created";

    const status =
      message === "Wallet not found" ||
      message === "Product option not found"
        ? 404
        : message === "Insufficient wallet balance"
          ? 409
          : message === "Product option is unavailable" ||
              message === "Purchase limit reached for this option"
            ? 409
            : 400;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
