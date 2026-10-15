"use client";

import { useEffect, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CarFront, Code2, FlaskConical, GraduationCap, Grid2X2, Instagram, LockKeyhole, MessageCircle, Orbit, Search, ShoppingCart, X } from "lucide-react";
import { categories, filterProjects, normalizeCategory, type CatalogProject } from "@/content/catalog";
import { projectWorkflowNotes } from "@/content/project-workflows";
import { SiteLink, updateQuery, useQuery, useSitePreferences } from "./site-preferences";
import { ProjectVisual } from "./project-visual";
import { LibraryMasthead } from "./library-masthead";
import { LibraryThumbnail } from "./library-thumbnail";
import { makerRouteHref, makerRouteQuery, readMakerRoute } from "./maker-route";

const categoryIcons = { all: Grid2X2, henrylabs: Orbit, university: GraduationCap, client: BriefcaseBusiness };

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
  const queryKey = query.toString();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).toString() !== queryKey) return;
    const id = window.location.hash.slice(1);
    if (!results.some(project => id === `project-card-${project.id}`)) return;
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(id);
      card?.scrollIntoView({ block: "center", behavior: "instant" });
      card?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [queryKey]);
  const rememberCard = (id: string) => {
    const url = new URL(window.location.href);
    url.hash = `project-card-${id}`;
    window.history.replaceState(window.history.state, "", url);
  };
  return <main className="library-page" id="main-content" tabIndex={-1}>
    <LibraryMasthead title={isEn ? "Projects." : "Proyek."} description={isEn ? "Independent products, university systems, and work with real stakes." : "Produk mandiri, sistem kuliah, dan pekerjaan dengan konsekuensi nyata."} action={<SiteLink className="library-text-link" href="/?view=universe">{isEn ? "Explore the universe" : "Jelajahi semesta"}<ArrowUpRight size={18} /></SiteLink>} />
    <div className="library-controls">
      <div className="category-filter" role="group" aria-label={isEn ? "Project category" : "Kategori proyek"}>{Object.entries(categories).map(([id, label]) => {
        const Icon = categoryIcons[id as keyof typeof categoryIcons] ?? BriefcaseBusiness;
        return <button type="button" key={id} aria-pressed={category === id} onClick={() => updateQuery({ category: id === "all" ? null : id }, false, true)}><Icon size={16} aria-hidden="true" /><span>{label[language]}</span><small aria-hidden="true">{filterProjects(normalizeCategory(id), search).length}</small></button>;
      })}</div>
      <label className="library-search"><Search size={18} /><span className="sr-only">{isEn ? "Search projects" : "Cari proyek"}</span><input type="search" value={search} placeholder={isEn ? "Name, stack, or idea" : "Nama, stack, atau ide"} onChange={event => updateQuery({ q: event.target.value || null }, true, true)} /></label>
    </div>
    <div className="library-results" aria-live="polite"><span>{String(results.length).padStart(2, "0")} {isEn ? "projects" : "proyek"} / {categories[category][language]}</span>{(search || category !== "all") && <button className="library-text-link" type="button" onClick={() => updateQuery({ category: null, q: null }, false, true)}><X size={14} />{isEn ? "Clear filters" : "Hapus filter"}</button>}</div>
    <div className="project-library-grid">{results.map((project, index) => <article className="project-record" key={project.id} style={{ "--record-color": project.color } as CSSProperties}>
      <SiteLink id={`project-card-${project.id}`} className="project-record-link" aria-labelledby={`project-title-${project.id}`} href={`/projects/${project.slug}${returnQuery.size ? `?${returnQuery}` : ""}`} onNavigate={() => rememberCard(project.id)}>
      <div className="project-record-visual">
        {project.media ? <LibraryThumbnail className="project-record-art" src={project.media} alt={project.mediaAlt ?? project.name} eager={index < 2} /> : <div className="project-record-system"><span className="project-record-mark"><ProjectMark project={project} /></span><div>{project.flow[language].map((step, i) => <span key={step}><small>{String(i + 1).padStart(2, "0")}</small>{step}</span>)}</div></div>}
      </div>
      <div className="project-record-caption"><span className="record-category">{categories[project.category][language]}</span><span>{project.media ? (project.mediaKind === "concept" ? (isEn ? "Concept artwork" : "Artwork konsep") : (isEn ? "Product artwork" : "Artwork produk")) : (isEn ? "System workflow" : "Alur sistem")}</span></div>
      <div className="project-record-body"><div className="project-record-heading"><span className="project-record-emblem" aria-hidden="true"><ProjectMark project={project} /></span><div><h2 id={`project-title-${project.id}`}>{project.name}</h2><span className="record-status">{project.status[language]} / {project.access[language]}</span></div></div><p>{project.summary[language]}</p><ul className="library-stack" aria-label={isEn ? "Technology stack" : "Teknologi proyek"}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul><span className="record-ownership"><span>{project.ownership[language]}</span><ArrowUpRight className="project-record-arrow" size={20} aria-hidden="true" /></span></div>
      </SiteLink>
    </article>)}</div>
    {results.length === 0 && <div className="library-empty"><Search size={28} /><h2>{isEn ? "No matching worlds." : "Belum ada proyek yang cocok."}</h2><button type="button" className="library-text-link" onClick={() => updateQuery({ category: null, q: null }, false, true)}><X size={16} />{isEn ? "Clear filters" : "Hapus filter"}</button></div>}
    <LibraryFooter />
  </main>;
}

