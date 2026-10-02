import type { Metadata } from "next";
import PostHogProvider from "@/components/PostHogProvider";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://numberhub.onrender.com"),
  title: {
    default: "Virtual Verification Numbers & SMS | NumberHub",
    template: "%s | NumberHub",
  },
  description:
    "Buy virtual verification numbers and SMS verification services by country and supported service. NumberHub serves individuals, businesses and resellers.",
  keywords: [
    "virtual verification numbers",
    "SMS verification numbers",
    "verification numbers",
    "virtual phone numbers",
    "SMS verification",
    "one-time verification numbers",
    "Nigeria",
    "resellers",
  ],
  alternates: {
    canonical: "https://numberhub.onrender.com/",
  },
  openGraph: {
    title: "Virtual Verification Numbers & SMS | NumberHub",
    description:
      "Find virtual verification numbers and SMS verification services by country and supported service.",
    url: "https://numberhub.onrender.com/",
    siteName: "NumberHub",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary",
    title: "Virtual Verification Numbers & SMS | NumberHub",
    description:
      "Find virtual verification numbers and SMS verification services by country and supported service.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <PostHogProvider>
          <body className="min-h-full flex flex-col">{children}</body>
        </PostHogProvider>
    </html>
  );
}
