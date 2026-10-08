import { db } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/wallet-credit";

async function main() {
  const email = "ikennajjjjjjjjjjj@gmail.com";
  const amountMinor = BigInt(170000);

  const userResult = await db.query(
    `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );

  if (userResult.rowCount !== 1) {
    throw new Error(`User not found: ${email}`);
  }

  const userId = userResult.rows[0].id;

  const walletResult = await db.query(
    `SELECT id FROM wallets WHERE user_id = $1 LIMIT 1`,
    [userId],
  );

  if (walletResult.rowCount !== 1) {
    throw new Error(`Wallet not found for ${email}`);
  }

  const walletId = walletResult.rows[0].id;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await creditWallet({
      client,
      walletId,
      amountMinor,
      reference: `REFUND-${Date.now()}`,
      description: "Customer refund",
      transactionType: "REFUND",
      metadata: {
        customerEmail: email,
        reason: "Customer refund",
      },
    });

    await client.query("COMMIT");

    console.log(`Successfully refunded ₦1,700 to ${email}`);
    console.log(`Transaction ID: ${result.transactionId}`);
    console.log(`New balance: ₦${Number(result.balanceAfterMinor) / 100}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error("Refund failed:", error);
  process.exit(1);
});
