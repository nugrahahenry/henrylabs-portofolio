"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { categories } from "@/content/catalog";
import { ProjectMark } from "./project-library";
import { SiteLink, updateQuery, useSitePreferences } from "./site-preferences";
import { ProjectVisual } from "./project-visual";
import { chapterBlend } from "./universe-chapter";

export function HomeProjectPreview({ project }: { project: CatalogProject }) {
  const { language, motionOn } = useSitePreferences();
  const heading = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const { scrollYProgress: headingProgress } = useScroll({ target: heading, offset: ["start 88%", "start 42%"] });
  const { scrollYProgress } = useScroll({ target: article, offset: ["start end", "start 30%"] });
  const headingY = useTransform(headingProgress, [0, 1], [18, 0]);
  const headingOpacity = useTransform(headingProgress, [0, 1], [.62, 1]);
  const headingScale = useTransform(headingProgress, [0, 1], [.985, 1]);
  const mediaY = useTransform(scrollYProgress, value => 42 * (1 - chapterBlend(value, 0, 1)));
  const mediaScale = useTransform(scrollYProgress, [0, 1], [.965, 1]);
  const copyY = useTransform(scrollYProgress, value => 18 * (1 - chapterBlend(value, 0, 1)));
  const copyOpacity = useTransform(scrollYProgress, [0, .45], [.74, 1]);
  const isEn = language === "en";
  const href = `/projects/${project.slug}?from=universe`;
  const remember = () => updateQuery({ world: project.id }, true);
  return <>
    <motion.div ref={heading} className="home-preview-heading" style={motionOn ? { opacity: headingOpacity, y: headingY, scale: headingScale } : undefined}>
      <div className="home-preview-heading-copy">
        <span className="home-preview-kicker"><span className="live-pulse" /> {isEn ? "Selected world" : "Dunia terpilih"} / {categories[project.category][language]}</span>
        <h2 id="work-title">{isEn ? "A world, closer." : "Satu dunia, lebih dekat."}</h2>
      </div>
      <SiteLink href="/projects" className="library-text-link">{isEn ? "All 10 projects" : "Semua 10 proyek"}<ArrowRight size={18} /></SiteLink>
    </motion.div>
    <article ref={article} className="home-project-preview" data-project={project.id} style={{ "--record-color": project.color } as CSSProperties}>
      <motion.div className="home-project-media" style={motionOn ? { y: mediaY, scale: mediaScale } : undefined}>
        {project.media ? <ProjectVisual key={project.id} project={project} /> : <div className="home-project-system"><span className="home-project-mark"><ProjectMark project={project} /></span><ol>{project.flow[language].map(step => <li key={step}>{step}</li>)}</ol></div>}
        <p className="home-project-evidence">{project.evidence[language]}</p>
      </motion.div>
      <motion.div className="home-project-copy" style={motionOn ? { y: copyY, opacity: copyOpacity } : undefined}>
        <div className="home-project-identity"><span className="home-project-emblem"><ProjectMark project={project} /></span><div><span className="record-status">{categories[project.category][language]}</span><h3>{project.name}</h3></div></div>
        <p className="home-project-summary">{project.summary[language]}</p>
        <dl className="home-project-facts"><div><dt>{isEn ? "Built by" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div><div><dt>{isEn ? "Build state" : "Status"}</dt><dd>{project.status[language]} / {project.access[language]}</dd></div></dl>
        <ul className="library-stack" aria-label={isEn ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul>
        <SiteLink className="library-text-link" href={href} onClick={remember}>{isEn ? "Read the project" : "Baca proyek"}<ArrowUpRight size={18} /></SiteLink>
      </motion.div>
    </article>
  </>;
}
