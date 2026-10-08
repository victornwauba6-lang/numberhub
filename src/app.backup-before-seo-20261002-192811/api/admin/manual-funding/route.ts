import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { withTransaction } from "@/lib/db-transaction";
import {
  approveManualFundingRequest,
  rejectManualFundingRequest,
} from "@/lib/manual-funding/manual-funding-service";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const result = await db.query(
      `
        SELECT
          m.id,
          m.funding_id AS "fundingId",
          m.amount_minor::text AS "amountMinor",
          m.currency,
          m.status,
          m.admin_note AS "adminNote",
          m.created_at AS "createdAt",
          m.reviewed_at AS "reviewedAt",
          u.email AS "userEmail"
        FROM manual_funding_requests m
        INNER JOIN users u ON u.id = m.user_id
        ORDER BY
          CASE WHEN m.status = 'PENDING' THEN 0 ELSE 1 END,
          m.created_at DESC
        LIMIT 100
      `,
    );

    return NextResponse.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load funding requests";

    return NextResponse.json(
      { success: false, error: message },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    let body: {
      fundingRequestId?: unknown;
      action?: unknown;
      adminNote?: unknown;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    if (typeof body.fundingRequestId !== "string" || !body.fundingRequestId.trim()) {
      return NextResponse.json(
        { success: false, error: "Funding request ID is required" },
        { status: 400 },
      );
    }

    if (body.action !== "APPROVE" && body.action !== "REJECT") {
      return NextResponse.json(
        { success: false, error: "Action must be APPROVE or REJECT" },
        { status: 400 },
      );
    }

    if (body.adminNote !== undefined && typeof body.adminNote !== "string") {
      return NextResponse.json(
        { success: false, error: "Admin note must be text" },
        { status: 400 },
      );
    }

    const fundingRequestId = (body.fundingRequestId as string).trim();

    const result = await withTransaction(async (client) => {
      if (body.action === "APPROVE") {
        return approveManualFundingRequest(client, {
          fundingRequestId: fundingRequestId,
          adminUserId: admin.id,
        });
      }

      return rejectManualFundingRequest(client, {
        fundingRequestId: fundingRequestId,
        adminUserId: admin.id,
        adminNote:
          typeof body.adminNote === "string"
            ? body.adminNote
            : undefined,
      });
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Funding request could not be processed";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
