import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { processOrder } from "@/lib/order-processing/order-processing-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  void request;

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

  const { id } = await context.params;
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
    const result = await withTransaction(async (client) => {
      const ownershipResult = await client.query(
        `
          SELECT id
          FROM orders
          WHERE id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [orderId, user.id],
      );

      if (ownershipResult.rowCount !== 1) {
        throw new Error("Order not found");
      }

      return processOrder(client, orderId);
    });

    return NextResponse.json({
      success: true,
      processing: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Order processing failed";

    const status =
      message === "Order not found"
        ? 404
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
