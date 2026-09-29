import type {
  SupplierActivateNumberInput,
  SupplierActivateNumberResult,
  SupplierAdapter,
} from "@/lib/suppliers/supplier-adapter";

export type HttpSupplierAdapterConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  activatePath: string;
  timeoutMs?: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  const normalized = path.trim();

  if (!normalized) {
    throw new Error("Supplier activate path is required");
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function extractString(
  value: unknown,
  paths: string[][],
): string | null {
  for (const path of paths) {
    let current: unknown = value;

    for (const key of path) {
      if (
        current === null ||
        typeof current !== "object" ||
        !(key in current)
      ) {
        current = undefined;
        break;
      }

      current = (current as Record<string, unknown>)[key];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (
      typeof current === "number" ||
      typeof current === "bigint"
    ) {
      return String(current);
    }
  }

  return null;
}

export function createHttpSupplierAdapter(
  config: HttpSupplierAdapterConfig,
): SupplierAdapter {
  const name = config.name.trim();

  if (!name) {
    throw new Error("Supplier name is required");
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);

  if (!baseUrl) {
    throw new Error("Supplier base URL is required");
  }

  const apiKey = config.apiKey.trim();

  if (!apiKey) {
    throw new Error(`API key is required for supplier "${name}"`);
  }

  const activatePath = normalizePath(config.activatePath);
  const timeoutMs = Math.max(
    1000,
    config.timeoutMs ?? 15000,
  );

  return {
    name,

    async activateNumber(
      input: SupplierActivateNumberInput,
    ): Promise<SupplierActivateNumberResult> {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

      try {
        const response = await fetch(
          `${baseUrl}${activatePath}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${apiKey}`,
              "Idempotency-Key": `NUMBERHUB-${input.orderId}`,
            },
            body: JSON.stringify({
              orderId: input.orderId,
              productOptionId: input.productOptionId,
              countryCode: input.countryCode,
              service: input.serviceSlug,
              supplierProductId: input.supplierProductId,
            }),
            signal: controller.signal,
          },
        );

        const text = await response.text();

        let body: unknown = null;

        if (text.trim()) {
          try {
            body = JSON.parse(text);
          } catch {
            body = { rawText: text };
          }
        }

        if (!response.ok) {
          return {
            success: false,
            supplierOrderReference: null,
            phoneNumber: null,
            supplierNumberReference: null,
            rawResponse: body,
            errorCode: `SUPPLIER_HTTP_${response.status}`,
            errorMessage: `Supplier "${name}" returned HTTP ${response.status}.`,
          };
        }

        const success =
          body !== null &&
          typeof body === "object" &&
          "success" in body
            ? Boolean(
                (body as Record<string, unknown>).success,
              )
            : true;

        if (!success) {
          return {
            success: false,
            supplierOrderReference: extractString(body, [
              ["orderId"],
              ["order", "id"],
              ["data", "orderId"],
              ["data", "order", "id"],
            ]),
            phoneNumber: null,
            supplierNumberReference: null,
            rawResponse: body,
            errorCode:
              extractString(body, [
                ["errorCode"],
                ["error", "code"],
                ["code"],
              ]) ?? "SUPPLIER_REQUEST_FAILED",
            errorMessage:
              extractString(body, [
                ["errorMessage"],
                ["error", "message"],
                ["message"],
              ]) ??
              `Supplier "${name}" reported a failed activation.`,
          };
        }

        return {
          success: true,
          supplierOrderReference: extractString(body, [
            ["supplierOrderReference"],
            ["orderId"],
            ["order", "id"],
            ["data", "supplierOrderReference"],
            ["data", "orderId"],
            ["data", "order", "id"],
          ]),
          phoneNumber: extractString(body, [
            ["phoneNumber"],
            ["phone"],
            ["number"],
            ["data", "phoneNumber"],
            ["data", "phone"],
            ["data", "number"],
          ]),
          supplierNumberReference: extractString(body, [
            ["supplierNumberReference"],
            ["numberId"],
            ["numberReference"],
            ["data", "supplierNumberReference"],
            ["data", "numberId"],
            ["data", "numberReference"],
          ]),
          rawResponse: body,
        };
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return {
            success: false,
            supplierOrderReference: null,
            phoneNumber: null,
            supplierNumberReference: null,
            errorCode: "SUPPLIER_TIMEOUT",
            errorMessage: `Supplier "${name}" timed out after ${timeoutMs}ms.`,
          };
        }

        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "SUPPLIER_NETWORK_ERROR",
          errorMessage:
            error instanceof Error
              ? error.message
              : `Supplier "${name}" request failed.`,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
