import Link from "next/link";

export default function AcceptableUsePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-green-600 hover:text-green-700"
        >
          ← Back to numberhub.onrender
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          NumberHub Acceptable Use Policy
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Version 1.0 · Effective September 23, 2026
        </p>

        <div className="mt-8 space-y-7 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. Purpose
            </h2>
            <p className="mt-2">
              This Acceptable Use Policy explains how customers may use
              numberhub.onrender and its digital connectivity services.
              Customers must use the service lawfully, responsibly, and in
              accordance with our Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Lawful Use
            </h2>
            <p className="mt-2">
              You must not use numberhub.onrender for activities that violate
              applicable laws, regulations, court orders, or the rights of
              other people or organizations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. Prohibited Activities
            </h2>
            <p className="mt-2">
              You must not use the service to facilitate fraud, scams,
              impersonation, unauthorized access, account takeover, identity
              theft, harassment, or other unlawful activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Abuse of the Service
            </h2>
            <p className="mt-2">
              You must not attempt to disrupt, damage, overload, reverse
              engineer, bypass security controls, or interfere with the
              operation of numberhub.onrender or its supporting systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Verification and Messaging Services
            </h2>
            <p className="mt-2">
              Virtual numbers and verification-related services must be used
              only for legitimate purposes. Customers are responsible for
              complying with the rules of any third-party platform or service
              where a number is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Account Security
            </h2>
            <p className="mt-2">
              Customers are responsible for protecting their login credentials
              and must not share access to an account in a way that enables
              unauthorized use or abuse of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              7. Suspicious or Abusive Activity
            </h2>
            <p className="mt-2">
              We may review activity that appears suspicious, fraudulent,
              abusive, or inconsistent with our policies. Where appropriate,
              we may restrict or suspend access while an issue is reviewed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              8. Third-Party Platforms
            </h2>
            <p className="mt-2">
              numberhub.onrender does not control the policies, availability,
              or decisions of third-party platforms. Customers must comply
              with the applicable terms and rules of those platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              9. Reporting an Issue
            </h2>
            <p className="mt-2">
              If you believe the service has been misused or you identify
              suspicious activity involving your account, contact our support
              team at{" "}
              <a
                href="mailto:numberhubsupport@gmail.com"
                className="font-medium text-green-600 hover:text-green-700"
              >
                numberhubsupport@gmail.com
              </a>{" "}
              or Telegram{" "}
              <span className="font-medium">@numberhubsuppor</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              10. Policy Updates
            </h2>
            <p className="mt-2">
              We may update this policy when our services, security practices,
              legal requirements, or operating procedures change. The latest
              version will be published on numberhub.onrender.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
