import type {
  SupplierActivateNumberInput,
  SupplierActivateNumberResult,
  SupplierAdapter,
  SupplierVerificationStatusInput,
  SupplierVerificationStatusResult,
  SupplierCancelNumberInput,
  SupplierCancelNumberResult,
} from "@/lib/suppliers/supplier-adapter";

const SMSPOOL_BASE_URL = "https://api.smspool.net";

function extractString(
  value: unknown,
  keys: string[],
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const item = record[key];

    if (typeof item === "string" && item.trim()) {
      return item.trim();
    }

    if (typeof item === "number" || typeof item === "bigint") {
      return String(item);
    }
  }

  return null;
}

function extractNumber(
  value: unknown,
  keys: string[],
): number | null {
  const stringValue = extractString(value, keys);

  if (!stringValue) {
    return null;
  }

  const parsed = Number(stringValue);

  return Number.isFinite(parsed) ? parsed : null;
}

async function smsPoolRequest(
  apiKey: string,
  endpoint: string,
  params: Record<string, string>,
): Promise<unknown> {
  const body = new URLSearchParams({
    key: apiKey,
    ...params,
  });

  const response = await fetch(`${SMSPOOL_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();

  let parsed: unknown = null;

  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { rawText: text };
    }
  }

  if (!response.ok) {
    const message =
      extractString(parsed, ["message", "type", "error"]) ??
      `SMSPool returned HTTP ${response.status}.`;

    throw new Error(`SMSPool API ${response.status}: ${message}`);
  }

  return parsed;
}

function normalizeCountry(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

function normalizeService(serviceSlug: string): string {
  return serviceSlug.trim().toLowerCase();
}

function serviceNameForSmsPool(serviceSlug: string): string {
  const service = normalizeService(serviceSlug);

  const serviceMap: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    telegram: "Telegram",
    tiktok: "TikTok",
    google: "Google",
    discord: "Discord",
    twitter: "Twitter",
    x: "Twitter",
    reddit: "Reddit",
    snapchat: "Snapchat",
  };

  return serviceMap[service] ?? service;
}

export function createSmsPoolAdapter(
  apiKey: string,
): SupplierAdapter {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("SMSPOOL_API_KEY is required");
  }

  return {
    name: "SMSPool",

    async activateNumber(
      input: SupplierActivateNumberInput,
    ): Promise<SupplierActivateNumberResult> {
      const country = normalizeCountry(input.countryCode);
      const service = normalizeService(input.serviceSlug);
      const supplierProductId = input.supplierProductId.trim();
      const [supplierServiceId, poolId] = supplierProductId.split(":", 2);

      if (!country) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "INVALID_COUNTRY",
          errorMessage: "SMSPool country is required.",
        };
      }

      if (!service || !supplierServiceId || !poolId) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "INVALID_SERVICE",
          errorMessage: "SMSPool service and pool IDs are required.",
        };
      }

      if (service === "whatsapp") {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "SERVICE_NOT_SUPPORTED",
          errorMessage: "SMSPool is not configured for WhatsApp.",
        };
      }

      try {
        const purchaseParams: Record<string, string> = {
          country,
          service: supplierServiceId,
          pool: poolId,
        };

        if (
          typeof input.maxPriceUsd === "number" &&
          Number.isFinite(input.maxPriceUsd) &&
          input.maxPriceUsd > 0
        ) {
          purchaseParams.max_price = input.maxPriceUsd.toFixed(4);
        }

        const body = await smsPoolRequest(
          normalizedApiKey,
          "/purchase/sms",
          purchaseParams,
        );

        const success = extractNumber(body, ["success"]);

        if (success !== 1) {
          const failureType =
            extractString(body, ["type", "message", "error"]) ??
            "SMSPool purchase failed.";

          return {
            success: false,
            supplierOrderReference: null,
            phoneNumber: null,
            supplierNumberReference: null,
            rawResponse: body,
            errorCode: `SMSPOOL_${failureType
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "_")}`,
            errorMessage: failureType,
          };
        }

        const supplierOrderReference = extractString(body, [
          "order_id",
          "orderId",
          "order_code",
        ]);

        const phoneNumber = extractString(body, [
          "phonenumber",
          "phone",
          "number",
        ]);

        if (!supplierOrderReference || !phoneNumber) {
          return {
            success: false,
            supplierOrderReference,
            phoneNumber,
            supplierNumberReference: supplierOrderReference,
            rawResponse: body,
            errorCode: "SUPPLIER_INCOMPLETE_RESPONSE",
            errorMessage:
              "SMSPool returned an incomplete activation response.",
          };
        }

        return {
          success: true,
          supplierOrderReference,
          phoneNumber,
          supplierNumberReference: supplierOrderReference,
          rawResponse: body,
        };
      } catch (error: unknown) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "SUPPLIER_REQUEST_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "SMSPool activation request failed.",
        };
      }
    },

    async getVerificationStatus(
      input: SupplierVerificationStatusInput,
    ): Promise<SupplierVerificationStatusResult> {
      const orderId =
        input.supplierNumberReference.trim() ||
        input.supplierOrderReference.trim();

      if (!orderId) {
        return {
          success: false,
          status: "UNKNOWN",
          errorCode: "MISSING_SUPPLIER_REFERENCE",
          errorMessage: "SMSPool order reference is required.",
        };
      }

      try {
        const body = await smsPoolRequest(
          normalizedApiKey,
          "/sms/check",
          {
            orderid: orderId,
          },
        );

        const status = extractNumber(body, ["status"]);
        const verificationCode = extractString(body, [
          "sms",
          "code",
        ]);
        const message = extractString(body, [
          "full_sms",
          "message",
        ]);

        let normalizedStatus:
          SupplierVerificationStatusResult["status"];

        if (verificationCode || status === 3) {
          normalizedStatus = "CODE_RECEIVED";
        } else {
          switch (status) {
            case 6:
              normalizedStatus = "EXPIRED";
              break;
            case 5:
              normalizedStatus = "CANCELLED";
              break;
            case 2:
              normalizedStatus = "EXPIRED";
              break;
            case 3:
              normalizedStatus = "CODE_RECEIVED";
              break;
            case 1:
            case 7:
            case 8:
            default:
              normalizedStatus = "WAITING_FOR_SMS";
              break;
          }
        }

        return {
          success: true,
          status: normalizedStatus,
          phoneNumber: null,
          verificationCode,
          message,
          rawResponse: body,
        };
      } catch (error: unknown) {
        return {
          success: false,
          status: "UNKNOWN",
          errorCode: "SUPPLIER_STATUS_REQUEST_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "SMSPool SMS check request failed.",
        };
      }
    },

    async cancelNumber(
      input: SupplierCancelNumberInput,
    ): Promise<SupplierCancelNumberResult> {
      const orderId =
        input.supplierNumberReference.trim() ||
        input.supplierOrderReference.trim();

      if (!orderId) {
        return {
          success: false,
          errorCode: "MISSING_SUPPLIER_REFERENCE",
          errorMessage: "SMSPool order reference is required.",
        };
      }

      try {
        let lastBody: unknown = null;

        for (let attempt = 1; attempt <= 4; attempt += 1) {
          const body = await smsPoolRequest(
            normalizedApiKey,
            "/sms/cancel",
            {
              orderid: orderId,
            },
          );

          lastBody = body;

          const success = extractNumber(body, ["success"]);

          if (success === 1) {
            return {
              success: true,
              rawResponse: body,
            };
          }

          const message =
            extractString(body, ["message", "type", "error"]) ??
            "SMSPool cancellation was not confirmed.";

          const retryable =
            /wait|lock|locked|try again|too soon|recently|pending/i.test(
              message,
            );

          if (!retryable || attempt === 4) {
            console.error("[SMSPool] Cancellation failed", {
              orderId,
              attempt,
              message,
              response: body,
            });

            return {
              success: false,
              rawResponse: body,
              errorCode: "SUPPLIER_CANCEL_NOT_CONFIRMED",
              errorMessage: message,
            };
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        return {
          success: false,
          rawResponse: lastBody,
          errorCode: "SUPPLIER_CANCEL_NOT_CONFIRMED",
          errorMessage: "SMSPool cancellation was not confirmed.",
        };
      } catch (error: unknown) {
        return {
          success: false,
          errorCode: "SUPPLIER_CANCEL_REQUEST_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "SMSPool cancellation request failed.",
        };
      }
    },
  };
}
