import type { Metadata } from "next";
import { CredentialLibrary } from "@/components/credential-library";
import { certificates } from "@/content/credentials";

export const metadata: Metadata = {
  title: "Credentials | StarGod",
  description: `${certificates.length} records from Henry Nugraha's learning journey, with watermarked images and available PDF previews.`,
  alternates: { canonical: "/credentials" },
  openGraph: { title: "Credentials | StarGod", url: "/credentials" },
  twitter: { title: "Credentials | StarGod" },
};
export default function CredentialsPage() { return <CredentialLibrary />; }
