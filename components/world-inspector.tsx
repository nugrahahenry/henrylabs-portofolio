"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { motion, useIsPresent } from "motion/react";
import { categories, projectCatalog, type CatalogProject } from "@/content/catalog";
import type { Language } from "@/content/projects";
import { ProjectMark } from "./project-library";
import { SiteLink, updateQuery } from "./site-preferences";

export function WorldInspector({ project, language, motionOn, onSelect, onClose }: {
  project: CatalogProject;
  language: Language;
  motionOn: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const present = useIsPresent();
  const isEn = language === "en";
  const records = projectCatalog.filter(item => item.category === project.category);
  const external = project.link ?? project.source;

  // Focus only on opening; changing worlds must preserve the selected control.
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  return <motion.section id="active-world-inspector"
    className={`project-showcase world-inspector${project.category === "henrylabs" ? "" : " satellite-readout"}`}
    data-lenis-prevent inert={!present} aria-labelledby="active-world-title"
    style={{ "--project-showcase-color": project.color } as CSSProperties}
    initial={motionOn ? { opacity: 0, x: 12 } : false} animate={{ opacity: 1, x: 0 }}
    exit={motionOn ? { opacity: 0, x: 8 } : undefined} transition={{ duration: motionOn ? .22 : 0 }}>
    <div className="world-inspector-topline">
      <span>{categories[project.category][language]} <small>{String(records.findIndex(item => item.id === project.id) + 1).padStart(2, "0")} / {String(records.length).padStart(2, "0")}</small></span>
      <button ref={closeRef} type="button" onClick={onClose} aria-label={isEn ? "Close active world" : "Tutup dunia aktif"} title={isEn ? "Close active world" : "Tutup dunia aktif"}><X size={18} /></button>
    </div>
    <div className="world-inspector-index" role="group" aria-label={isEn ? "Project worlds" : "Dunia proyek"}>
      {records.map((item, index) => <button key={item.id} type="button" aria-pressed={project.id === item.id}
        aria-label={`${isEn ? "Focus" : "Pilih"} ${item.name}`} title={item.name}
        style={{ "--world-color": item.color } as CSSProperties} onClick={() => onSelect(item.id)}>
        <span className="world-inspector-mark"><ProjectMark project={item} /></span><small>{String(index + 1).padStart(2, "0")}</small>
      </button>)}
    </div>
    <div className="world-inspector-identity"><span className="world-inspector-mark"><ProjectMark project={project} /></span><p>{project.status[language]}<span>{project.access[language]}</span></p></div>
    <h2 id="active-world-title">{project.name}</h2>
    <p className="world-inspector-summary">{project.summary[language]}</p>
    <SiteLink className="world-inspector-detail" href={`/projects/${project.slug}?from=universe`} onClick={() => updateQuery({ world: project.id }, true)}>
      {isEn ? "Read project" : "Baca proyek"}<ArrowRight size={17} />
    </SiteLink>
    <dl className="world-inspector-facts">
      <div><dt>{isEn ? "Ownership" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div>
      <div><dt>{isEn ? "Workflow" : "Alur"}</dt><dd><ol>{project.flow[language].map(step => <li key={step}>{step}</li>)}</ol></dd></div>
    </dl>
    <ul className="world-inspector-stack" aria-label={isEn ? "Technology stack" : "Teknologi"}>{project.stack.map(item => <li key={item}>{item}</li>)}</ul>
    {external ? <a className="world-inspector-external" href={external} target={external.startsWith("https:") ? "_blank" : undefined} rel={external.startsWith("https:") ? "noreferrer" : undefined}>
      {project.linkLabel?.[language] ?? (isEn ? "View source" : "Lihat source")}<ArrowUpRight size={16} />
    </a> : project.category === "client" && <a className="world-inspector-external" href="#contact">{isEn ? "Request walkthrough" : "Minta walkthrough"}<ArrowUpRight size={16} /></a>}
  </motion.section>;
}
