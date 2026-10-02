import type { Metadata } from "next";

const countries: Record<string, string> = {
  us: "United States",
  gb: "United Kingdom",
  ca: "Canada",
  de: "Germany",
};

const services: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  telegram: "Telegram",
  tiktok: "TikTok",
  instagram: "Instagram",
  google: "Google",
  twitter: "X / Twitter",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; service: string }>;
}): Promise<Metadata> {
  const { country, service } = await params;

  const countryCode = country.toLowerCase();
  const serviceSlug = service.toLowerCase();

  const countryName =
    countries[countryCode] ||
    country.charAt(0).toUpperCase() + country.slice(1);

  const serviceName =
    services[serviceSlug] ||
    service.charAt(0).toUpperCase() + service.slice(1);

  const title = `Cheap ${serviceName} Verification Numbers — ${countryName}`;
  const description = `Buy cheap ${serviceName} verification numbers for ${countryName} on NumberHub. Explore current marketplace options and pricing.`;

  const url = `https://numberhub.onrender.com/market/${countryCode}/${serviceSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | NumberHub`,
      description,
      url,
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

export default function ServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
