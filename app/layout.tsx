import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HenryLabs — Useful Worlds",
  description: "Henry Nugraha's interactive portfolio of useful products, systems, and experiments.",
  openGraph: {
    title: "HenryLabs — Useful Worlds",
    description: "A living constellation of products, systems, and experiments by Henry Nugraha.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
