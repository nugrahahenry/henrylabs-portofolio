"use client";

import { useId, useState } from "react";
import { CarFront, CalendarDays, LayoutDashboard } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { rentalStory as story } from "@/content/rental-story";
import { ProjectVisual } from "./project-visual";
import { useSitePreferences } from "./site-preferences";

const icons = [CarFront, CalendarDays, LayoutDashboard];

export function RentalCaseStudy({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const [selected, setSelected] = useState(0);
  const id = useId();

  return <article className="rental-story" aria-label={en ? "RentalMobil.SG case study" : "Studi kasus RentalMobil.SG"}>
    <div className="rental-gallery">
      <div className="rental-tabs" role="tablist" aria-label={en ? "Application workflows" : "Alur aplikasi"} onKeyDown={event => {
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
      <div className="rental-panels">{story.captures.map((shot, index) => <div className="rental-panel" key={shot.src} data-capture={shot.tab.en.toLowerCase()} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} aria-hidden={selected !== index} inert={selected !== index}>
        <ProjectVisual project={{ ...project, media: shot.src, mediaSize: shot.size, mediaAlt: shot.alt[language] }} captureTitle={shot.title[language]} captureNote={story.captureNote[language]} />
        <div className="rental-panel-copy"><h2>{shot.heading[language]}</h2><p>{shot.body[language]}</p></div>
      </div>)}</div>
      <p className="rental-capture-note">{story.captureNote[language]}</p>
    </div>
    <section className="rental-context" aria-labelledby="rental-context-title"><h2 id="rental-context-title">{story.title[language]}</h2><p>{story.problem[language]}</p></section>
    <section className="rental-decisions" aria-labelledby="rental-decisions-title"><h2 id="rental-decisions-title">{en ? "The decisions behind it." : "Keputusan di baliknya."}</h2><div>{story.decisions.map(item => <section key={item.title.en}><h3>{item.title[language]}</h3><p>{item.body[language]}</p></section>)}</div></section>
    <section className="rental-result" aria-labelledby="rental-result-title"><div><h2 id="rental-result-title">{en ? "From choosing a car to managing a rental." : "Dari memilih mobil sampai mengelola sewa."}</h2><p>{story.result[language]}</p><ul className="library-stack" aria-label={en ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul></div><p className="rental-boundary">{story.limit[language]}</p></section>
  </article>;
}
