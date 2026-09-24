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
  title: "NumberHub — Global connectivity marketplace",
  description: "NumberHub — Global connectivity marketplace",
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
