import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why SMS Verification Fails and What to Do",
  description:
    "Learn why SMS verification can fail, common causes of missing verification codes, and practical steps to improve your chances of receiving an SMS code.",
  alternates: {
    canonical:
      "https://numberhub.onrender.com/guides/why-sms-verification-fails",
  },
};

export default function WhySmsVerificationFailsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <article>
        <p className="mb-3 text-sm font-medium text-green-600">
          NumberHub Guide
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Why SMS Verification Fails and What to Do
        </h1>

        <p className="mt-4 text-base leading-7 text-muted-foreground">
          SMS verification is commonly used to confirm that a phone number can
          receive messages. Sometimes a verification code does not arrive or
          the number is rejected. Understanding the common causes can help you
          troubleshoot the problem.
        </p>

        <section className="mt-10 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">
              1. The number is not supported
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Some services only accept numbers from certain countries,
              carriers, or number types. Check the service's requirements
              before requesting a verification code.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              2. The SMS is delayed
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Verification messages can sometimes take several minutes to
              arrive because of carrier or service-side delays. Avoid
              repeatedly requesting codes immediately, as some services may
              temporarily limit additional requests.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              3. The service rejected the number
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              A website or app may reject a number because it has restrictions
              on certain number types or has previously detected unusual
              activity associated with the number.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              4. The verification request expired
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Some verification requests are only valid for a limited period.
              If the request expires, starting a new legitimate verification
              attempt may be necessary.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              What should you do if you do not receive the code?
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              First, confirm that the selected country and service are correct.
              Wait briefly for possible delivery delays, then follow the
              service's official verification instructions. If you are using a
              NumberHub verification number and the expected SMS does not
              arrive, follow the applicable cancellation or refund terms shown
              for your purchase.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              Choose a number that matches your needs
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              NumberHub provides virtual verification numbers by country and
              supported service. You can browse the marketplace and review the
              available options before making a purchase.
            </p>

            <a
              href="/market"
              className="mt-5 inline-block rounded-lg bg-green-600 px-5 py-3 font-medium text-white"
            >
              Browse Verification Numbers
            </a>
          </div>
        </section>
      </article>
    </main>
  );
}
