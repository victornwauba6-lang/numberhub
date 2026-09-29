import type {
  SupplierActivateNumberInput,
  SupplierActivateNumberResult,
  SupplierAdapter,
  SupplierVerificationStatusInput,
  SupplierVerificationStatusResult,
  SupplierCancelNumberInput,
  SupplierCancelNumberResult,
} from "@/lib/suppliers/supplier-adapter";

const TEXTVERIFIED_BASE_URL = "https://backend.textverified.com";

type TextVerifiedAdapterConfig = {
  email: string;
  apiKey: string;
};

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

async function getTextVerifiedToken(config: TextVerifiedAdapterConfig) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const response = await fetch(
    `${TEXTVERIFIED_BASE_URL}/api/pub/v2/auth`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-API-USERNAME": config.email,
        "X-API-KEY": config.apiKey,
      },
    },
  );

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `TextVerified auth ${response.status}: ${
        data.message || data.error || text
      }`,
    );
  }

  const token =
    data.token ||
    data.accessToken ||
    data.access_token;

  if (!token) {
    throw new Error(
      "TextVerified authentication succeeded but no token was returned",
    );
  }

  const expiresInSeconds = Number(
    data.expiresIn ||
      data.expires_in ||
      300,
  );

  cachedToken = String(token);

  cachedTokenExpiresAt =
    Date.now() +
    Math.max(30, expiresInSeconds - 30) * 1000;

  return cachedToken;
}

async function textVerifiedRequest(
  config: TextVerifiedAdapterConfig,
  endpoint: string,
  options: RequestInit = {},
) {
  const token = await getTextVerifiedToken(config);

  const response = await fetch(
    TEXTVERIFIED_BASE_URL + endpoint,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `TextVerified API ${response.status}: ${
        data.message || data.error || text
      }`,
    );
  }

  const location = response.headers.get("location");

  if (location) {
    data.location = location;
  }

  return data;
}

function extractPhoneNumber(data: any): string | null {
  const value =
    data?.number ||
    data?.phoneNumber ||
    data?.phone ||
    data?.data?.number ||
    data?.data?.phoneNumber ||
    data?.data?.phone ||
    "";

  const phone = String(value).trim();

  return phone || null;
}

function extractSupplierId(data: any): string | null {
  const value =
    data?.id ||
    data?.verificationId ||
    data?.reservationId ||
    data?.data?.id ||
    data?.data?.verificationId ||
    data?.data?.reservationId ||
    "";

  const id = String(value).trim();

  return id || null;
}

