import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/register"
          className="text-sm font-semibold text-green-600"
        >
          ← Back to registration
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          NumberHub Terms & Conditions
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Version 1.0 · Effective September 16, 2026
        </p>

        <div className="mt-8 space-y-7 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. About NumberHub
            </h2>
            <p className="mt-2">
              NumberHub is an online platform that provides access to virtual
              phone numbers and related digital verification services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Account Registration
            </h2>
            <p className="mt-2">
              You must provide accurate information when creating an account.
              You are responsible for keeping your account credentials secure
              and for activity carried out through your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. Wallet and Payments
            </h2>
            <p className="mt-2">
              Funds added to your NumberHub wallet are intended for purchases
              available through the platform. You should review transaction
              details before completing a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Acceptable Use
            </h2>
            <p className="mt-2">
              You must use NumberHub lawfully and must not use the platform
              for fraud, impersonation, abuse, harassment, unauthorized
              access, or other unlawful activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Service Availability
            </h2>
            <p className="mt-2">
              Availability of particular numbers, countries, services, and
              suppliers may change. NumberHub may temporarily suspend or
              restrict services when necessary for security, maintenance,
              supplier limitations, or compliance reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Account Suspension
            </h2>
            <p className="mt-2">
              We may restrict or suspend accounts where there is suspected
              fraud, abuse, unlawful activity, violation of these terms, or a
              security or compliance concern.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              7. Changes to These Terms
            </h2>
            <p className="mt-2">
              We may update these Terms & Conditions from time to time.
              Updated versions will be identified by a new version number and
              effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              8. Contact
            </h2>
            <p className="mt-2">
              For questions about these terms, contact NumberHub support at
              numberhubsupport@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
