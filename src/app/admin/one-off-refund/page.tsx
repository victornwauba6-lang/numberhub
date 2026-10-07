"use client";

import { useState } from "react";

export default function OneOffRefundPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function processRefund() {
    if (!confirm("Credit ₦1,700 refund to ikennajjjjjjjjjjj@gmail.com?")) {
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/admin/one-off-refund", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Refund failed");
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Refund failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>One-Off Customer Refund</h1>
      <p>
        Customer: <strong>ikennajjjjjjjjjjj@gmail.com</strong>
      </p>
      <p>
        Amount: <strong>₦1,700</strong>
      </p>

      <button
        onClick={processRefund}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "14px 20px",
          borderRadius: 8,
          border: 0,
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {loading ? "Processing..." : "Credit ₦1,700 Refund"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            whiteSpace: "pre-wrap",
            overflowX: "auto",
          }}
        >
          {result}
        </pre>
      )}
    </main>
  );
}
