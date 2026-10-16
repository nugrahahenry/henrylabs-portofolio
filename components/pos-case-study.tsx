"use client";

import { useId, useState } from "react";
import { BarChart3, Package, ReceiptText } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { posStory as story } from "@/content/pos-story";
import { ProjectVisual } from "./project-visual";
import { useSitePreferences } from "./site-preferences";

const icons = [Package, ReceiptText, BarChart3];

export function PosCaseStudy({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const [selected, setSelected] = useState(0);
  const id = useId();

  return <article className="pos-story" aria-label={en ? "POS Z Shoes case study" : "Studi kasus POS Z Shoes"}>
    <div className="pos-gallery">
      <div className="pos-tabs" role="tablist" aria-label={en ? "Application workflows" : "Alur aplikasi"} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const count = story.captures.length;
        const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : (selected + (event.key === "ArrowRight" ? 1 : -1) + count) % count;
        setSelected(next);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}>{story.captures.map((shot, index) => {
        const Icon = icons[index];
        return <button key={shot.src} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)}><Icon size={18} aria-hidden="true" />{shot.tab[language]}</button>;
      })}</div>
      <div className="pos-panels">{story.captures.map((shot, index) => <div className="pos-panel" key={shot.src} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} aria-hidden={selected !== index} inert={selected !== index}>
        <ProjectVisual project={{ ...project, media: shot.src, mediaSize: shot.size, mediaAlt: shot.alt[language] }} captureTitle={shot.title[language]} captureNote={story.captureNote[language]} />
        <div className="pos-panel-copy"><h2>{shot.heading[language]}</h2><p>{shot.body[language]}</p></div>
      </div>)}</div>
      <p className="pos-capture-note">{story.captureNote[language]}</p>
    </div>
    <section className="pos-context" aria-labelledby="pos-context-title"><h2 id="pos-context-title">{story.title[language]}</h2><p>{story.problem[language]}</p></section>
    <section className="pos-decisions" aria-labelledby="pos-decisions-title"><h2 id="pos-decisions-title">{en ? "The decisions behind it." : "Keputusan di baliknya."}</h2><div>{story.decisions.map(item => <section key={item.title.en}><h3>{item.title[language]}</h3><p>{item.body[language]}</p></section>)}</div></section>
    <section className="pos-result" aria-labelledby="pos-result-title"><div><h2 id="pos-result-title">{en ? "From business flow to desktop build." : "Dari alur bisnis ke aplikasi desktop."}</h2><p>{story.result[language]}</p><ul className="library-stack" aria-label={en ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul></div><p className="pos-boundary">{story.limit[language]}</p></section>
  </article>;
}
