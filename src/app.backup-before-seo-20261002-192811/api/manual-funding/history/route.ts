import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const client = db;

    const result = await client.query(
      `
        SELECT
          id,
          funding_id AS "fundingId",
          amount_minor::text AS "amountMinor",
          currency,
          status,
          admin_note AS "adminNote",
          created_at AS "createdAt",
          reviewed_at AS "reviewedAt"
        FROM manual_funding_requests
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [user.id],
    );

    return NextResponse.json({
      success: true,
      fundingRequests: result.rows,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Funding history could not be loaded" },
      { status: 500 },
    );
  }
}
