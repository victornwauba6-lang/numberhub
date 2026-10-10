import type {
  SupplierAdapter,
  SupplierActivateNumberInput,
  SupplierActivateNumberResult,
  SupplierVerificationStatusInput,
  SupplierVerificationStatusResult,
  SupplierCancelNumberInput,
  SupplierCancelNumberResult,
  SupplierCompleteActivationResult,
} from "@/lib/suppliers/supplier-adapter";

const BASE_URL = "https://smsbulk.net/api/v1";

type Activation = {
  id?: string;
  phoneNumber?: string;
  status?: string;
  smsCode?: string | null;
  message?: string;
  cancellable?: boolean;
  cancellableAt?: string | null;
  [key: string]: unknown;
};

function errorText(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return String(d.message ?? d.error ?? "SMSBulk request failed");
  }
  return "SMSBulk request failed";
}

export function createSmsBulkAdapter(apiKey: string): SupplierAdapter {
  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<{ ok: boolean; status: number; data: Activation }> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    let data: Activation = {};
    try {
      data = JSON.parse(text) as Activation;
    } catch {
      data = { message: text.slice(0, 300) };
    }
    return { ok: response.ok, status: response.status, data };
  }

  function activationId(input: {
    supplierOrderReference: string;
    supplierNumberReference: string;
  }): string {
    return input.supplierOrderReference || input.supplierNumberReference;
  }

  return {
    name: "SMSBulk",

    async activateNumber(
      input: SupplierActivateNumberInput,
    ): Promise<SupplierActivateNumberResult> {
      const serviceCode = input.supplierProductId.trim();
      const countryIso = input.countryCode.trim().toUpperCase();

      if (!/^[a-z0-9]{1,8}$/i.test(serviceCode) ||
          !/^[A-Z]{2}$/.test(countryIso)) {
        return {
          success: false,
          supplierOrderReference: null,
          supplierNumberReference: null,
          phoneNumber: null,
          errorCode: "INVALID_PRODUCT",
          errorMessage: "SMSBulk service code or country code is invalid.",
        };
      }

      // Never retry a purchase automatically: an ambiguous timeout could
      // otherwise buy and charge for a second activation.
      try {
        const result = await request("/activations", {
          method: "POST",
          body: JSON.stringify({ serviceCode, countryIso }),
        });

        if (!result.ok || !result.data.id || !result.data.phoneNumber) {
          return {
            success: false,
            supplierOrderReference: null,
            supplierNumberReference: null,
            phoneNumber: null,
            rawResponse: result.data,
            errorCode: String(result.status),
            errorMessage: errorText(result.data),
          };
        }

        return {
          success: true,
          supplierOrderReference: result.data.id,
          supplierNumberReference: result.data.id,
          phoneNumber: result.data.phoneNumber,
          rawResponse: result.data,
        };
      } catch {
        return {
          success: false,
          supplierOrderReference: null,
          supplierNumberReference: null,
          phoneNumber: null,
          errorCode: "REQUEST_UNCERTAIN",
          errorMessage:
            "SMSBulk purchase response was unclear. Check supplier activations before attempting another purchase.",
        };
      }
    },

    async getVerificationStatus(
      input: SupplierVerificationStatusInput,
    ): Promise<SupplierVerificationStatusResult> {
      try {
        const id = encodeURIComponent(activationId(input));
        const result = await request(`/activations/${id}`);

        if (!result.ok) {
          return {
            success: false,
            status: "UNKNOWN",
            errorCode: String(result.status),
            errorMessage: errorText(result.data),
            rawResponse: result.data,
          };
        }

        const a = result.data;
        const state = String(a.status ?? "").toUpperCase();
        let status: SupplierVerificationStatusResult["status"] = "UNKNOWN";

        if (state === "WAITING" || state === "PENDING") {
          status = "WAITING_FOR_SMS";
        } else if (state === "RECEIVED") {
          status = "CODE_RECEIVED";
        } else if (state === "COMPLETED") {
          status = "COMPLETED";
        } else if (state === "EXPIRED") {
          status = "EXPIRED";
        } else if (state === "CANCELLED" || state === "REFUNDED") {
          status = "CANCELLED";
        }

        return {
          success: true,
          status,
          phoneNumber: typeof a.phoneNumber === "string" ? a.phoneNumber : null,
          verificationCode: typeof a.smsCode === "string" ? a.smsCode : null,
          message: typeof a.message === "string" ? a.message : null,
          rawResponse: a,
        };
      } catch {
        return {
          success: false,
          status: "UNKNOWN",
          errorCode: "REQUEST_FAILED",
          errorMessage: "Could not retrieve SMSBulk activation status.",
        };
      }
    },

    async completeActivation(
      input: SupplierVerificationStatusInput,
    ): Promise<SupplierCompleteActivationResult> {
      try {
        const id = encodeURIComponent(activationId(input));
        const result = await request(`/activations/${id}/complete`, {
          method: "POST",
        });

        return {
          success: result.ok,
          rawResponse: result.data,
          ...(result.ok
            ? {}
            : {
                errorCode: String(result.status),
                errorMessage: errorText(result.data),
              }),
        };
      } catch {
        return {
          success: false,
          errorCode: "REQUEST_FAILED",
          errorMessage: "Could not complete the SMSBulk activation.",
        };
      }
    },

    async cancelNumber(
      input: SupplierCancelNumberInput,
    ): Promise<SupplierCancelNumberResult> {
      try {
        const id = encodeURIComponent(activationId(input));
        const current = await request(`/activations/${id}`);

        if (!current.ok) {
          return {
            success: false,
            rawResponse: current.data,
            errorCode: String(current.status),
            errorMessage: errorText(current.data),
          };
        }

        // Respect the supplier's explicit cancellation eligibility.
        // A null cancellableAt means final; a future timestamp means cooldown.
        const cancellableAt = current.data.cancellableAt;
        let canCancel = current.data.cancellable === true;

        if (current.data.cancellable === false || cancellableAt === null) {
          canCancel = false;
        } else if (typeof cancellableAt === "string") {
          const timestamp = Date.parse(cancellableAt);
          if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
            canCancel = false;
          } else {
            canCancel = true;
          }
        }

        if (!canCancel) {
          return {
            success: false,
            rawResponse: current.data,
            errorCode:
              typeof cancellableAt === "string" &&
              Number.isFinite(Date.parse(cancellableAt)) &&
              Date.parse(cancellableAt) > Date.now()
                ? "CANCELLATION_COOLDOWN"
                : "NOT_CANCELLABLE",
            errorMessage:
              "SMSBulk has not marked this activation as eligible for cancellation yet.",
          };
        }

        const result = await request(`/activations/${id}`, {
          method: "DELETE",
        });

        return {
          success: result.ok,
          rawResponse: result.data,
          ...(result.ok ? {} : {
            errorCode: String(result.status),
            errorMessage: errorText(result.data),
          }),
        };
      } catch {
        return {
          success: false,
          errorCode: "REQUEST_FAILED",
          errorMessage: "Could not cancel the SMSBulk activation.",
        };
      }
    },
  };
}
