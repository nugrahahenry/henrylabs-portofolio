import type { Metadata } from "next";
import { ProjectLibrary } from "@/components/project-library";

export const metadata: Metadata = {
  title: "Projects | StarGod",
  description: "Ten independent products, university builds, and client projects by Henry Nugraha.",
  alternates: { canonical: "/projects" },
  openGraph: { title: "Projects | StarGod", url: "/projects" },
  twitter: { title: "Projects | StarGod" },
};
export default function ProjectsPage() { return <ProjectLibrary />; }
