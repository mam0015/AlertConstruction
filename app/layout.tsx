import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./operation-hub.css";

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
    apple: "/icons/apple-touch-icon.png",
  },
  // Lets a phone or computer install the site as an app (Add to Home Screen / Install). It is the same private site, opened without the browser bars.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Alert Tradie Pro", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
