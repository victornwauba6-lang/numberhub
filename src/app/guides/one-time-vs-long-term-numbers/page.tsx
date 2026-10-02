import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "One-Time vs. Long-Term Numbers for SMS Codes",
  description:
    "Learn the difference between one-time and long-term virtual numbers for SMS verification, including when each option may be suitable.",
  alternates: {
    canonical:
      "https://numberhub.onrender.com/guides/one-time-vs-long-term-numbers",
  },
};

export default function OneTimeVsLongTermNumbersPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <article>
        <p className="mb-3 text-sm font-medium text-green-600">
          NumberHub Guide
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          One-Time vs. Long-Term Numbers for SMS Codes
        </h1>

        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Virtual numbers can be used for different verification needs. Two
          common options are one-time numbers and longer-term numbers. Knowing
          the difference can help you choose an option that matches your
          legitimate use case.
        </p>

        <section className="mt-10 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">
              What is a one-time verification number?
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              A one-time verification number is intended for a single
              verification session. It is useful when a service only requires
              one SMS code and you do not expect to need the same number again.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              What is a long-term number?
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              A longer-term virtual number is designed for situations where
              continued access to the same number may be useful. Availability,
              duration, and supported services depend on the specific number
              and provider.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              One-time numbers: when they may fit
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              A one-time number may be appropriate when you need to complete a
              single legitimate verification and do not need future SMS
              messages from the service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              Long-term numbers: when they may fit
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              A longer-term number may be more suitable when a service requires
              repeated access to the same number or when you need to receive
              additional messages over a longer period.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              Important things to check
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Before purchasing, check the country, supported service, number
              duration, price, and applicable terms. Different services may
              also have their own rules about virtual or previously used
              numbers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              Which option should you choose?
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              The right option depends on how long you need access to the
              number. For a single legitimate verification, a one-time option
              may be sufficient. If continued access is required, consider a
              longer-term option where available.
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
