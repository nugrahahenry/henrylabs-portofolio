"use client";

import { useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { polaraStory } from "@/content/polara-story";
import { useSitePreferences } from "./site-preferences";
import { ProjectVisual } from "./project-visual";

export function PolaraCaseStudy({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const screenshot = (index: number) => {
    const shot = polaraStory.captures[index];
    return <ProjectVisual project={{ ...project, media: shot.src, mediaSize: shot.size, mediaAlt: shot.alt[language] }} captureTitle={shot.title[language]} />;
  };
  return <article className="polara-story" aria-label={en ? "Polara case study" : "Studi kasus Polara"}>
    <figure className="polara-demo">
      <video key={attempt} controls playsInline preload="none" width="1440" height="1000" poster="/assets/projects/polara/frames.webp" src={`/assets/projects/polara/walkthrough.webm${attempt ? `?retry=${attempt}` : ""}`} aria-label={en ? "Polara frame-to-download walkthrough" : "Rekaman Polara dari frame sampai unduhan"} aria-describedby="polara-demo-caption" onError={() => setFailed(true)}>
        {en ? "Video unavailable. The screenshots below show the same product." : "Video tidak tersedia. Screenshot di bawah menampilkan produk yang sama."}
      </video>
      {failed && <div className="polara-video-error"><p role="alert">{en ? "The recording could not play. The screenshots remain available below." : "Rekaman belum bisa diputar. Screenshot tetap tersedia di bawah."}</p><button type="button" title={en ? "Retry video" : "Coba video lagi"} aria-label={en ? "Retry video" : "Coba video lagi"} onClick={() => { setAttempt(value => value + 1); setFailed(false); }}><RotateCcw size={18} /></button></div>}
      <figcaption id="polara-demo-caption"><span>{en ? "Recorded in Polara v1.1.3 / Demo mode" : "Direkam di Polara v1.1.3 / mode Demo"}</span><span>{en ? "Fictional sample photos. No audio." : "Foto contoh fiktif. Tanpa audio."}</span></figcaption>
    </figure>
    <details className="polara-transcript"><summary>{en ? "Read the walkthrough" : "Baca alur rekaman"}</summary><p>{en ? "The recording opens in Frames with three demo photos. A different frame is selected, then the second photo is switched to Full photo. The session continues through Decorate without stickers, reveals the final strip, and saves a PNG to the device." : "Rekaman dimulai di Frames dengan tiga foto demo. Frame diganti, lalu foto kedua diubah ke Full photo. Sesi dilanjutkan melalui Decorate tanpa stiker, menampilkan strip akhir, lalu menyimpan PNG ke perangkat."}</p></details>
    <header className="polara-story-heading"><h2>{polaraStory.title[language]}</h2><p>{polaraStory.problem[language]}</p></header>
    <section className="polara-decisions" aria-labelledby="polara-decisions-title">
      <h2 id="polara-decisions-title">{en ? "The decisions behind it." : "Keputusan di baliknya."}</h2>
      <div>{polaraStory.decisions.map(item => <section key={item.title.en}><h3>{item.title[language]}</h3><p>{item.body[language]}</p></section>)}</div>
    </section>
    <div className="polara-captures">{screenshot(0)}{screenshot(1)}</div>
    <section className="polara-result" aria-labelledby="polara-result-title">
      <div><h2 id="polara-result-title">{en ? "A finished moment, not just a mockup." : "Momen yang bisa disimpan, bukan sekadar mockup."}</h2><p>{polaraStory.result[language]}</p><ul className="library-stack" aria-label={en ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul><p className="polara-boundary">{polaraStory.limit[language]}</p><a className="library-text-link" href={project.link} target="_blank" rel="noreferrer">{en ? "Try Polara" : "Coba Polara"}<ArrowUpRight size={18} /></a></div>
      <div className="polara-mobile-proof">{screenshot(2)}</div>
    </section>
  </article>;
}
