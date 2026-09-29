import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { createRefund } from "@/lib/refunds/refund-service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;

    const orderId =
      typeof payload.orderId === "string"
        ? payload.orderId.trim()
        : "";

    const idempotencyKey =
      typeof payload.idempotencyKey === "string"
        ? payload.idempotencyKey.trim()
        : "";

    const reason =
      typeof payload.reason === "string"
        ? payload.reason.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency key is required" },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Refund reason is required" },
        { status: 400 },
      );
    }

    if (reason.length > 100) {
      return NextResponse.json(
        { error: "Refund reason is too long" },
        { status: 400 },
      );
    }

    const refund = await withTransaction(async (client) => {
      return createRefund(client, {
        userId: user.id,
        orderId,
        idempotencyKey,
        reason,
      });
    });

    return NextResponse.json(
      {
        success: true,
        refund,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process refund";

    if (message === "Order not found") {
      return NextResponse.json(
        { error: message },
        { status: 404 },
      );
    }

    if (
      message === "Refund is not available for this order" ||
      message === "Order is not eligible for a refund" ||
      message === "A refund already exists for this order" ||
      message === "Refund idempotency key belongs to another refund" ||
      message === "Existing refund is not completed"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 409 },
      );
    }

    if (
      message === "User ID is required" ||
      message === "Order ID is required" ||
      message === "Idempotency key is required" ||
      message === "Refund reason is required" ||
      message === "Refund reason is too long" ||
      message === "Refund amount must be greater than zero"
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    console.error("Refund API error:", error);

    return NextResponse.json(
      { error: "Unable to process refund" },
      { status: 500 },
    );
  }
}
