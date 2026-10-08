"use client";

import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { categories } from "@/content/catalog";
import { ProjectMark } from "./project-library";
import { SiteLink, updateQuery, useSitePreferences } from "./site-preferences";

export function HomeProjectPreview({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const isEn = language === "en";
  const href = `/projects/${project.slug}?from=universe`;
  const remember = () => updateQuery({ world: project.id }, true);
  return <>
    <div className="home-preview-heading"><h2 id="work-title">{isEn ? "A world, closer." : "Satu dunia, lebih dekat."}</h2><SiteLink href="/projects" className="library-text-link">{isEn ? "All 10 projects" : "Semua 10 proyek"}<ArrowRight size={18} /></SiteLink></div>
    <article className="home-project-preview" data-project={project.id} style={{ "--record-color": project.color } as CSSProperties}>
      <SiteLink className="home-project-media" href={href} onClick={remember} aria-label={`${isEn ? "Read" : "Baca"} ${project.name}`}>
        {project.media ? <img src={project.media} alt={project.mediaAlt ?? project.name} loading="lazy" /> : <div className="home-project-system"><span className="home-project-mark"><ProjectMark project={project} /></span><ol>{project.flow[language].map(step => <li key={step}>{step}</li>)}</ol></div>}
      </SiteLink>
      <div className="home-project-copy">
        <div className="home-project-identity"><span className="home-project-emblem"><ProjectMark project={project} /></span><div><span className="record-status">{categories[project.category][language]}</span><h3>{project.name}</h3></div></div>
        <p className="home-project-summary">{project.summary[language]}</p>
        <dl className="home-project-facts"><div><dt>{isEn ? "Built by" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div><div><dt>{isEn ? "Build state" : "Status"}</dt><dd>{project.status[language]} / {project.access[language]}</dd></div></dl>
        <ul className="library-stack" aria-label={isEn ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul>
        <SiteLink className="library-text-link" href={href} onClick={remember}>{isEn ? "Read the project" : "Baca proyek"}<ArrowUpRight size={18} /></SiteLink>
      </div>
    </article>
  </>;
}
