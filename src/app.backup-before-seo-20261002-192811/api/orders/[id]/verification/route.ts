import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { syncVerificationOrder } from "@/lib/verification/verification-sync-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
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

  const { id } = await params;
  const orderId = id?.trim();

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        error: "Order ID is required",
      },
      { status: 400 },
    );
  }

  try {
    const ownership = await import("@/lib/db").then(({ db }) =>
      db.query<{ id: string }>(
        `
          SELECT id
          FROM orders
          WHERE id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [orderId, user.id],
      ),
    );

    if (ownership.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 },
      );
    }

    const verification = await syncVerificationOrder(orderId);

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error(
      "[Order Verification API] Verification sync error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check verification status",
      },
      { status: 500 },
    );
  }
}
