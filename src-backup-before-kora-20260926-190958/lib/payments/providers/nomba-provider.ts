import type {
  PaymentProvider,
  PaymentProviderContext,
  PaymentInitializationResult,
  PaymentVerificationResult,
} from "./payment-provider";

export class NombaPaymentProvider implements PaymentProvider {
  readonly name = "Nomba";
  readonly slug = "nomba";

  async initializePayment(
    _context: PaymentProviderContext,
  ): Promise<PaymentInitializationResult> {
    throw new Error("Nomba payment initialization is not configured yet");
  }

  async verifyPayment(
    _providerPaymentId: string,
  ): Promise<PaymentVerificationResult> {
    throw new Error("Nomba payment verification is not configured yet");
  }
}
