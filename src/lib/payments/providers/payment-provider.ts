export type PaymentProviderContext = {
  paymentId: string;
  userId: string;
  amountMinor: bigint;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
};

export type PaymentInitializationResult = {
  providerPaymentId: string;
  checkoutUrl?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  expiresAt?: Date | null;
};

export type PaymentVerificationResult = {
  success: boolean;
  providerPaymentId: string;
  providerReference?: string | null;
  amountMinor?: bigint | null;
  currency?: string | null;
  rawStatus?: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  readonly slug: string;

  initializePayment(
    context: PaymentProviderContext,
  ): Promise<PaymentInitializationResult>;

  verifyPayment(
    providerPaymentId: string,
  ): Promise<PaymentVerificationResult>;
}
