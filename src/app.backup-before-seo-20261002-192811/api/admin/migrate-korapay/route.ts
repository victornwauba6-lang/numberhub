import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAdmin();

    const result = await db.query(`
      INSERT INTO payment_providers (
        name,
        slug,
        is_active,
        supports_deposit,
        supports_withdrawal,
        supports_webhooks,
        priority
      )
      VALUES (
        'Korapay',
        'korapay',
        TRUE,
        TRUE,
        FALSE,
        TRUE,
        1
      )
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active,
        supports_deposit = EXCLUDED.supports_deposit,
        supports_withdrawal = EXCLUDED.supports_withdrawal,
        supports_webhooks = EXCLUDED.supports_webhooks,
        priority = EXCLUDED.priority,
        updated_at = NOW()
      RETURNING id, name, slug, is_active, supports_deposit,
                supports_withdrawal, supports_webhooks, priority
    `);

    return NextResponse.json({
      success: true,
      message: "Korapay payment provider is configured",
      provider: result.rows[0],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to configure Korapay payment provider";

    return NextResponse.json(
      { success: false, error: message },
      { status: 403 },
    );
  }
}
