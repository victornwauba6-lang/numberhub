import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createWalletPayment } from "@/lib/payments/payment-service";
import { captureServerEvent } from "@/lib/analytics/posthog-server";

export const runtime = "nodejs";

type PaymentRequestBody = {
  amount?: unknown;
  idempotencyKey?: unknown;
  paymentMethod?: unknown;
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

  let body: PaymentRequestBody;

  try {
    body = (await request.json()) as PaymentRequestBody;
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
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount) ||
    !Number.isInteger(body.amount)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid whole-naira amount is required",
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

  if (
    body.paymentMethod !== undefined &&
    body.paymentMethod !== null &&
    typeof body.paymentMethod !== "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid payment method",
      },
      { status: 400 },
    );
  }

  try {
    const amountMinor = BigInt(body.amount) * BigInt(100);

    const result = await createWalletPayment({
      userId: user.id,
      amountMinor,
      currency: "NGN",
      paymentMethod:
        typeof body.paymentMethod === "string"
          ? body.paymentMethod.trim()
          : undefined,
      idempotencyKey: body.idempotencyKey.trim(),
    });

    await captureServerEvent(user.id, "numberhub_wallet_payment_created", {
      payment_id: result.paymentId,
      amount_minor: result.amountMinor,
      currency: result.currency,
      status: result.status,
      payment_method:
        typeof body.paymentMethod === "string"
          ? body.paymentMethod.trim()
          : undefined,
      provider_configured: result.providerId !== null,
    });

    return NextResponse.json({
      success: true,
      payment: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment could not be created";

    const status =
      message === "Wallet not found" ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
