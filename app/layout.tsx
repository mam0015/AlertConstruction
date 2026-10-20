import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./operation-hub.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Alert Tradie Pro | Renovations, Extensions & Engineering in Victoria", template: "%s | Alert Tradie Pro" },
  description: "Request kitchen and bathroom renovations, extensions, new homes, building inspections and engineering services in Victoria, and follow your project online.",
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Alert Tradie Pro",
    title: "Alert Tradie Pro | Renovations, Extensions & Engineering in Victoria",
    description: "Request building and engineering services in Victoria and follow your project online.",
    images: [{ url: "/images/hero-construction.webp" }],
  },
  twitter: { card: "summary_large_image" },
  // Marker the hosting preview and tests/rendered-html.test.mjs look for; harmless to visitors.
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
