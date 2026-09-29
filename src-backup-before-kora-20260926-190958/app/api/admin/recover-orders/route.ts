import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { withTransaction } from "@/lib/db-transaction";
import { processOrder } from "@/lib/order-processing/order-processing-service";

export const runtime = "nodejs";

const RECOVERY_ORDER_IDS = new Set([
  "1934f4ff-b9de-45d0-9c24-bed23fe79569",
  "7b42e296-e34b-4518-9a24-c25bdd74c6d4",
]);

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = (await request.json()) as { orderId?: unknown };
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!RECOVERY_ORDER_IDS.has(orderId)) {
      return NextResponse.json(
        { success: false, error: "Recovery is restricted to the affected orders." },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      return processOrder(client, orderId);
    });

    return NextResponse.json({
      success: true,
      processing: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Order recovery failed.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
