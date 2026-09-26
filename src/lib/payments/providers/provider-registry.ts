import { db } from "@/lib/db";
import type { PaymentProvider } from "./payment-provider";
import { KorapayPaymentProvider } from "./korapay-provider";

const providers: Record<string, PaymentProvider> = {
  korapay: new KorapayPaymentProvider(),
};

export async function getActiveDepositProvider(): Promise<{
  id: string;
  provider: PaymentProvider | null;
} | null> {
  const result = await db.query<{
    id: string;
    slug: string;
  }>(
    `
      SELECT id, slug
      FROM payment_providers
      WHERE is_active = TRUE
        AND supports_deposit = TRUE
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `,
  );

  if (result.rowCount !== 1) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    provider: providers[row.slug] ?? null,
  };
}
