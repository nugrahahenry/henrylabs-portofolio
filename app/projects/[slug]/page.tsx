import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projectCatalog, findProject } from "@/content/catalog";
import { ProjectDetail } from "@/components/project-library";
import { sharedOpenGraph, sharedTwitter } from "@/content/social-metadata";

export const dynamicParams = false;

export function generateStaticParams() { return projectCatalog.map(({ slug }) => ({ slug })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = findProject((await params).slug);
  if (!project) return { title: "Project not found | StarGod" };
  const title = `${project.name} | StarGod`;
  const path = `/projects/${project.slug}`;
  return { title, description: project.summary.en, alternates: { canonical: path },
    openGraph: { ...sharedOpenGraph, title, description: project.summary.en, url: path },
    twitter: { ...sharedTwitter, title, description: project.summary.en } };
}
export default async function ProjectPage({ params }: Props) {
  const project = findProject((await params).slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
