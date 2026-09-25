"use client";

import { useState } from "react";

const orders = [
  {
    id: "7b42e296-e34b-4518-9a24-c25bdd74c6d4",
    label: "Facebook — Malaysia — ₦800",
  },
  {
    id: "1934f4ff-b9de-45d0-9c24-bed23fe79569",
    label: "TikTok — Albania — ₦900",
  },
];

export default function RecoverOrdersPage() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function recover(orderId: string) {
    setLoading(orderId);

    try {
      const response = await fetch("/api/admin/recover-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      setResults((current) => ({
        ...current,
        [orderId]: response.ok
          ? `Success: ${JSON.stringify(data.processing)}`
          : `Error: ${data.error ?? "Recovery failed"}`,
      }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        [orderId]:
          error instanceof Error ? error.message : "Recovery request failed.",
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Temporary Order Recovery</h1>
      <p>
        This page is for recovering the two orders affected by the production
        migration issue.
      </p>

      {orders.map((order) => (
        <section
          key={order.id}
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
          }}
        >
          <strong>{order.label}</strong>

          <button
            onClick={() => recover(order.id)}
            disabled={loading !== null}
            style={{
              display: "block",
              marginTop: 12,
              padding: "12px 16px",
              borderRadius: 8,
              border: 0,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading === order.id ? "Processing..." : "Recover this order"}
          </button>

          {results[order.id] && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 12,
                fontSize: 12,
              }}
            >
              {results[order.id]}
            </pre>
          )}
        </section>
      ))}
    </main>
  );
}
