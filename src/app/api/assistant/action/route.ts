import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromSessionToken } from "@/lib/auth/session-service";
import { resolveCountry } from "@/lib/catalog/country-resolver";
import { getGlobalCatalog } from "@/lib/suppliers/catalog/global-catalog-service";
import { materializeGlobalCatalog } from "@/lib/suppliers/catalog/catalog-materializer";
import { syncVerificationOrder } from "@/lib/verification/verification-sync-service";
import { getCustomerHelp } from "@/lib/assistant/customer-help";

export const runtime = "nodejs";

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("numberhub_session")?.value;
  if (!token) return null;
  return getUserFromSessionToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please log in to use NumberHub Assistant.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const action = String(body?.action || "").trim();

    if (action === "customer_help") {
      const topic = String(body?.topic || "general").trim().toLowerCase();

      const allowedTopics = new Set([
        "whatsapp",
        "verification",
        "numbers",
        "wallet",
        "orders",
        "general",
      ]);

      const safeTopic = allowedTopics.has(topic) ? topic : "general";
      const message = getCustomerHelp(
        safeTopic as
          | "whatsapp"
          | "verification"
          | "numbers"
          | "wallet"
          | "orders"
          | "general",
      );

      return NextResponse.json({
        success: true,
        topic: safeTopic,
        message,
        data: { topic: safeTopic, message },
      });
    }

    if (action === "wallet") {
      const result = await db.query<{
        balanceMinor: string;
        currency: string;
      }>(
        `
          SELECT
            balance_minor AS "balanceMinor",
            currency
          FROM wallets
          WHERE user_id = $1
          LIMIT 1
        `,
        [user.id],
      );

      if (result.rowCount !== 1) {
        return NextResponse.json(
          { success: false, error: "Wallet not found." },
          { status: 404 },
        );
      }

      const wallet = result.rows[0];

      return NextResponse.json({
        success: true,
        wallet,
        data: wallet,
      });
    }

    if (action === "orders") {
      const result = await db.query(
        `
          SELECT
            o.id,
            o.status,
            o.currency,
            o.price_minor AS "priceMinor",
            po.refund_enabled AS "refundEnabled",
            o.expires_at AS "expiresAt",
            o.created_at AS "createdAt",
            o.completed_at AS "completedAt",
            c.code AS "countryCode",
            c.name AS "countryName",
            c.flag_emoji AS "countryFlag",
            s.slug AS "serviceSlug",
            s.name AS "serviceName",
            s.icon AS "serviceIcon",
            po.name AS "optionName"
          FROM orders o
          LEFT JOIN countries c ON c.id = o.country_id
          LEFT JOIN services s ON s.id = o.service_id
          LEFT JOIN product_options po ON po.id = o.product_option_id
          WHERE o.user_id = $1
          ORDER BY o.created_at DESC
          LIMIT 10
        `,
        [user.id],
      );

      const orders = result.rows.map((order) => ({
        id: String(order.id),
        status: String(order.status),
        currency: String(order.currency),
        priceMinor: String(order.priceMinor),
        refundEnabled: Boolean(order.refundEnabled),
        expiresAt: order.expiresAt ? String(order.expiresAt) : null,
        createdAt: String(order.createdAt),
        completedAt: order.completedAt
          ? String(order.completedAt)
          : null,
        countryCode: String(order.countryCode || ""),
        countryName: String(order.countryName || ""),
        countryFlag: String(order.countryFlag || ""),
        serviceSlug: String(order.serviceSlug || ""),
        serviceName: String(order.serviceName || ""),
        serviceIcon: String(order.serviceIcon || ""),
        optionName: String(order.optionName || ""),
      }));

      return NextResponse.json({
        success: true,
        orders,
        data: orders,
      });
    }

    if (action === "verification") {
      const result = await db.query<{
        id: string;
        status: string;
      }>(
        `
          SELECT id, status
          FROM orders
          WHERE user_id = $1
            AND status IN (
              'NUMBER_ASSIGNED',
              'WAITING_FOR_SMS',
              'CODE_RECEIVED'
            )
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [user.id],
      );

      if (result.rowCount !== 1) {
        return NextResponse.json({
          success: true,
          verification: null,
          message: "You do not have an active verification number right now.",
        });
      }

      const order = result.rows[0];
      const verification = await syncVerificationOrder(order.id);

      return NextResponse.json({
        success: true,
        verification: {
          orderId: verification.orderId,
          status: verification.status,
          phoneNumber: verification.phoneNumber,
          verificationCode: verification.verificationCode,
          message: verification.message,
          synced: verification.synced,
        },
        data: verification,
      });
    }

    if (action === "catalog") {
      const country = String(body?.country || "").trim();
      const service = String(body?.service || "").trim();

      const maxPriceNgn =
        body?.maxPriceNgn !== undefined &&
        body?.maxPriceNgn !== null &&
        body?.maxPriceNgn !== ""
          ? Number(body.maxPriceNgn)
          : null;

      if (!country || !service) {
        return NextResponse.json(
          {
            success: false,
            error: "Country and service are required.",
          },
          { status: 400 },
        );
      }

      const resolvedCountry = resolveCountry(country);

      if (!resolvedCountry?.iso2) {
        return NextResponse.json(
          {
            success: false,
            error: `Country could not be resolved: ${country}`,
          },
          { status: 400 },
        );
      }

      await materializeGlobalCatalog(
        resolvedCountry.iso2.toLowerCase(),
        service.toLowerCase(),
      );

      const catalog = await getGlobalCatalog(country, service);

      const optionRows = await db.query<{
        optionId: string;
        supplier: string;
        supplierOption: string;
        available: boolean;
        productOptionName: string | null;
        priceMinor: string | null;
        promoPriceMinor: string | null;
        countryName: string | null;
        countryFlag: string | null;
        serviceName: string | null;
      }>(
        `
          SELECT
            po.id AS "optionId",
            sup.slug AS supplier,
            po.supplier_product_id AS "supplierOption",
            po.is_available AS available,
            po.name AS "productOptionName",
            po.price_minor AS "priceMinor",
            po.promo_price_minor AS "promoPriceMinor",
            c.name AS "countryName",
            c.flag_emoji AS "countryFlag",
            s.name AS "serviceName"
          FROM product_options po
          INNER JOIN products p ON p.id = po.product_id
          INNER JOIN countries c ON c.id = p.country_id
          INNER JOIN services s ON s.id = p.service_id
          INNER JOIN suppliers sup ON sup.id = po.supplier_id
          WHERE LOWER(c.code) = $1
            AND LOWER(s.slug) = $2
            AND p.is_active = true
            AND c.is_active = true
            AND c.is_test = false
            AND s.is_active = true
            AND s.is_test = false
            AND po.is_active = true
            AND sup.is_active = true
            AND sup.is_test = false
        `,
        [
          resolvedCountry.iso2.toLowerCase(),
          service.toLowerCase(),
        ],
      );

      const optionIdMap = new Map(
        optionRows.rows.map((row) => [
          `${row.supplier.toLowerCase()}:${row.supplierOption.toLowerCase()}`,
          row,
        ]),
      );

      const allOptions = catalog.options
        .map((option, index) => {
          const materialized = optionIdMap.get(
            `${option.supplier.toLowerCase()}:${option.supplierOption.toLowerCase()}`,
          );

          const customerPriceNgn = Number(option.customerPriceNgn || 0);

          return {
            optionNumber: index + 1,
            optionId: String(option.optionId || ""),
            productOptionId: materialized?.optionId
              ? String(materialized.optionId)
              : null,
            supplier: String(option.supplier || ""),
            supplierOption: String(option.supplierOption || ""),
            customerPriceNgn,
            available: Boolean(option.available),
            materializedAvailable: Boolean(materialized?.available),
            purchasable:
              Boolean(option.available) &&
              Boolean(materialized?.optionId) &&
              Boolean(materialized?.available),
            stock:
              option.stock === undefined || option.stock === null
                ? null
                : Number(option.stock),
            countryCode: resolvedCountry.iso2.toUpperCase(),
            countryName: String(
              materialized?.countryName || catalog.country || country,
            ),
            countryFlag: String(materialized?.countryFlag || ""),
            serviceSlug: service.toLowerCase(),
            serviceName: String(
              materialized?.serviceName || catalog.service || service,
            ),
          };
        });

      const usableOptions = allOptions
        .filter((option) => option.purchasable)
        .sort((a, b) => a.customerPriceNgn - b.customerPriceNgn);

      const hasBudget =
        maxPriceNgn !== null && Number.isFinite(maxPriceNgn);

      const budgetOptions = hasBudget
        ? usableOptions.filter(
            (option) => option.customerPriceNgn <= maxPriceNgn,
          )
        : usableOptions;

      const budgetExceeded =
        hasBudget &&
        budgetOptions.length === 0 &&
        usableOptions.length > 0;

      const options = (
        budgetOptions.length > 0
          ? budgetOptions
          : budgetExceeded
            ? usableOptions.slice(0, 1)
            : allOptions
                .filter((option) => option.available)
                .sort((a, b) => a.customerPriceNgn - b.customerPriceNgn)
      ).slice(0, Number(body?.limit || 8));

            return NextResponse.json({
        success: true,
        country: catalog.country || country,
        service: catalog.service || service,
        options,
        budgetExceeded,
        requestedMaxPriceNgn: hasBudget ? maxPriceNgn : null,
        supplierErrors: catalog.supplierErrors || [],
        data: options,
      });
    }

    if (action === "navigate") {
      const destination = String(body?.destination || "")
        .trim()
        .toLowerCase();

      const routes: Record<string, string> = {
        wallet: "/wallet",
        orders: "/orders",
        marketplace: "/market",
        market: "/market",
        support: "/support",
        profile: "/profile",
        home: "/dashboard",
      };

      const route = routes[destination];

      if (!route) {
        return NextResponse.json(
          {
            success: false,
            error: "That NumberHub section could not be found.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        route,
        destination,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported assistant action.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Assistant action error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete that request right now.",
      },
      { status: 500 },
    );
  }
}
