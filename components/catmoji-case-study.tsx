"use client";

import { useId, useState } from "react";
import { ArrowUpRight, Gamepad2, Hand } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { catmojiStory as story } from "@/content/catmoji-story";
import { ProjectVisual } from "./project-visual";
import { useSitePreferences } from "./site-preferences";

export function CatmojiCaseStudy({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const [selected, setSelected] = useState(0);
  const id = useId();
  const screenshot = (index: number) => {
    const shot = story.captures[index];
    return <ProjectVisual key={shot.src} project={{ ...project, media: shot.src, mediaSize: shot.size, mediaAlt: shot.alt[language] }} captureTitle={shot.title[language]} captureNote={story.captureNote[language]} />;
  };
  return <article className="catmoji-story" aria-label={en ? "Catmoji case study" : "Studi kasus Catmoji"}>
    <div className="catmoji-opening">
      <div className="catmoji-gallery">
        <div className="catmoji-tabs" role="tablist" aria-label={en ? "Application screenshots" : "Screenshot aplikasi"} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - selected;
          setSelected(next);
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>
          {[{ label: "Normal", Icon: Hand }, { label: "Challenge", Icon: Gamepad2 }].map(({ label, Icon }, index) => <button key={label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </div>
        <div className="catmoji-panels">{[0, 1].map(index => <div key={index} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} data-mode={index === 0 ? "normal" : "challenge"} aria-hidden={selected !== index} inert={selected !== index}>{screenshot(index)}</div>)}</div>
        <p className="catmoji-capture-note">{story.captureNote[language]}</p>
      </div>
      <div className="catmoji-intent">
        <h2>{story.title[language]}</h2><p>{story.problem[language]}</p>
        <ol className="catmoji-pipeline">{story.pipeline.map((step, index) => <li key={step.title.en}><span aria-hidden="true">{index + 1}</span><div><h3>{step.title[language]}</h3><p>{step.body[language]}</p></div></li>)}</ol>
        <p className="catmoji-distinction">{story.distinction[language]}</p>
      </div>
    </div>
    <section className="catmoji-decisions" aria-labelledby="catmoji-decisions-title"><h2 id="catmoji-decisions-title">{en ? "The decisions behind it." : "Keputusan di baliknya."}</h2><div>{story.decisions.map(item => <section key={item.title.en}><h3>{item.title[language]}</h3><p>{item.body[language]}</p></section>)}</div></section>
    <section className="catmoji-result" aria-labelledby="catmoji-result-title"><div><h2 id="catmoji-result-title">{en ? "From classifier to playable product." : "Dari classifier jadi produk yang bisa dimainkan."}</h2><p>{story.result[language]}</p><ul className="library-stack" aria-label={en ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul><p className="catmoji-boundary">{story.limit[language]}</p><a className="library-text-link" href={project.link} target="_blank" rel="noreferrer">{en ? "Try Catmoji" : "Coba Catmoji"}<ArrowUpRight size={18} /></a></div><div className="catmoji-mobile-proof">{screenshot(2)}</div></section>
  </article>;
}
