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
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f8f7",
        color: "#111827",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>
          Temporary Order Recovery
        </h1>

        <p style={{ color: "#4b5563", lineHeight: 1.5 }}>
          Use this page only to recover the two orders affected by the
          production migration issue.
        </p>

        {orders.map((order) => (
          <section
            key={order.id}
            style={{
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: 16,
              padding: 20,
              marginTop: 18,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 6,
              }}
            >
              {order.label}
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                wordBreak: "break-all",
              }}
            >
              {order.id}
            </div>

            <button
              onClick={() => recover(order.id)}
              disabled={loading !== null}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 10,
                border: "none",
                background: "#111827",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading === order.id
                ? "Processing..."
                : "Recover this order"}
            </button>

            {results[order.id] && (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 8,
                  background: "#f3f4f6",
                  color: "#111827",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {results[order.id]}
              </pre>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
