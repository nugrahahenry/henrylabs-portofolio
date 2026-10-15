"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { categories } from "@/content/catalog";
import { ProjectMark } from "./project-library";
import { SiteLink, useSitePreferences } from "./site-preferences";
import { ProjectVisual } from "./project-visual";
import { chapterEase } from "./universe-chapter";

export function HomeProjectPreview({ project, onRead }: { project: CatalogProject; onRead: () => void }) {
  const { language, motionOn } = useSitePreferences();
  const heading = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const { scrollYProgress: headingProgress } = useScroll({ target: heading, offset: ["start 88%", "start 42%"] });
  const { scrollYProgress } = useScroll({ target: article, offset: ["start end", "start 48%"] });
  const headingY = useTransform(headingProgress, value => 14 * (1 - chapterEase(value, 0, 1)));
  const mediaY = useTransform(scrollYProgress, value => 32 * (1 - chapterEase(value, 0, 1)));
  const mediaScale = useTransform(scrollYProgress, value => .975 + .025 * chapterEase(value, 0, 1));
  const copyY = useTransform(scrollYProgress, value => 14 * (1 - chapterEase(value, 0, 1)));
  const isEn = language === "en";
  const href = `/projects/${project.slug}?from=universe`;
  return <>
    <motion.div ref={heading} className="home-preview-heading" style={motionOn ? { y: headingY } : undefined}>
      <div className="home-preview-heading-copy">
        <h2 id="work-title"><span className="home-preview-title">{isEn ? "A world, closer." : "Satu dunia, lebih dekat."}</span></h2>
        <span className="home-preview-context">{isEn ? "Selected world" : "Dunia terpilih"}<span aria-hidden="true">/</span>{categories[project.category][language]}</span>
      </div>
      <SiteLink href="/projects" className="library-text-link">{isEn ? "All 10 projects" : "Semua 10 proyek"}<ArrowRight size={18} /></SiteLink>
    </motion.div>
    <article ref={article} className="home-project-preview" aria-labelledby="home-project-name" data-project={project.id} style={{ "--record-color": project.color, "--artwork-ratio": project.mediaSize?.join(" / ") } as CSSProperties}>
      <div className="home-project-identity"><span className="home-project-emblem" aria-hidden="true"><ProjectMark project={project} /></span><h3 id="home-project-name">{project.name}</h3></div>
      <motion.div className="home-project-media" style={motionOn ? { y: mediaY, scale: mediaScale } : undefined}>
        {project.media ? <ProjectVisual key={project.id} project={project} /> : <div className="home-project-system"><span className="home-project-mark"><ProjectMark project={project} /></span><ol>{project.flow[language].map(step => <li key={step}>{step}</li>)}</ol></div>}
        <p className="home-project-evidence">{project.evidence[language]}</p>
      </motion.div>
      <motion.div className="home-project-copy" style={motionOn ? { y: copyY } : undefined}>
        <p className="home-project-summary">{project.summary[language]}</p>
        <dl className="home-project-facts"><div><dt>{isEn ? "Built by" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div><div><dt>{isEn ? "Build state" : "Status"}</dt><dd>{project.status[language]} / {project.access[language]}</dd></div></dl>
        <ul className="library-stack" aria-label={isEn ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul>
        <SiteLink className="library-text-link" href={href} onNavigate={onRead}>{isEn ? "Read the project" : "Baca proyek"}<ArrowUpRight size={18} /></SiteLink>
      </motion.div>
    </article>
  </>;
}