function getDetailsPath(data: any): string | null {
  const href =
    data?.href ||
    data?.location ||
    data?.details?.href ||
    data?.verification?.href ||
    data?.data?.href ||
    "";

  if (!href) {
    return null;
  }

  try {
    const url = new URL(String(href));

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function cancelTextVerifiedVerification(
  config: TextVerifiedAdapterConfig,
  verificationId: string,
) {
  return textVerifiedRequest(
    config,
    `/api/pub/v2/verifications/${encodeURIComponent(
      verificationId,
    )}/cancel`,
    {
      method: "POST",
    },
  );
}


function extractVerificationState(data: any): string | null {
  const value =
    data?.state ||
    data?.status ||
    data?.data?.state ||
    data?.data?.status ||
    "";

  const state = String(value).trim();
  return state || null;
}

function extractSmsLink(data: any): string | null {
  const href =
    data?.sms?.href ||
    data?.data?.sms?.href ||
    "";

  if (!href) {
    return null;
  }

  try {
    const url = new URL(String(href));
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function extractVerificationCode(data: any): string | null {
  const messages = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data?.items)
          ? data.data.items
          : [];

  for (const message of messages) {
    const parsedCode = String(message?.parsedCode || "").trim();
    if (parsedCode) {
      return parsedCode;
    }
  }

  const directCode = String(
    data?.parsedCode ||
      data?.code ||
      data?.data?.parsedCode ||
      data?.data?.code ||
      "",
  ).trim();

  return directCode || null;
}

function mapTextVerifiedState(
  state: string | null,
  verificationCode: string | null,
): SupplierVerificationStatusResult["status"] {
  switch (state) {
    case "verificationPending":
      return verificationCode ? "CODE_RECEIVED" : "WAITING_FOR_SMS";

    case "verificationCompleted":
      return "COMPLETED";

    case "verificationCanceled":
      return "CANCELLED";

    case "verificationTimedOut":
    case "nonrenewableExpired":
    case "renewableExpired":
      return "EXPIRED";

    case "verificationRefunded":
    case "renewableRefunded":
    case "nonrenewableRefunded":
      return "CANCELLED";

    default:
      return verificationCode ? "CODE_RECEIVED" : "UNKNOWN";
  }
}

export function createTextVerifiedAdapter(
  config: TextVerifiedAdapterConfig,
): SupplierAdapter {
  return {
    name: "TextVerified",

    async activateNumber(
      input: SupplierActivateNumberInput,
    ): Promise<SupplierActivateNumberResult> {
      const serviceName = String(
        input.serviceSlug || "",
      )
        .trim()
        .toLowerCase();

      if (!serviceName) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "INVALID_SERVICE",
          errorMessage: "TextVerified service is required",
        };
      }

      try {
        const created = await textVerifiedRequest(
          config,
          "/api/pub/v2/verifications",
          {
            method: "POST",
            headers: {
              "Idempotency-Key":
                `NUMBERHUB-${input.orderId}`,
            },
            body: JSON.stringify({
              capability: "sms",
              serviceName,
            }),
          },
        );

        const detailsPath = getDetailsPath(created);

        if (!detailsPath) {
          return {
            success: false,
            supplierOrderReference: null,
            phoneNumber: null,
            supplierNumberReference: null,
            rawResponse: created,
            errorCode: "MISSING_DETAILS_LINK",
            errorMessage:
              "TextVerified created the verification but did not return a details link",
          };
        }

        const details = await textVerifiedRequest(
          config,
          detailsPath,
          {
            method: "GET",
          },
        );

        const phoneNumber =
          extractPhoneNumber(details) ||
          extractPhoneNumber(created);

        const supplierId =
          extractSupplierId(details) ||
          extractSupplierId(created);

        if (!phoneNumber || !supplierId) {
          if (supplierId) {
            try {
              await cancelTextVerifiedVerification(
                config,
                supplierId,
              );
            } catch (cancelError) {
              console.error(
                "TextVerified cancellation after incomplete purchase failed:",
                cancelError,
              );
            }
          }

          return {
            success: false,
            supplierOrderReference: supplierId,
            phoneNumber,
            supplierNumberReference: null,
            rawResponse: {
              created,
              details,
            },
            errorCode: "INCOMPLETE_VERIFICATION",
            errorMessage:
              "TextVerified did not return both a phone number and verification ID",
          };
        }

        return {
          success: true,
          supplierOrderReference: supplierId,
          phoneNumber,
          supplierNumberReference: supplierId,
          rawResponse: {
            created,
            details,
            expiresAt:
              details?.endsAt ||
              details?.expiresAt ||
              created?.endsAt ||
              created?.expiresAt ||
              null,
          },
        };
      } catch (error) {
        return {
          success: false,
          supplierOrderReference: null,
          phoneNumber: null,
          supplierNumberReference: null,
          errorCode: "TEXTVERIFIED_API_ERROR",
          errorMessage:
            error instanceof Error
              ? error.message
              : "TextVerified API request failed",
        };
      }
    },

    async getVerificationStatus(
      input: SupplierVerificationStatusInput,
    ): Promise<SupplierVerificationStatusResult> {
      try {
        const verificationId =
          String(
            input.supplierNumberReference ||
              input.supplierOrderReference ||
              "",
          ).trim();

        if (!verificationId) {
          return {
            success: false,
            status: "UNKNOWN",
            errorCode: "MISSING_VERIFICATION_ID",
            errorMessage:
              "TextVerified verification ID is missing",
          };
        }

        const details = await textVerifiedRequest(
          config,
          `/api/pub/v2/verifications/${encodeURIComponent(
            verificationId,
          )}`,
          {
            method: "GET",
          },
        );

        const phoneNumber =
          extractPhoneNumber(details) ||
          null;

        const state = extractVerificationState(details);

        let smsData: any = null;
        let verificationCode: string | null = null;

        const smsPath = extractSmsLink(details);

        try {
          if (smsPath) {
            smsData = await textVerifiedRequest(
              config,
              smsPath,
              {
                method: "GET",
              },
            );
          } else {
            const query = new URLSearchParams({
              reservationId: verificationId,
            });

            smsData = await textVerifiedRequest(
              config,
              `/api/pub/v2/sms?${query.toString()}`,
              {
                method: "GET",
              },
            );
          }

          verificationCode = extractVerificationCode(smsData);
        } catch (smsError) {
          console.error(
            "TextVerified SMS lookup failed:",
            smsError,
          );
        }

        const status = mapTextVerifiedState(
          state,
          verificationCode,
        );

        return {
          success: true,
          status,
          phoneNumber,
          verificationCode,
          message: null,
          rawResponse: {
            details,
            sms: smsData,
          },
        };
      } catch (error) {
        return {
          success: false,
          status: "UNKNOWN",
          errorCode: "TEXTVERIFIED_STATUS_ERROR",
          errorMessage:
            error instanceof Error
              ? error.message
              : "TextVerified verification status request failed",
        };
      }
    },

    async cancelNumber(
      input: SupplierCancelNumberInput,
    ): Promise<SupplierCancelNumberResult> {
      try {
        const verificationId =
          String(
            input.supplierNumberReference ||
              input.supplierOrderReference ||
              "",
          ).trim();

        if (!verificationId) {
          return {
            success: false,
            errorCode: "MISSING_VERIFICATION_ID",
            errorMessage:
              "TextVerified verification ID is missing",
          };
        }

        const response =
          await cancelTextVerifiedVerification(
            config,
            verificationId,
          );

        return {
          success: true,
          rawResponse: response,
        };
      } catch (error) {
        return {
          success: false,
          errorCode: "TEXTVERIFIED_CANCEL_ERROR",
          errorMessage:
            error instanceof Error
              ? error.message
              : "TextVerified cancellation request failed",
        };
      }
    },
  };
}
