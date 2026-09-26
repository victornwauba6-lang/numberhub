"use client";

import { useState } from "react";

export default function KorapayMigrationPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function runMigration() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/migrate-korapay", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setMessage(JSON.stringify(data, null, 2));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Migration failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Korapay Provider Migration</h1>
      <p>
        This temporary admin page configures the Korapay payment provider in
        the production database.
      </p>

      <button
        type="button"
        onClick={runMigration}
        disabled={loading}
        style={{
          padding: "12px 18px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running migration..." : "Run Korapay Migration"}
      </button>

      {message && (
        <pre
          style={{
            marginTop: 20,
            padding: 16,
            background: "#f5f5f5",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </pre>
      )}
    </main>
  );
}
