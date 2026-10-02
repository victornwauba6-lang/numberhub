import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Verification Numbers Marketplace",
  description:
    "Explore virtual verification numbers and SMS verification services by country and supported service on NumberHub.",
  alternates: {
    canonical: "https://numberhub.onrender.com/market",
  },
  openGraph: {
    title: "Virtual Verification Numbers Marketplace | NumberHub",
    description:
      "Explore virtual verification numbers and SMS verification services by country and supported service.",
    url: "https://numberhub.onrender.com/market",
    siteName: "NumberHub",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary",
    title: "Virtual Verification Numbers Marketplace | NumberHub",
    description:
      "Explore virtual verification numbers and SMS verification services by country and supported service.",
  },
};

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
