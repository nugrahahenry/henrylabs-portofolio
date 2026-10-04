import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "HenryLabs — Useful Worlds",
  description: "Henry Nugraha's interactive portfolio of useful products, systems, and experiments.",
  keywords: ["Henry Nugraha", "HenryLabs", "portfolio", "product developer", "React", "Next.js", "AI systems"],
  authors: [{ name: "Henry Nugraha" }],
  creator: "Henry Nugraha",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    title: "HenryLabs — Useful Worlds",
    description: "A living constellation of products, systems, and experiments by Henry Nugraha.",
    type: "website",
    siteName: "HenryLabs",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HenryLabs - Useful Worlds" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HenryLabs — Useful Worlds",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
