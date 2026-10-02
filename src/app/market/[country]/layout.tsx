import type { Metadata } from "next";

const countries: Record<string, string> = {
  us: "United States",
  gb: "United Kingdom",
  ca: "Canada",
  de: "Germany",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const code = country.toLowerCase();
  const countryName =
    countries[code] || country.charAt(0).toUpperCase() + country.slice(1);

  const title = `${countryName} Virtual Verification Numbers`;
  const description = `Explore virtual verification numbers and SMS verification services for ${countryName} on NumberHub.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://numberhub.onrender.com/market/${code}`,
    },
    openGraph: {
      title: `${title} | NumberHub`,
      description,
      url: `https://numberhub.onrender.com/market/${code}`,
      siteName: "NumberHub",
      type: "website",
      locale: "en_NG",
    },
    twitter: {
      card: "summary",
      title: `${title} | NumberHub`,
      description,
    },
  };
}

export default function CountryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
