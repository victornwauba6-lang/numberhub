import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
const posthogHost = "https://us.posthog.com";
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;

const now = new Date();

// NumberHub operates in Nigeria (WAT, UTC+1).
// Convert Nigeria midnight to the corresponding UTC timestamp.
const startToday = new Date(
  Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ) - 60 * 60 * 1000,
);

const start7Days = new Date(startToday);
start7Days.setUTCDate(start7Days.getUTCDate() - 7);

const start10Minutes = new Date(now.getTime() - 10 * 60 * 1000);
const start5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

const formatHogQLDateTime = (date: Date) =>
  date.toISOString().replace("T", " ").replace("Z", "");

const todayStart = formatHogQLDateTime(startToday);
const sevenDaysStart = formatHogQLDateTime(start7Days);
const tenMinutesStart = formatHogQLDateTime(start10Minutes);
const fiveMinutesStart = formatHogQLDateTime(start5Minutes);

type HogQLResponse = {
  results?: unknown[][];
  error?: string | null;
};

async function runHogQL(query: string): Promise<unknown[][]> {
  if (!posthogKey || !posthogProjectId) {
    throw new Error("PostHog server configuration is missing.");
  }

  const response = await fetch(
    `${posthogHost}/api/projects/${posthogProjectId}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${posthogKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`PostHog query failed with ${response.status}.`);
  }

  const data = (await response.json()) as HogQLResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  return Array.isArray(data.results) ? data.results : [];
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  if (!posthogKey || !posthogProjectId) {
    return NextResponse.json({
      connected: false,
      message: "PostHog analytics is not configured.",
      metrics: {
        visitorsToday: null,
        liveVisitors: null,
        sessions: null,
        newVisitors: null,
        marketplaceVisits: null,
        purchaseAttempts: null,
        customerSignupsToday: null,
        ordersToday: null,
        completedOrdersToday: null,
        successfulPaymentsToday: null,
        walletDepositsTodayMinor: null,
        purchaseRevenueTodayMinor: null,
      },
      traffic: [],
      businessTraffic: [],
      liveVisitors: [],
      topPages: [],
      countries: [],
      devices: [],
      funnel: [],
    });
  }

  try {
    const [
      metricsRows,
      trafficRows,
      topPageRows,
      deviceRows,
      countryRows,
      liveRows,
      businessMetricsRows,
      businessTrafficRows,
    ] = await Promise.all([
      runHogQL(`
        SELECT
          uniqIf(
            distinct_id,
            timestamp >= '${todayStart}'
          ) AS visitors_today,

          uniqIf(
            properties.$session_id,
            properties.$session_id != ''
            AND timestamp >= '${sevenDaysStart}'
          ) AS sessions_7d,

          uniqIf(
            distinct_id,
            timestamp >= '${todayStart}'
            AND properties.$is_first_visit = true
          ) AS new_visitors_today,

          countIf(
            event = '$pageview'
            AND properties.$pathname = '/market'
            AND timestamp >= '${todayStart}'
          ) AS marketplace_visits_today
        FROM events
        WHERE timestamp >= '${todayStart}'
      `),

      runHogQL(`
        SELECT
          toDate(timestamp) AS day,
          uniq(distinct_id) AS visitors,
          countIf(event = '$pageview') AS pageviews,
          uniqIf(
            properties.$session_id,
            properties.$session_id != ''
          ) AS sessions
        FROM events
        WHERE timestamp >= '${sevenDaysStart}'
        GROUP BY day
        ORDER BY day ASC
      `),

      runHogQL(`
        SELECT
          properties.$pathname AS pathname,
          count() AS views
        FROM events
        WHERE
          event = '$pageview'
          AND timestamp >= '${sevenDaysStart}'
          AND properties.$pathname != ''
        GROUP BY pathname
        ORDER BY views DESC
        LIMIT 10
      `),

      runHogQL(`
        SELECT
          properties.$device_type AS device,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE
          timestamp >= '${sevenDaysStart}'
          AND properties.$device_type != ''
        GROUP BY device
        ORDER BY visitors DESC
        LIMIT 10
      `),

      runHogQL(`
        SELECT
          properties.$geoip_country_name AS country,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE
          timestamp >= '${sevenDaysStart}'
          AND properties.$geoip_country_name != ''
        GROUP BY country
        ORDER BY visitors DESC
        LIMIT 10
      `),

      runHogQL(`
        SELECT
          event,
          timestamp,
          distinct_id,
          properties.$pathname AS pathname
        FROM events
        WHERE timestamp >= '${tenMinutesStart}'
        ORDER BY timestamp DESC
        LIMIT 20
      `),

      db.query<{
        customerSignupsToday: string;
        ordersToday: string;
        completedOrdersToday: string;
        successfulPaymentsToday: string;
        walletDepositsTodayMinor: string;
        purchaseRevenueTodayMinor: string;
      }>(`
        SELECT
          (
            SELECT COUNT(*)::text
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE
              r.name = 'CUSTOMER'
              AND u.created_at >= $1
          ) AS "customerSignupsToday",

          (
            SELECT COUNT(*)::text
            FROM orders
            WHERE created_at >= $1
          ) AS "ordersToday",

          (
            SELECT COUNT(*)::text
            FROM orders
            WHERE
              created_at >= $1
              AND status = 'COMPLETED'
          ) AS "completedOrdersToday",

          (
            SELECT COUNT(*)::text
            FROM payments
            WHERE
              created_at >= $1
              AND status = 'SUCCESS'
          ) AS "successfulPaymentsToday",

          (
            SELECT COALESCE(SUM(amount_minor), 0)::text
            FROM wallet_transactions
            WHERE
              created_at >= $1
              AND transaction_type = 'DEPOSIT'
              AND direction = 'CREDIT'
          ) AS "walletDepositsTodayMinor",

          (
            SELECT COALESCE(SUM(price_minor), 0)::text
            FROM orders
            WHERE
              created_at >= $1
              AND status = 'COMPLETED'
          ) AS "purchaseRevenueTodayMinor"
      `, [startToday]),

      db.query<{
        day: string;
        signups: string;
        orders: string;
        completedOrders: string;
        successfulPayments: string;
        walletDepositsMinor: string;
        purchaseRevenueMinor: string;
      }>(`
        SELECT
          day::date::text AS day,
          COUNT(*) FILTER (WHERE event_type = 'SIGNUP')::text AS signups,
          COUNT(*) FILTER (WHERE event_type = 'ORDER')::text AS orders,
          COUNT(*) FILTER (WHERE event_type = 'COMPLETED_ORDER')::text AS "completedOrders",
          COUNT(*) FILTER (WHERE event_type = 'SUCCESSFUL_PAYMENT')::text AS "successfulPayments",
          COALESCE(
            SUM(wallet_deposit_minor)
            FILTER (WHERE event_type = 'WALLET_DEPOSIT'),
            0
          )::text AS "walletDepositsMinor",
          COALESCE(
            SUM(purchase_revenue_minor)
            FILTER (WHERE event_type = 'COMPLETED_ORDER'),
            0
          )::text AS "purchaseRevenueMinor"
        FROM (
          SELECT
            u.created_at AS day,
            'SIGNUP' AS event_type,
            0::bigint AS wallet_deposit_minor,
            0::bigint AS purchase_revenue_minor
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          WHERE
            r.name = 'CUSTOMER'
            AND u.created_at >= $1

          UNION ALL

          SELECT
            created_at,
            'ORDER',
            0,
            0
          FROM orders
          WHERE created_at >= $1

          UNION ALL

          SELECT
            created_at,
            CASE
              WHEN status = 'COMPLETED' THEN 'COMPLETED_ORDER'
              ELSE 'ORDER'
            END,
            0,
            CASE
              WHEN status = 'COMPLETED' THEN price_minor
              ELSE 0
            END
          FROM orders
          WHERE
            created_at >= $1
            AND status = 'COMPLETED'

          UNION ALL

          SELECT
            created_at,
            'SUCCESSFUL_PAYMENT',
            0,
            0
          FROM payments
          WHERE
            created_at >= $1
            AND status = 'SUCCESS'

          UNION ALL

          SELECT
            created_at,
            'WALLET_DEPOSIT',
            CASE
              WHEN transaction_type = 'DEPOSIT'
                AND direction = 'CREDIT'
              THEN amount_minor
              ELSE 0
            END,
            0
          FROM wallet_transactions
          WHERE
            created_at >= $1
            AND transaction_type = 'DEPOSIT'
            AND direction = 'CREDIT'
        ) activity
        GROUP BY day::date
        ORDER BY day::date ASC
      `, [start7Days]),
    ]);

    const metrics = metricsRows[0] || [];
    const businessMetrics = businessMetricsRows.rows[0];

    const liveVisitorsRows = await runHogQL(`
      SELECT uniq(distinct_id) AS visitors
      FROM events
      WHERE timestamp >= '${fiveMinutesStart}'
    `);

    const visitorsToday = Number(metrics[0] ?? 0);
    const sessions = Number(metrics[1] ?? 0);
    const newVisitors = Number(metrics[2] ?? 0);
    const marketplaceVisits = Number(metrics[3] ?? 0);
    const liveVisitors = Number(liveVisitorsRows[0]?.[0] ?? 0);

    const trafficByDay = new Map(
      trafficRows.map((row) => [
        String(row[0]),
        {
          day: String(row[0]),
          visitors: Number(row[1] ?? 0),
          pageviews: Number(row[2] ?? 0),
          sessions: Number(row[3] ?? 0),
        },
      ]),
    );

    const businessTrafficByDay = new Map(
      businessTrafficRows.rows.map((row) => [
        String(row.day),
        {
          day: String(row.day),
          signups: Number(row.signups ?? 0),
          orders: Number(row.orders ?? 0),
          completedOrders: Number(row.completedOrders ?? 0),
          successfulPayments: Number(row.successfulPayments ?? 0),
          walletDepositsMinor: String(row.walletDepositsMinor ?? "0"),
          purchaseRevenueMinor: String(row.purchaseRevenueMinor ?? "0"),
        },
      ]),
    );

    const traffic: {
      day: string;
      visitors: number;
      pageviews: number;
      sessions: number;
    }[] = [];

    const businessTraffic: {
      day: string;
      signups: number;
      orders: number;
      completedOrders: number;
      successfulPayments: number;
      walletDepositsMinor: string;
      purchaseRevenueMinor: string;
    }[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(startToday);
      date.setUTCDate(date.getUTCDate() - offset);
      const day = date.toISOString().slice(0, 10);

      traffic.push(
        trafficByDay.get(day) ?? {
          day,
          visitors: 0,
          pageviews: 0,
          sessions: 0,
        },
      );

      businessTraffic.push(
        businessTrafficByDay.get(day) ?? {
          day,
          signups: 0,
          orders: 0,
          completedOrders: 0,
          successfulPayments: 0,
          walletDepositsMinor: "0",
          purchaseRevenueMinor: "0",
        },
      );
    }

    return NextResponse.json({
      connected: true,
      message:
        "Real PostHog website analytics and PostgreSQL business analytics connected.",

      metrics: {
        visitorsToday,
        liveVisitors,
        sessions,
        newVisitors,
        marketplaceVisits,
        purchaseAttempts: null,

        customerSignupsToday: Number(
          businessMetrics?.customerSignupsToday ?? 0,
        ),

        ordersToday: Number(
          businessMetrics?.ordersToday ?? 0,
        ),

        completedOrdersToday: Number(
          businessMetrics?.completedOrdersToday ?? 0,
        ),

        successfulPaymentsToday: Number(
          businessMetrics?.successfulPaymentsToday ?? 0,
        ),

        walletDepositsTodayMinor:
          businessMetrics?.walletDepositsTodayMinor ?? "0",

        purchaseRevenueTodayMinor:
          businessMetrics?.purchaseRevenueTodayMinor ?? "0",
      },

      traffic,

      businessTraffic,

      liveVisitors: liveRows.map((row) => ({
        event: String(row[0] ?? ""),
        timestamp: String(row[1] ?? ""),
        distinctId: String(row[2] ?? ""),
        pathname: String(row[3] ?? ""),
      })),

      topPages: topPageRows.map((row) => ({
        pathname: String(row[0] ?? ""),
        views: Number(row[1] ?? 0),
      })),

      countries: countryRows.map((row) => ({
        country: String(row[0] ?? ""),
        visitors: Number(row[1] ?? 0),
      })),

      devices: deviceRows.map((row) => ({
        device: String(row[0] ?? ""),
        visitors: Number(row[1] ?? 0),
      })),

      funnel: [],
    });
  } catch (error) {
    console.error("[Admin Analytics] Query failed:", error);

    return NextResponse.json(
      {
        connected: false,
        message: "Analytics data could not be loaded.",
        metrics: {
          visitorsToday: null,
          liveVisitors: null,
          sessions: null,
          newVisitors: null,
          marketplaceVisits: null,
          purchaseAttempts: null,
          customerSignupsToday: null,
          ordersToday: null,
          completedOrdersToday: null,
          successfulPaymentsToday: null,
          walletDepositsTodayMinor: null,
          purchaseRevenueTodayMinor: null,
        },
        traffic: [],
        businessTraffic: [],
        liveVisitors: [],
        topPages: [],
        countries: [],
        devices: [],
        funnel: [],
      },
      { status: 500 },
    );
  }
}