export function ProjectDetail({ project }: { project: CatalogProject }) {
  const { language } = useSitePreferences();
  const query = useQuery();
  const isEn = language === "en";
  const maker = readMakerRoute(query);
  const fromMaker = maker?.chapter === "tools" ? maker : null;
  const fromOrbit = !fromMaker && query.get("from") === "universe";
  const backQuery = new URLSearchParams();
  const category = normalizeCategory(query.get("category"));
  if (category !== "all") backQuery.set("category", category);
  if (query.get("q")) backQuery.set("q", query.get("q")!);
  const back = fromMaker ? makerRouteHref(fromMaker) : fromOrbit ? `/?world=${project.id}` : `/projects${backQuery.size ? `?${backQuery}` : ""}#project-card-${project.id}`;
  const collection = filterProjects(fromOrbit ? project.category : category, fromOrbit ? "" : query.get("q") ?? "");
  const index = collection.findIndex(item => item.id === project.id);
  const previous = index > 0 ? collection[index - 1] : undefined;
  const next = index >= 0 ? collection[index + 1] : undefined;
  const detailQuery = fromMaker ? makerRouteQuery(fromMaker) : fromOrbit ? new URLSearchParams({ from: "universe" }) : backQuery;
  const detailHref = (item: CatalogProject) => `/projects/${item.slug}${detailQuery.size ? `?${detailQuery}` : ""}`;
  const collectionLabel = categories[fromOrbit ? project.category : category][language];
  const externalLink = project.link ?? (project.source ? undefined : "mailto:henrynugraha1210@gmail.com");
  const workflowNotes = projectWorkflowNotes[project.id]?.[language];
  return <main className="library-page project-detail" style={{ "--record-color": project.color } as CSSProperties} id="main-content" tabIndex={-1}>
    <div className="detail-route"><SiteLink href={back} scroll={fromMaker ? false : undefined} className="library-back"><ArrowLeft size={17} />{fromMaker ? (isEn ? "Back to technologies" : "Kembali ke teknologi") : fromOrbit ? (isEn ? "Back to the universe" : "Kembali ke semesta") : (isEn ? "All projects" : "Semua proyek")}</SiteLink>{index >= 0 && <span>{collectionLabel} / {String(index + 1).padStart(2, "0")} <span>{isEn ? "of" : "dari"} {String(collection.length).padStart(2, "0")}</span></span>}</div>
    <header className="detail-heading">
      <div className="detail-identity"><span className="detail-mark"><ProjectMark project={project} /></span><h1>{project.name}</h1></div>
      <p>{project.summary[language]}</p>
      <div className="detail-actions">
        {externalLink && <a className="library-action" href={externalLink} target={externalLink.startsWith("https:") ? "_blank" : undefined} rel={externalLink.startsWith("https:") ? "noreferrer" : undefined}>{project.linkLabel?.[language] ?? (isEn ? "Request a walkthrough" : "Minta walkthrough")}<ArrowUpRight size={17} /></a>}
        {project.source && <a className="library-action" href={project.source} target="_blank" rel="noreferrer"><Code2 size={17} />{isEn ? "Read source" : "Baca source"}<ArrowUpRight size={17} /></a>}
        {!fromOrbit && <SiteLink href={`/?world=${project.id}`} className="library-text-link">{isEn ? "Find in the universe" : "Lihat di semesta"}<ArrowUpRight size={17} /></SiteLink>}
      </div>
    </header>
    <dl className="detail-overview" aria-label={isEn ? "Project overview" : "Ringkasan proyek"}>
      <div><dt>{isEn ? "Build state" : "Status proyek"}</dt><dd>{project.status[language]}</dd></div>
      <div><dt>{isEn ? "Ownership" : "Kontribusi"}</dt><dd>{project.ownership[language]}</dd></div>
      <div><dt>{isEn ? "Access" : "Akses"}</dt><dd>{project.access[language]}</dd></div>
    </dl>
    {project.media && <div className="detail-art"><ProjectVisual key={project.id} project={project} /></div>}
    <div className="detail-content">
      <section aria-labelledby="detail-flow">
        <h2 id="detail-flow">{isEn ? "Inside the workflow." : "Di dalam alurnya."}</h2>
        <ol className="detail-flow">{project.flow[language].map((step, i) => <li key={step}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h3>{step}</h3>{workflowNotes?.[i] && <p>{workflowNotes[i]}</p>}</li>)}</ol>
      </section>
      <aside className="detail-facts"><dl>
        <div><dt>{isEn ? "Focus" : "Fokus"}</dt><dd>{project.role[language]}</dd></div>
        <div><dt>{isEn ? "Working stack" : "Stack proyek"}</dt><dd><ul className="library-stack">{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul></dd></div>
      </dl></aside>
    </div>
    <section className="detail-evidence"><h2>{isEn ? "What you can inspect." : "Yang bisa ditinjau."}</h2><div><p className="detail-evidence-summary">{project.evidence[language]}</p><p>{project.next[language]}</p>{!project.source && project.category !== "henrylabs" && <p className="privacy-note"><LockKeyhole size={16} />{isEn ? "No private source, client data, or internal screenshots are published here." : "Source privat, data klien, dan screenshot internal tidak dipublikasikan di sini."}</p>}</div></section>
    {(previous || next) && <nav className="detail-continuation" aria-label={isEn ? "More projects" : "Proyek lainnya"}>
      {[previous, next].map((item, position) => item ? <SiteLink key={item.id} href={detailHref(item)} className={`detail-neighbor${position === 1 ? " detail-neighbor--next" : ""}`} style={{ "--record-color": item.color } as CSSProperties}>
        <small>{position === 0 ? (isEn ? "Previous project" : "Proyek sebelumnya") : (isEn ? "Next project" : "Proyek berikutnya")}{position === 0 ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}</small>
        <span className="detail-neighbor-identity"><span className="detail-neighbor-mark"><ProjectMark project={item} /></span><span>{item.name}</span></span>
        <span className="detail-neighbor-category">{categories[item.category][language]}</span>
      </SiteLink> : <span key={position} className="detail-neighbor-empty" aria-hidden="true" />)}
    </nav>}
    <LibraryFooter />
  </main>;
}
