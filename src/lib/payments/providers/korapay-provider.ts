import type {
  PaymentProvider,
  PaymentProviderContext,
  PaymentInitializationResult,
  PaymentVerificationResult,
} from "./payment-provider";

const KORA_API_URL = "https://api.korapay.com";

type KoraInitializeResponse = {
  status?: boolean;
  message?: string;
  data?: {
    reference?: string;
    checkout_url?: string;
  };
};

type KoraQueryResponse = {
  status?: boolean;
  message?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: string | number;
    amount_paid?: string | number;
    currency?: string;
  };
};

function getSecretKey(): string {
  const key = process.env.KORAPAY_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("KORAPAY_SECRET_KEY is not configured");
  }

  return key;
}

export class KorapayPaymentProvider implements PaymentProvider {
  readonly name = "Korapay";
  readonly slug = "korapay";

  async initializePayment(
    context: PaymentProviderContext,
  ): Promise<PaymentInitializationResult> {
    const amountNgn = Number(context.amountMinor) / 100;

    if (
      (typeof context.amountMinor !== "bigint" &&
        !Number.isSafeInteger(context.amountMinor)) ||
      amountNgn <= 0
    ) {
      throw new Error("Invalid payment amount");
    }

    const reference = `NH-${context.paymentId}`;

    const response = await fetch(
      `${KORA_API_URL}/merchant/api/v1/charges/initialize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountNgn,
          currency: context.currency,
          reference,
          customer: {
            name: context.customerName || context.customerEmail,
            email: context.customerEmail,
          },
          redirect_url:
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/wallet`,
          notification_url:
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/korapay/webhook`,
          narration: "NumberHub wallet funding",
          metadata: {
            paymentId: context.paymentId,
          },
        }),
      },
    );

    const result =
      (await response.json()) as KoraInitializeResponse;

    if (!response.ok || !result.status || !result.data?.reference) {
      throw new Error(
        result.message || "Korapay payment initialization failed",
      );
    }

    return {
      providerPaymentId: result.data.reference,
      checkoutUrl: result.data.checkout_url || null,
    };
  }

  async verifyPayment(
    providerPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    const response = await fetch(
      `${KORA_API_URL}/merchant/api/v1/charges/${encodeURIComponent(providerPaymentId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result =
      (await response.json()) as KoraQueryResponse;

    const data = result.data;

    return {
      success:
        response.ok &&
        result.status === true &&
        data?.status?.toLowerCase() === "success",
      providerPaymentId,
      providerReference: data?.reference || providerPaymentId,
      amountMinor:
        data?.amount_paid !== undefined
          ? BigInt(Math.round(Number(data.amount_paid) * 100))
          : data?.amount !== undefined
            ? BigInt(Math.round(Number(data.amount) * 100))
            : null,
      currency: data?.currency || null,
      rawStatus: data?.status || null,
    };
  }
}
