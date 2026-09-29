export type SupplierActivateNumberInput = {
  orderId: string;
  productOptionId: string;
  countryCode: string;
  serviceSlug: string;
  supplierProductId: string;
};

export type SupplierActivateNumberResult = {
  success: boolean;
  supplierOrderReference: string | null;
  phoneNumber: string | null;
  supplierNumberReference: string | null;
  rawResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

export type SupplierVerificationStatusInput = {
  orderId: string;
  supplierOrderReference: string;
  supplierNumberReference: string;
};

export type SupplierVerificationStatusResult = {
  success: boolean;
  status:
    | "WAITING_FOR_SMS"
    | "CODE_RECEIVED"
    | "COMPLETED"
    | "EXPIRED"
    | "CANCELLED"
    | "UNKNOWN";
  phoneNumber?: string | null;
  verificationCode?: string | null;
  message?: string | null;
  rawResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

export type SupplierCancelNumberInput = {
  orderId: string;
  supplierOrderReference: string;
  supplierNumberReference: string;
};

export type SupplierCancelNumberResult = {
  success: boolean;
  rawResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

export type SupplierAdapter = {
  name: string;
  activateNumber(
    input: SupplierActivateNumberInput,
  ): Promise<SupplierActivateNumberResult>;

  getVerificationStatus?(
    input: SupplierVerificationStatusInput,
  ): Promise<SupplierVerificationStatusResult>;

  cancelNumber?(
    input: SupplierCancelNumberInput,
  ): Promise<SupplierCancelNumberResult>;
};

export function createUnavailableSupplierAdapter(
  supplierName: string,
): SupplierAdapter {
  return {
    name: supplierName,

    async activateNumber() {
      return {
        success: false,
        supplierOrderReference: null,
        phoneNumber: null,
        supplierNumberReference: null,
        errorCode: "SUPPLIER_NOT_CONFIGURED",
        errorMessage: `Supplier adapter "${supplierName}" is not configured.`,
      };
    },
  };
}
