import type { Metadata } from "next";
import { CredentialLibrary } from "@/components/credential-library";

export const metadata: Metadata = {
  title: "Credentials | StarGod",
  description: "26 original records from Henry Nugraha's learning journey, with original images and available source PDFs.",
  alternates: { canonical: "/credentials" },
  openGraph: { title: "Credentials | StarGod", url: "/credentials" },
  twitter: { title: "Credentials | StarGod" },
};
export default function CredentialsPage() { return <CredentialLibrary />; }
