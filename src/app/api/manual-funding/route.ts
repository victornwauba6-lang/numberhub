import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { createManualFundingRequest } from "@/lib/manual-funding/manual-funding-service";

export const runtime = "nodejs";

type RequestBody = {
  amount?: unknown;
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

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
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

  try {
    const result = await withTransaction((client) =>
      createManualFundingRequest(client, {
        userId: user.id,
        amountMinor: BigInt(body.amount as number) * BigInt(100),
      }),
    );

    return NextResponse.json({
      success: true,
      fundingRequest: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Funding request could not be created";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
