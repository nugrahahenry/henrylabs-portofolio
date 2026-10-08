import type { Metadata } from "next";
import { CredentialLibrary } from "@/components/credential-library";

export const metadata: Metadata = {
  title: "Credentials | HenryLabs",
  description: "26 original records from Henry Nugraha's learning journey, with original images and available source PDFs.",
  alternates: { canonical: "/credentials" },
  openGraph: { title: "Credentials | HenryLabs", url: "/credentials" },
  twitter: { title: "Credentials | HenryLabs" },
};
export default function CredentialsPage() { return <CredentialLibrary />; }
