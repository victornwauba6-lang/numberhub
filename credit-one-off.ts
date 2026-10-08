import { db } from "./src/lib/db";
import { creditWallet } from "./src/lib/wallet/wallet-credit";

async function main() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const walletResult = await client.query<{
      id: string;
      balance_minor: string;
      currency: string;
    }>(
      `
        SELECT w.id, w.balance_minor, w.currency
        FROM users u
        JOIN wallets w ON w.user_id = u.id
        WHERE lower(u.email) = lower($1)
        FOR UPDATE
      `,
      ["ikennajjjjjjjjjjj@gmail.com"],
    );

    if (walletResult.rowCount !== 1) {
      throw new Error("Customer wallet not found");
    }

    const wallet = walletResult.rows[0];

    const result = await creditWallet({
      client,
      walletId: wallet.id,
      amountMinor: BigInt(170000),
      reference: `ADMIN-CREDIT-1700-${Date.now()}`,
      description: "Manual wallet credit - ₦1,700",
      transactionType: "ADJUSTMENT",
      metadata: {
        reason: "Customer wallet credit",
        customerEmail: "ikennajjjjjjjjjjj@gmail.com",
      },
    });

    await client.query("COMMIT");

    console.log("CREDIT SUCCESSFUL");
    console.log(`Customer: ikennajjjjjjjjjjj@gmail.com`);
    console.log(`Amount credited: ₦1,700`);
    console.log(`Previous balance: ₦${Number(wallet.balance_minor) / 100}`);
    console.log(`New balance: ₦${Number(wallet.balance_minor) / 100 + 1700}`);
    console.log(`Transaction ID: ${result.transactionId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

main().catch((error) => {
  console.error("CREDIT FAILED");
  console.error(error);
  process.exit(1);
});
