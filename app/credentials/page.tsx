import type { Metadata } from "next";
import { CredentialLibrary } from "@/components/credential-library";
import { certificates } from "@/content/credentials";
import { sharedOpenGraph, sharedTwitter } from "@/content/social-metadata";

export const metadata: Metadata = {
  title: "Credentials | StarGod",
  description: `${certificates.length} records from Henry Nugraha's learning journey, with watermarked images and available PDF previews.`,
  alternates: { canonical: "/credentials" },
  openGraph: { ...sharedOpenGraph, title: "Credentials | StarGod", url: "/credentials" },
  twitter: { ...sharedTwitter, title: "Credentials | StarGod" },
};
export default function CredentialsPage() { return <CredentialLibrary />; }
