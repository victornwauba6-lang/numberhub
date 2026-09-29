import Link from "next/link";

export default function RefundsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-green-600"
        >
          ← Back to numberhub.onrender
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          NumberHub Refund & Cancellation Policy
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Version 1.0 · Effective September 23, 2026
        </p>

        <div className="mt-8 space-y-7 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. Cancelling a Number
            </h2>
            <p className="mt-2">
              Customers may cancel an active verification-number order when
              the verification service has not yet delivered an OTP.
            </p>
            <p className="mt-2">
              Where an eligible order is cancelled before an OTP is received,
              the applicable purchase amount will be returned to the
              customer's numberhub.onrender wallet, subject to the order being
              eligible for cancellation and refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Orders Where No OTP Is Received
            </h2>
            <p className="mt-2">
              If a customer does not receive an OTP and the order remains
              eligible for cancellation or refund, the customer may cancel the
              order.
            </p>
            <p className="mt-2">
              Eligible cancelled orders are refunded to the customer's
              numberhub.onrender wallet in accordance with the applicable order
              status and refund rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. Orders Where an OTP Has Been Received
            </h2>
            <p className="mt-2">
              Once an OTP or verification code has been successfully received,
              the verification service is considered fulfilled.
            </p>
            <p className="mt-2">
              An order that has already delivered an OTP is therefore not
              automatically refundable. Any refund request relating to an order
              where an OTP has been received may be reviewed by NUMBERBRIDGE
              TECHNOLOGIES based on the circumstances of the transaction.
            </p>
            <p className="mt-2">
              Receiving an OTP does not guarantee a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Failed or Unfulfilled Orders
            </h2>
            <p className="mt-2">
              If an order cannot be fulfilled because the required number or
              verification service cannot be successfully provided, the order
              may be marked as failed and, where the order is eligible, the
              applicable amount may be automatically returned to the customer's
              wallet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Duplicate or Technical Transactions
            </h2>
            <p className="mt-2">
              If a customer is charged more than once for the same transaction
              due to a verified technical or processing error, NUMBERBRIDGE
              TECHNOLOGIES will investigate the transaction records and correct
              any confirmed duplicate charge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Wallet Refunds
            </h2>
            <p className="mt-2">
              Where a refund is approved or automatically processed, the refund
              is credited to the customer's numberhub.onrender wallet rather
              than being treated as a cash withdrawal.
            </p>
            <p className="mt-2">
              Customers may use their available wallet balance for eligible
              purchases on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              7. Refund Eligibility
            </h2>
            <p className="mt-2">
              Refund eligibility depends on the order status, whether an OTP
              was received, the applicable product rules, and whether the
              service was successfully fulfilled.
            </p>
            <p className="mt-2">
              A refund is not guaranteed simply because a customer is
              dissatisfied with a successfully delivered verification service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              8. Fraud, Abuse and Misuse
            </h2>
            <p className="mt-2">
              NUMBERBRIDGE TECHNOLOGIES may investigate transactions where
              there are reasonable indications of fraud, abuse, manipulation
              of the refund process, repeated misuse, or other prohibited
              activity.
            </p>
            <p className="mt-2">
              Transactions identified as potentially fraudulent or abusive may
              be restricted or reviewed before a refund is processed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              9. Refund Requests and Support
            </h2>
            <p className="mt-2">
              For assistance with an order or refund, customers should contact
              NumberHub support.
            </p>
            <p className="mt-2">
              Email: numberhubsupport@gmail.com
            </p>
            <p className="mt-2">
              Telegram: @numberhubsuppor
            </p>
            <p className="mt-2">
              Customers should provide their account email, order ID, and a
              brief description of the issue so that the transaction can be
              properly reviewed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              10. Service Availability
            </h2>
            <p className="mt-2">
              Virtual-number availability, supported countries, services,
              prices, and delivery times may vary depending on available
              inventory and supported suppliers.
            </p>
            <p className="mt-2">
              NUMBERBRIDGE TECHNOLOGIES does not guarantee that every number,
              country, or verification service will be available at all times.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              11. Policy Updates
            </h2>
            <p className="mt-2">
              This Refund & Cancellation Policy may be updated when our
              services, systems, or operational requirements change. The
              current version published on numberhub.onrender will apply to
              transactions made after its effective date.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
