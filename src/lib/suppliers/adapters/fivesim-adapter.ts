import type {
  SupplierActivateNumberInput,
  SupplierActivateNumberResult,
  SupplierAdapter,
  SupplierVerificationStatusInput,
  SupplierVerificationStatusResult,
  SupplierCancelNumberInput,
  SupplierCancelNumberResult,
} from "@/lib/suppliers/supplier-adapter";

const FIVESIM_BASE_URL = "https://5sim.net/v1";

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

async function fiveSimRequest(
  apiKey: string,
  endpoint: string,
): Promise<unknown> {
  const response = await fetch(`${FIVESIM_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

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
    const message =
      extractString(body, [
        ["message"],
        ["error"],
      ]) ?? `5SIM returned HTTP ${response.status}.`;

    throw new Error(`5SIM API ${response.status}: ${message}`);
  }

  return body;
}

function normalizeCountry(countryCode: string): string {
  const country = countryCode.trim().toUpperCase();

  const countryMap: Record<string, string> = {
    US: "usa",
    USA: "usa",
    GB: "england",
    UK: "england",
    CA: "canada",
    NG: "nigeria",
    DE: "germany",
    JP: "japan",
    IN: "india",
    ZA: "southafrica",
    ID: "indonesia",
    PH: "philippines",
  };

  return countryMap[country] ?? countryCode.trim().toLowerCase();
}

function normalizeService(serviceSlug: string): string {
  return serviceSlug.trim().toLowerCase();
}

export function createFiveSimAdapter(
  apiKey: string,
): SupplierAdapter {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("FIVESIM_API_KEY is required");
  }

  return {
    name: "5SIM",

    async activateNumber(
      input: SupplierActivateNumberInput,
    ): Promise<SupplierActivateNumberResult> {
      const country = normalizeCountry(input.countryCode);
      const service = normalizeService(input.serviceSlug);

      /*
       * supplierProductId is deliberately required by the routing layer.
       * For 5SIM it represents the operator to use.
       * "any" allows 5SIM to select an available operator.
       */
      const operator =
        input.supplierProductId.trim() || "any";

      if (!country) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "INVALID_COUNTRY",
          errorMessage: "5SIM country is required.",
        };
      }

      if (!service) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "INVALID_SERVICE",
          errorMessage: "5SIM service is required.",
        };
      }

      const endpoint =
        `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(service)}`;

      try {
        const body = await fiveSimRequest(
          normalizedApiKey,
          endpoint,
        );

        const supplierOrderReference = extractString(body, [
          ["id"],
          ["orderId"],
          ["order", "id"],
        ]);

        const phoneNumber = extractString(body, [
          ["phone"],
          ["phoneNumber"],
          ["number"],
        ]);

        const supplierNumberReference = extractString(body, [
          ["id"],
          ["numberId"],
          ["numberReference"],
        ]);

        if (!supplierOrderReference || !phoneNumber) {
          return {
            success: false,
            supplierOrderReference,
            phoneNumber,
            supplierNumberReference,
            rawResponse: body,
            errorCode: "SUPPLIER_INCOMPLETE_RESPONSE",
            errorMessage:
              "5SIM returned an incomplete activation response.",
          };
        }

        return {
          success: true,
          supplierOrderReference,
          phoneNumber,
          supplierNumberReference:
            supplierNumberReference ?? supplierOrderReference,
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
              : "5SIM activation request failed.",
        };
      }
    },

    async getVerificationStatus(
      input: SupplierVerificationStatusInput,
    ): Promise<SupplierVerificationStatusResult> {
      const verificationId =
        input.supplierNumberReference.trim() ||
        input.supplierOrderReference.trim();

      if (!verificationId) {
        return {
          success: false,
          status: "UNKNOWN",
          errorCode: "MISSING_SUPPLIER_REFERENCE",
          errorMessage: "5SIM activation reference is required.",
        };
      }

      try {
        const body = await fiveSimRequest(
          normalizedApiKey,
          `/user/check/${encodeURIComponent(verificationId)}`,
        );

        const record =
          body && typeof body === "object"
            ? (body as Record<string, unknown>)
            : {};

        const supplierStatus = extractString(record, [["status"]]);

        const sms =
          Array.isArray(record.sms)
            ? (record.sms as unknown[])
            : [];

        const latestSms = sms.length > 0 ? sms[0] : null;

        const verificationCode = extractString(latestSms, [["code"]]);
        const message = extractString(latestSms, [["text"]]);
        const phoneNumber =
          extractString(record, [["phone"]]) ??
          extractString(latestSms, [["sender"]]);

        let status: SupplierVerificationStatusResult["status"];

        if (verificationCode) {
          status = "CODE_RECEIVED";
        } else {
          switch (supplierStatus) {
            case "FINISHED":
              status = "COMPLETED";
              break;
            case "TIMEOUT":
              status = "EXPIRED";
              break;
            case "CANCELED":
              status = "CANCELLED";
              break;
            case "RECEIVED":
            case "PENDING":
            default:
              status = "WAITING_FOR_SMS";
              break;
          }
        }

        return {
          success: true,
          status,
          phoneNumber,
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
              : "5SIM SMS inbox request failed.",
        };
      }
    },

    async cancelNumber(
      input: SupplierCancelNumberInput,
    ): Promise<SupplierCancelNumberResult> {
      const verificationId =
        input.supplierNumberReference.trim() ||
        input.supplierOrderReference.trim();

      if (!verificationId) {
        return {
          success: false,
          errorCode: "MISSING_SUPPLIER_REFERENCE",
          errorMessage: "5SIM activation reference is required.",
        };
      }

      try {
        const body = await fiveSimRequest(
          normalizedApiKey,
          `/user/cancel/${encodeURIComponent(verificationId)}`,
        );

        const status = extractString(body, [["status"]]);

        if (status !== "CANCELED") {
          return {
            success: false,
            rawResponse: body,
            errorCode: "SUPPLIER_CANCEL_NOT_CONFIRMED",
            errorMessage:
              `5SIM cancellation was not confirmed. Returned status: ${status ?? "unknown"}.`,
          };
        }

        return {
          success: true,
          rawResponse: body,
        };
      } catch (error: unknown) {
        return {
          success: false,
          errorCode: "SUPPLIER_CANCEL_REQUEST_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "5SIM cancellation request failed.",
        };
      }
    },
  };
}
