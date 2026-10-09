import type { Metadata } from "next";
import { CredentialLibrary } from "@/components/credential-library";

export const metadata: Metadata = {
  title: "Credentials | StarGod",
  description: "26 records from Henry Nugraha's learning journey, with watermarked images and available PDF previews.",
  alternates: { canonical: "/credentials" },
  openGraph: { title: "Credentials | StarGod", url: "/credentials" },
  twitter: { title: "Credentials | StarGod" },
};
export default function CredentialsPage() { return <CredentialLibrary />; }
