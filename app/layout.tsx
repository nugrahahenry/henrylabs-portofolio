import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./library.css";
import "./maker.css";
import "./typography.css";
import { SitePreferences } from "@/components/site-preferences";
import { SiteHeader } from "@/components/site-header";
import { ReadingSky } from "@/components/reading-sky";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StarGod - Henry Nugraha's Universe",
  description: "Henry Nugraha's interactive portfolio of useful products, systems, and experiments.",
  keywords: ["Henry Nugraha", "StarGod", "HenryLabs", "portfolio", "product developer", "React", "Next.js", "AI systems"],
  authors: [{ name: "Henry Nugraha" }],
  creator: "Henry Nugraha",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    title: "StarGod - Henry Nugraha's Universe",
    description: "A living constellation of products, systems, and experiments by Henry Nugraha.",
    type: "website",
    siteName: "StarGod",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "StarGod - Henry Nugraha's Universe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StarGod - Henry Nugraha's Universe",
    description: "A living constellation of products, systems, and experiments by Henry Nugraha.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07091b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><SitePreferences><ReadingSky /><SiteHeader />{children}</SitePreferences></body>
    </html>
  );
}
