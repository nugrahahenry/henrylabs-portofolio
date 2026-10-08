import type { Metadata } from "next";
import { ProjectLibrary } from "@/components/project-library";

export const metadata: Metadata = {
  title: "Projects | HenryLabs",
  description: "Ten independent products, university builds, and client projects by Henry Nugraha.",
  alternates: { canonical: "/projects" },
  openGraph: { title: "Projects | HenryLabs", url: "/projects" },
  twitter: { title: "Projects | HenryLabs" },
};
export default function ProjectsPage() { return <ProjectLibrary />; }
