import type { Metadata } from "next";
import { ProjectLibrary } from "@/components/project-library";
import { sharedOpenGraph, sharedTwitter } from "@/content/social-metadata";

export const metadata: Metadata = {
  title: "Projects | StarGod",
  description: "Ten independent products, university builds, and client projects by Henry Nugraha.",
  alternates: { canonical: "/projects" },
  openGraph: { ...sharedOpenGraph, title: "Projects | StarGod", url: "/projects" },
  twitter: { ...sharedTwitter, title: "Projects | StarGod" },
};
export default function ProjectsPage() { return <ProjectLibrary />; }
