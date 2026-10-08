"use client";

import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, CarFront, Code2, FlaskConical, Instagram, LockKeyhole, MessageCircle, Search, ShoppingCart, X } from "lucide-react";
import { categories, filterProjects, normalizeCategory, type CatalogProject } from "@/content/catalog";
import { SiteLink, updateQuery, useQuery, useSitePreferences } from "./site-preferences";

export function ProjectMark({ project }: { project: CatalogProject }) {
  const Icon = ({ rental: CarFront, pos: ShoppingCart, labq: FlaskConical, yventures: MessageCircle, soreva: Instagram })[project.id] ?? Code2;
  return project.logo ? <img src={project.logo} alt="" /> : <Icon aria-hidden="true" size={32} strokeWidth={1.4} />;
}

export function LibraryFooter() {
  const { language } = useSitePreferences();
  return <footer className="library-footer"><SiteLink href="/">StarGod <ArrowLeft size={16} /></SiteLink><span>{language === "en" ? "Built by Henry Nugraha" : "Dibangun oleh Henry Nugraha"}</span><a href="https://www.linkedin.com/in/nugrahahenry/" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={16} /></a></footer>;
}

export function ProjectLibrary() {
  const { language } = useSitePreferences();
  const query = useQuery();
  const category = normalizeCategory(query.get("category"));
  const search = query.get("q") ?? "";
  const results = filterProjects(category, search);
  const isEn = language === "en";
  const returnQuery = new URLSearchParams();
  if (category !== "all") returnQuery.set("category", category);
  if (search) returnQuery.set("q", search);
  return <main className="library-page" id="main-content">
    <div className="library-heading"><h1>{isEn ? "Projects." : "Proyek."}</h1><p>{isEn ? "Independent products, university systems, and work with real stakes." : "Produk mandiri, sistem kuliah, dan pekerjaan dengan konsekuensi nyata."}</p><SiteLink className="library-text-link" href="/">{isEn ? "Explore the universe" : "Jelajahi semesta"}<ArrowUpRight size={18} /></SiteLink></div>
    <div className="library-controls">
      <div className="category-filter" role="group" aria-label={isEn ? "Project category" : "Kategori proyek"}>{Object.entries(categories).map(([id, label]) => <button type="button" key={id} aria-pressed={category === id} onClick={() => updateQuery({ category: id === "all" ? null : id })}>{label[language]}</button>)}</div>
      <label className="library-search"><Search size={18} /><span className="sr-only">{isEn ? "Search projects" : "Cari proyek"}</span><input type="search" value={search} placeholder={isEn ? "Name, stack, or idea" : "Nama, stack, atau ide"} onChange={event => updateQuery({ q: event.target.value || null }, true)} /></label>
    </div>
    <div className="library-results" aria-live="polite"><span>{String(results.length).padStart(2, "0")} {isEn ? "projects" : "proyek"}</span><span>{categories[category][language]}</span></div>
    <div className="project-library-grid">{results.map((project, index) => <article className="project-record" key={project.id} style={{ "--record-color": project.color } as CSSProperties}>
      <SiteLink className="project-record-link" aria-labelledby={`project-title-${project.id}`} href={`/projects/${project.slug}${returnQuery.size ? `?${returnQuery}` : ""}`}>
      <div className="project-record-visual">
        {project.media ? <img className="project-record-art" src={project.media} alt={project.mediaAlt ?? project.name} loading={index < 2 ? "eager" : "lazy"} /> : <div className="project-record-system"><span className="project-record-mark"><ProjectMark project={project} /></span><div>{project.flow[language].map((step, i) => <span key={step}><small>{String(i + 1).padStart(2, "0")}</small>{step}</span>)}</div></div>}
        <span className="record-category">{categories[project.category][language]}</span>
      </div>
      <div className="project-record-body"><span className="record-status">{project.status[language]} / {project.access[language]}</span><h2 id={`project-title-${project.id}`}>{project.name}<ArrowUpRight size={22} aria-hidden="true" /></h2><p>{project.summary[language]}</p><ul className="library-stack" aria-label={isEn ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul><span className="record-ownership">{project.ownership[language]}</span></div>
      </SiteLink>
    </article>)}</div>
    {results.length === 0 && <div className="library-empty"><Search size={28} /><h2>{isEn ? "No matching worlds." : "Belum ada proyek yang cocok."}</h2><button type="button" className="library-text-link" onClick={() => updateQuery({ category: null, q: null })}><X size={16} />{isEn ? "Clear filters" : "Hapus filter"}</button></div>}
    <LibraryFooter />
  </main>;
}

export function ProjectDetail({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const query = useQuery();
  const isEn = language === "en";
  const fromOrbit = query.get("from") === "universe";
  const backQuery = new URLSearchParams();
  const category = normalizeCategory(query.get("category"));
  if (category !== "all") backQuery.set("category", category);
  if (query.get("q")) backQuery.set("q", query.get("q")!);
  const back = fromOrbit ? `/?world=${project.id}` : `/projects${backQuery.size ? `?${backQuery}` : ""}`;
  const externalLink = project.link ?? (project.source ? undefined : "mailto:henrynugraha1210@gmail.com");
  return <main className="library-page project-detail" style={{ "--record-color": project.color } as CSSProperties} id="main-content">
    <SiteLink href={back} className="library-back"><ArrowLeft size={17} />{fromOrbit ? (isEn ? "Back to the universe" : "Kembali ke semesta") : (isEn ? "All projects" : "Semua proyek")}</SiteLink>
    <header className="detail-heading"><span className="library-eyebrow">{categories[project.category][language]} / {project.status[language]}</span><div className="detail-identity"><span className="detail-mark"><ProjectMark project={project} /></span><h1>{project.name}</h1></div><p>{project.summary[language]}</p><div className="detail-actions">{externalLink && <a className="library-action" href={externalLink} target={externalLink.startsWith("https:") ? "_blank" : undefined} rel={externalLink.startsWith("https:") ? "noreferrer" : undefined}>{project.linkLabel?.[language] ?? (isEn ? "Request a walkthrough" : "Minta walkthrough")}<ArrowUpRight size={17} /></a>}{project.source && <a className="library-action" href={project.source} target="_blank" rel="noreferrer"><Code2 size={17} />{isEn ? "Read source" : "Baca source"}<ArrowUpRight size={17} /></a>}<SiteLink href={`/?world=${project.id}`} className="library-text-link">{isEn ? "Find in the universe" : "Lihat di semesta"}<ArrowUpRight size={17} /></SiteLink></div></header>
    {project.media && <figure className="detail-art"><img src={project.media} alt={project.mediaAlt ?? project.name} /><figcaption>{project.name} / {isEn ? "Original product artwork" : "Artwork produk asli"}</figcaption></figure>}
    <div className="detail-content"><section aria-labelledby="detail-flow"><span className="library-eyebrow">01 / {isEn ? "The system" : "Sistem"}</span><h2 id="detail-flow">{isEn ? "From friction to flow." : "Dari friksi menjadi alur."}</h2><ol className="detail-flow">{project.flow[language].map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, "0")}</span><h3>{step}</h3>{i < project.flow[language].length - 1 && <ArrowRight size={20} aria-hidden="true" />}</li>)}</ol><p>{project.role[language]}</p></section><aside className="detail-facts"><dl><div><dt>{isEn ? "Ownership" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div><div><dt>{isEn ? "Access" : "Akses"}</dt><dd>{project.access[language]}</dd></div><div><dt>{isEn ? "Working stack" : "Stack proyek"}</dt><dd><ul className="library-stack">{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul></dd></div></dl></aside></div>
    <section className="detail-evidence"><span className="library-eyebrow">02 / {isEn ? "Evidence & next step" : "Bukti & langkah berikutnya"}</span><div><h2>{project.evidence[language]}</h2><p>{project.next[language]}</p>{!project.source && project.category !== "henrylabs" && <p className="privacy-note"><LockKeyhole size={16} />{isEn ? "No private source, client data, or internal screenshots are published here." : "Source privat, data klien, dan screenshot internal tidak dipublikasikan di sini."}</p>}</div></section>
    <LibraryFooter />
  </main>;
}
