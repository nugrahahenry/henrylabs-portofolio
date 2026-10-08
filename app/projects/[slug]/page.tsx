import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projectCatalog, findProject } from "@/content/catalog";
import { ProjectDetail } from "@/components/project-library";

export function generateStaticParams() { return projectCatalog.map(({ slug }) => ({ slug })); }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = findProject((await params).slug);
  if (!project) return { title: "Project not found | HenryLabs" };
  const title = `${project.name} | HenryLabs`;
  const path = `/projects/${project.slug}`;
  return { title, description: project.summary.en, alternates: { canonical: path },
    openGraph: { title, description: project.summary.en, url: path },
    twitter: { title, description: project.summary.en } };
}
export default async function ProjectPage({ params }: Props) {
  const project = findProject((await params).slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
