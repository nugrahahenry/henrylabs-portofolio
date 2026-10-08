"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Asterisk,
  Brackets,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Code2,
  FlaskConical,
  Github,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  MousePointer2,
  PanelRightOpen,
  ShoppingCart,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { CosmicCanvas, type OrbitId, type ProjectId, type SatelliteId, type SatelliteWorld } from "./cosmic-canvas";
import { SmoothScroll } from "./smooth-scroll";
import { WorldlineBackdrop } from "./worldline-backdrop";
import type { GalaxyId } from "./galaxy-system";

import { projects, academicProjects as academicData, clientProjects as clientData, clientStacks, type Language } from "@/content/projects";
import { stackGroups, orbitTechNodes } from "@/content/technologies";
import { certificates } from "@/content/credentials";
import { HomeProjectPreview } from "./home-project-preview";
import { findWorld } from "@/content/catalog";
import { SiteLink, useSitePreferences, useQuery, updateQuery } from "./site-preferences";
import { CredentialViewer } from "./credential-viewer";

const academicProjects = academicData.map((record, index) => ({ ...record, icon: [CarFront, ShoppingCart, FlaskConical][index] }));
const clientProjects = clientData.map((record, index) => ({ ...record, icon: [MessageCircle, Instagram][index] }));
type WorldlineStage = "world" | "method" | "stack";
type Sector = GalaxyId;



const copy = {
  en: {
    nav: { work: "Work", stack: "Stack", proof: "Proof", contact: "Contact" },
    hero: {
      title: "I build things I actually see.",
      body: "Product-minded developer turning everyday friction into useful systems, playful interfaces, and honest experiments.",
      work: "Explore the universe",
      contact: "Start a project",
      note: "Open to thoughtful freelance work and the right team.",
    },
    field: { label: "A living map of StarGod", hint: "Drag X/Y · zoom · select a world", inspect: "Inspect dossier", open: "Open project" },
    method: {
      kicker: "The Henry method",
      title: "Notice the friction.\nShape the useful.",
      body: "The best interface starts before the interface. I look for the awkward handoff, the missing context, and the tiny moment that should feel easier.",
      steps: ["See the friction", "Make the system legible", "Ship the next useful move"],
    },
    work: { title: "The work, in context.", body: "The orbit is the index. Select a world to see its friction, flow, and honest build state." },
    caseStudy: { stack: "Stack", signal: "Signal", ownership: "Ownership", evidence: "Evidence", next: "Next move", source: "Read source", private: "Private details stay protected", sequence: ["Friction", "System", "Proof"] },
    stack: { title: "The instruments behind the worlds.", body: "A flexible stack for moving from interface to workflow, from a classroom idea to a system people can actually use." },
    academic: { title: "Built while learning.", body: "University projects where I owned the system end to end: business flows, mobile and web interfaces, and the logic underneath." },
    client: { title: "Work with real stakes.", body: "Private client work is represented as sanitized evidence: what I owned, what I shipped, and where collaboration mattered.", request: "Request a private walkthrough", context: "Context", output: "Shipped layer", boundary: "Boundary" },
    proof: { title: "Proof, kept human.", body: "Five records lead the story. Open the full archive when you want the wider learning trail." },
    contact: { title: "Have something useful in mind?", body: "Tell me what is unclear, slow, or still waiting to be built. I am open to thoughtful freelance projects and teams that care about details." },
    footer: "built by Henry",
  },
  id: {
    nav: { work: "Karya", stack: "Stack", proof: "Bukti", contact: "Kontak" },
    hero: {
      title: "Aku membangun hal yang benar-benar kulihat.",
      body: "Developer product-minded yang mengubah rasa penasaran sehari-hari menjadi sistem berguna, interface playful, dan eksperimen jujur.",
      work: "Jelajahi semesta",
      contact: "Mulai project",
      note: "Terbuka untuk project freelance dan tim yang tepat.",
    },
    field: { label: "Peta hidup StarGod", hint: "Geser X/Y · zoom · pilih dunia", inspect: "Buka dossier", open: "Buka project" },
    method: {
      kicker: "Cara kerja Henry",
      title: "Lihat friksinya.\nBentuk yang berguna.",
      body: "Interface yang baik dimulai sebelum interface. Aku mencari handoff yang canggung, konteks yang hilang, dan momen kecil yang seharusnya terasa lebih mudah.",
      steps: ["Lihat friksinya", "Buat sistemnya terbaca", "Kirim langkah berguna berikutnya"],
    },
    work: { title: "Karya, dengan konteks.", body: "Orbit ini adalah index-nya. Pilih sebuah dunia untuk melihat friksi, alur, dan status build secara jujur." },
    caseStudy: { stack: "Stack", signal: "Sinyal", ownership: "Kepemilikan", evidence: "Bukti", next: "Langkah berikutnya", source: "Baca source", private: "Detail privat tetap dilindungi", sequence: ["Friksi", "Sistem", "Bukti"] },
    stack: { title: "Instrumen di balik semua dunia.", body: "Stack yang fleksibel untuk bergerak dari interface ke workflow, dari ide kuliah menjadi sistem yang benar-benar bisa dipakai." },
    academic: { title: "Dibuat sambil belajar.", body: "Project kuliah yang kubangun sendiri dari awal sampai akhir: alur bisnis, interface mobile dan web, serta logika di baliknya." },
    client: { title: "Project dengan konsekuensi nyata.", body: "Client work privat ditampilkan sebagai bukti yang sudah disanitasi: bagian yang kupegang, yang kubuat, dan kapan kolaborasi diperlukan.", request: "Minta walkthrough privat", context: "Konteks", output: "Layer yang dikirim", boundary: "Batas" },
    proof: { title: "Bukti, tetap manusiawi.", body: "Lima record memimpin ceritanya. Buka arsip penuh saat ingin melihat perjalanan belajar yang lebih lengkap." },
    contact: { title: "Ada sesuatu yang ingin dibuat berguna?", body: "Ceritakan hal yang masih membingungkan, lambat, atau belum sempat dibangun. Aku terbuka untuk project freelance dan tim yang peduli pada detail." },
    footer: "dibuat oleh Henry",
  },
} as const;



const techNodes = stackGroups.flatMap((group) => group.items.map(([label, slug, color]) => ({ label, slug, color, projectIds: projects.filter((project) => project.stack.includes(label)).map((project) => project.id as ProjectId) })));






// Satellite records reuse the existing evidence data, not a second set of project claims.
const universityRecords = academicProjects.map((project, index) => ({
  ...project,
  id: (["rental", "pos", "labq"] as const)[index],
  mark: ["RM", "POS", "LQ"][index],
  name: project.title,
  sector: "university" as const,
  access: project.link ? { en: "Open source", id: "Open source" } : { en: "Local class build", id: "Project kuliah lokal" },
  ownership: { en: "Solo by Henry", id: "Dibangun sendiri Henry" },
  anchor: `academic-${index + 1}`,
}));
const clientRecords = clientProjects.map((project, index) => ({
  ...project,
  stack: clientStacks[index === 0 ? "yventures" : "soreva"],
  id: (["yventures", "soreva"] as const)[index],
  mark: ["YV", "SC"][index],
  name: ["Y-Ventures", "Soreva"][index],
  sector: "client" as const,
  access: { en: "Private walkthrough", id: "Walkthrough privat" },
  anchor: `client-${index + 1}`,
}));
type SatelliteRecord = (typeof universityRecords)[number] | (typeof clientRecords)[number];
const toSatelliteWorld = (record: SatelliteRecord, index: number): SatelliteWorld => ({
  id: record.id, name: record.name, color: record.color, mark: record.mark,
  x: Math.cos(index * 2.1) * 2.5, y: Math.sin(index * 2.1) * 1.4, z: 0,
});
const universityWorlds = universityRecords.map(toSatelliteWorld);
const clientWorlds = clientRecords.map(toSatelliteWorld);
const satelliteCatalog = { university: universityWorlds, client: clientWorlds };





function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

function TechIcon({ label, slug, color }: { label: string; slug: string; color: string }) {
  const [status, setStatus] = useState("loading");
  const mark = label === "JavaScript" ? "JS" : label === "Python" ? "PY" : label === "OpenAI" ? "AI" : label === "Next.js" ? "N" : label.slice(0, 3).toUpperCase();
  return <span className="tech-icon" data-status={status} aria-hidden="true">
    {status !== "ready" && <span className="tech-icon-fallback">{mark}</span>}
    {status !== "failed" && <img src={`https://cdn.simpleicons.org/${slug}/${color}`} alt="" loading="lazy" onLoad={() => setStatus("ready")} onError={() => setStatus("failed")} />}
  </span>;
}

function ProjectSignature({ project, language, compact = false }: { project: (typeof projects)[number]; language: Language; compact?: boolean }) {
  return <div className={cx("project-signature", compact && "project-signature--compact")} aria-label={`${project.name} project signature`}>
    <span className="project-signature-label">project signature</span>
    <div className="project-signature-track">
      {project.signature[language].map((step, index) => <span key={step} className="project-signature-node">
        <i>{String(index + 1).padStart(2, "0")}</i>
        <b>{step}</b>
      </span>)}
    </div>
  </div>;
}

function SatelliteReadout({ record, records, language, motionOn, onSelect, onClose }: {
  record: SatelliteRecord;
  records: readonly SatelliteRecord[];
  language: Language;
  motionOn: boolean;
  onSelect: (id: SatelliteId) => void;
  onClose: () => void;
}) {
  const Icon = record.icon;
  const flow = record.sector === "university" ? record.signal : record.signal[language];
  const output = record.sector === "university" ? record.output : record.output[language];
  return <motion.section className="project-showcase satellite-readout" data-lenis-prevent key={record.id}
    aria-label={`Active project: ${record.name}`} style={{ "--project-showcase-color": record.color } as CSSProperties}
    initial={motionOn ? { opacity: 0, x: 18 } : false} animate={{ opacity: 1, x: 0 }}
    exit={motionOn ? { opacity: 0, x: -12 } : undefined} transition={{ duration: motionOn ? .35 : 0 }}>
    <div className="project-showcase-topline"><span>{record.sector === "university" ? "UNIVERSITY" : "CLIENT WORK"}</span>
      <div className="project-showcase-nav">
        <button type="button" aria-label="Close active world" onClick={onClose}><X size={15} /></button>
      </div>
    </div>
    <div className="satellite-index" aria-label={language === "en" ? "Sector projects" : "Project sektor"}>
      {records.map((item) => { const ItemIcon = item.icon; return <button type="button" aria-label={`Focus ${item.name}`} aria-pressed={item.id === record.id} title={item.name}
        key={item.id} style={{ "--world-color": item.color } as CSSProperties} onClick={() => onSelect(item.id)}><ItemIcon size={18} aria-hidden="true" /></button>; })}
    </div>
    <div className="project-showcase-identity"><span className="project-showcase-mark"><Icon size={24} /></span>
      <div><span>{record.access[language]}</span><h2>{record.name}</h2></div>
    </div>
    <p className="project-showcase-summary">{record.body}</p>
    <dl className="satellite-facts">
      <div><dt>{language === "en" ? "Ownership" : "Kontribusi"}</dt><dd>{record.ownership[language]}</dd></div>
      <div><dt>{language === "en" ? "Workflow" : "Alur"}</dt><dd>{flow}</dd></div>
      <div><dt>Output</dt><dd>{output}</dd></div>
    </dl>
    <div className="project-showcase-actions">
      <SiteLink href={`/projects/${findWorld(record.id)!.slug}?from=universe`} onClick={() => updateQuery({ world: record.id }, true)}>{language === "en" ? "Read project" : "Baca proyek"}<ArrowUpRight size={14} /></SiteLink>
      {record.sector === "university" && record.link
        ? <a href={record.link} target="_blank" rel="noreferrer">{language === "en" ? "View source" : "Lihat source"}<ArrowUpRight size={14} /></a>
        : record.sector === "client" && <a href="#contact">{language === "en" ? "Request walkthrough" : "Minta walkthrough"}<ArrowUpRight size={14} /></a>}
    </div>
  </motion.section>;
}

export function PortfolioExperience() {
  const { language, motionOn } = useSitePreferences();
  const query = useQuery();
  const returnWorld = query.get("world");
  const [activeId, setActiveId] = useState<ProjectId>("catmoji");
  const [activeSector, setActiveSector] = useState<Sector>("main");
  const [mapView, setMapView] = useState<"universe" | "orbit">("universe");
  const [activeSatellites, setActiveSatellites] = useState({ university: "rental" as SatelliteId, client: "yventures" as SatelliteId });
  const [activeCertificate, setActiveCertificate] = useState<(typeof certificates)[number] | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [methodStep, setMethodStep] = useState(0);
  const [worldlineStage, setWorldlineStage] = useState<WorldlineStage>("world");
  const [heroPhase, setHeroPhase] = useState("intro");
  const [showProjectShowcase, setShowProjectShowcase] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLElement>(null);
  const methodRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const stackVisible = useInView(stackRef, { margin: "150px" });
  const contactVisible = useInView(contactRef, { amount: .15 });
  const { scrollYProgress: contactProgress } = useScroll({ target: contactRef, offset: ["start 65%", "end end"] });
  const { scrollYProgress: methodProgress } = useScroll({ target: methodRef, offset: ["start 85%", "center center"] });
  const { scrollYProgress: worldlineProgress } = useScroll({ target: fieldRef, offset: ["start 72%", "end 30%"] });
  const methodY = useTransform(methodProgress, [0, 1], [42, 0]);
  const pointerX = useMotionValue(-100);
  const pointerY = useMotionValue(-100);
  const cursorX = useSpring(pointerX, { stiffness: 240, damping: 28, mass: 0.28 });
  const cursorY = useSpring(pointerY, { stiffness: 240, damping: 28, mass: 0.28 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const heroCopyY = useTransform(scrollYProgress, [0, 0.28], [0, -58]);
  const fieldScale = useTransform(scrollYProgress, [.18, .42], [.8, 1]);
  const fieldY = useTransform(scrollYProgress, [.18, .42], [52, 0]);
  const mapExitOpacity = useTransform(scrollYProgress, [.86, .98], [1, 0]);
  const mapExitY = useTransform(scrollYProgress, [.86, 1], [0, -44]);
  const stackStageRotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);
  const stackStageY = useTransform(scrollYProgress, [0, 1], [28, -22]);
  const stackStageScale = useTransform(scrollYProgress, [0, .45, 1], [.94, 1, .96]);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const phase = value < .18 ? "intro" : value < .32 ? "transition" : value < .92 ? "worlds" : "departing";
    setHeroPhase((previous) => previous === phase ? previous : phase);
  });
  useMotionValueEvent(methodProgress, "change", (value) => {
    const nextStep = value < 0.34 ? 0 : value < 0.68 ? 1 : 2;
    setMethodStep((previous) => previous === nextStep ? previous : nextStep);
  });
  useMotionValueEvent(worldlineProgress, "change", (value) => {
    const nextStage: WorldlineStage = value < 0.34 ? "world" : value < 0.68 ? "method" : "stack";
    setWorldlineStage((previous) => previous === nextStage ? previous : nextStage);
  });

  const t = copy[language];
  const activeMethodStep = motionOn ? methodStep : 2;
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];
  const sectorRecords = activeSector === "university" ? universityRecords : clientRecords;
  const activeSatellite = sectorRecords.find((record) => record.id === (activeSector === "university" ? activeSatellites.university : activeSatellites.client)) ?? sectorRecords[0];
  const focusedWorld = activeSector === "main" ? activeProject : activeSatellite;
  const visibleCertificates = certificates.filter(certificate => certificate.featuredOrder !== null);
  const spotlightPool = visibleCertificates.slice(0, Math.min(5, visibleCertificates.length));
  const spotlightCertificate = spotlightPool[spotlightIndex % Math.max(spotlightPool.length, 1)] ?? certificates[0];
  const shelfCertificates = visibleCertificates.filter((certificate) => certificate.title !== spotlightCertificate.title);

  useEffect(() => {
    const migrateLegacyFragment = () => {
      const fragment = window.location.hash.slice(1);
      const legacyRecord = /^(academic|client)-(\d+)$/.exec(fragment);
      const records = legacyRecord?.[1] === "academic" ? universityRecords : clientRecords;
      const world = legacyRecord ? findWorld(records[Number(legacyRecord[2]) - 1]?.id) : undefined;
      const category = fragment === "academic" ? "university" : fragment === "client-work" ? "client" : null;
      if (world || category) {
        const destination = new URL(world ? `/projects/${world.slug}` : "/projects", window.location.origin);
        if (category) destination.searchParams.set("category", category);
        const preferences = new URLSearchParams(window.location.search);
        for (const key of ["lang", "motion"]) if (preferences.has(key)) destination.searchParams.set(key, preferences.get(key)!);
        window.location.replace(destination.href);
        return;
      }
    };
    migrateLegacyFragment();
    window.addEventListener("hashchange", migrateLegacyFragment);
    return () => window.removeEventListener("hashchange", migrateLegacyFragment);
  }, []);

  useEffect(() => {
    let introSeen = false;
    try { introSeen = window.sessionStorage.getItem("henrylabs-intro-seen") === "1"; } catch { /* The introduction also works without storage. */ }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const replay = new URLSearchParams(window.location.search).get("intro") === "1";
    const directEntry = Boolean(window.location.hash || new URLSearchParams(window.location.search).get("world"));
    if ((introSeen || directEntry) && !replay || reduced) {
      setIntroDone(true);
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
    const timer = window.setTimeout(() => {
      setIntroDone(true);
    }, 1550);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (introDone) try { window.sessionStorage.setItem("henrylabs-intro-seen", "1"); } catch { /* Storage is optional. */ }
  }, [introDone]);


  useEffect(() => {
    const world = returnWorld ? findWorld(returnWorld) : undefined;
    if (!world || !introDone) return;
    setActiveSector(world.category === "henrylabs" ? "main" : world.category);
    if (world.category === "henrylabs") setActiveId(world.id as ProjectId);
    else setActiveSatellites(previous => ({ ...previous, [world.category]: world.id }));
    setMapView("orbit");
    // Wait for the restored route's layout before landing inside the sticky map.
    const frame = requestAnimationFrame(() => {
      const hero = heroRef.current;
      if (hero) window.scrollTo({ top: hero.offsetTop + Math.max(0, hero.offsetHeight - innerHeight) * .7, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [returnWorld, introDone]);

  useEffect(() => {
    if (!motionOn) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      document.documentElement.dataset.cursor = target?.closest(".site-header, h1, h2, h3, p, a, button, .signal-steps, .project-index") ? "quiet" : "visible";
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      delete document.documentElement.dataset.cursor;
    };
  }, [pointerX, pointerY, motionOn]);

  const focusProject = (id: ProjectId) => {
    setActiveId(id);
    setActiveSector("main");
    setMapView("orbit");
  };

  const focusStackProject = (label: string) => {
    const project = projects.find((candidate) => candidate.stack.includes(label));
    if (project) {
      setActiveId(project.id);
      setActiveSector("main");
      setMapView("orbit");
    }
  };

  const cycleProject = (direction: -1 | 1) => {
    const index = projects.findIndex((project) => project.id === activeId);
    setActiveId(projects[(index + direction + projects.length) % projects.length].id);
  };

  const selectSatellite = (id: SatelliteId) => {
    const sector = universityRecords.some((record) => record.id === id) ? "university" : "client";
    setActiveSatellites((previous) => ({ ...previous, [sector]: id }));
  };
  const focusOrbitWorld = (id: OrbitId) => {
    if (projects.some((project) => project.id === id)) focusProject(id as ProjectId);
    else selectSatellite(id as SatelliteId);
  };
  const cycleOrbitWorld = (direction: -1 | 1) => {
    if (activeSector === "main") cycleProject(direction);
    else {
      const index = sectorRecords.findIndex((record) => record.id === activeSatellite.id);
      selectSatellite(sectorRecords[(index + direction + sectorRecords.length) % sectorRecords.length].id);
    }
  };
  const enterGalaxy = (sector: GalaxyId) => {
    setActiveSector(sector);
    setMapView("orbit");
  };
  const returnToUniverse = () => {
    setShowProjectShowcase(false);
    setMapView("universe");
  };
  const openGalaxyMap = () => {
    const hero = heroRef.current;
    if (!hero) return;
    window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + Math.max(0, hero.offsetHeight - innerHeight) * .7, behavior: motionOn ? "smooth" : "instant" });
  };

  const cycleSpotlight = (direction: -1 | 1) => {
    if (spotlightPool.length < 2) return;
    setSpotlightIndex((index) => (index + direction + spotlightPool.length) % spotlightPool.length);
  };

  return (
    <MotionConfig reducedMotion={motionOn ? "never" : "always"} transition={{ duration: motionOn ? 0.55 : 0, ease: [0.16, 1, 0.3, 1] }}>
    <main className="site-shell" data-motion={motionOn ? "on" : "off"}>
      <SmoothScroll enabled={motionOn} />
      <WorldlineBackdrop activeId={activeProject.id} motionOn={motionOn} progress={worldlineProgress} contactProgress={contactProgress} contactVisible={contactVisible} mapActive={heroPhase === "worlds"} />
      <div className={cx("intro-loader", "arrival-intro", introDone && "intro-loader--done")} aria-hidden={introDone} inert={introDone}>
        <div className="arrival-content">
          <Asterisk className="arrival-mark" size={88} strokeWidth={.8} aria-hidden="true" />
          <strong>StarGod</strong>
          <span className="arrival-rule" aria-hidden="true" />
          <p>{language === "en" ? "Entering the universe" : "Memasuki semesta"}</p>
        </div>
        <button type="button" className="arrival-skip" onClick={() => setIntroDone(true)}>{language === "en" ? "Skip intro" : "Lewati intro"}<ArrowUpRight size={15} /></button>
      </div>

      <motion.div className="cursor-guide" style={{ x: cursorX, y: cursorY }} aria-hidden="true">
        <span>Henry</span><Asterisk size={10} />
      </motion.div>

      <section ref={heroRef} className="hero-stage" id="top" aria-labelledby="hero-title" data-phase={motionOn ? heroPhase : "all"}>
        <div className="space-backdrop" aria-hidden="true">
          <span className="star-field star-field--far" /><span className="star-field star-field--near" />
          <span className="star star-1" /><span className="star star-2" /><span className="star star-3" /><span className="star star-4" /><span className="star star-5" />
          <div className="backdrop-arc arc-one" /><div className="backdrop-arc arc-two" />
        </div>
        <div className="hero-sticky" onKeyDownCapture={(event) => {
          if (event.key !== "Escape" || !showProjectShowcase || document.querySelector('[role="dialog"]')) return;
          event.preventDefault();
          event.stopPropagation();
          setShowProjectShowcase(false);
          heroRef.current?.querySelector<HTMLElement>(".cosmic-canvas")?.focus({ preventScroll: true });
        }}>
          <motion.div className="hero-copy" inert={motionOn && heroPhase !== "intro"} style={{ y: motionOn ? heroCopyY : 0 }}>
            <p className="hero-kicker"><span className="live-pulse" /> product-minded developer / Indonesia</p>
            <h1 id="hero-title">{t.hero.title}</h1>
            <p className="hero-body">{t.hero.body}</p>
            <div className="hero-actions"><button type="button" className="button button-bright" onClick={openGalaxyMap}>{t.hero.work}<ArrowDown size={17} /></button><a className="button button-quiet" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer">{t.hero.contact}<ArrowUpRight size={17} /></a></div>
            <p className="hero-note"><span className="status-light" />{t.hero.note}</p>
          </motion.div>

          {mapView === "orbit" && <motion.button type="button" className="universe-return" style={{ opacity: motionOn ? mapExitOpacity : 1 }} inert={motionOn && heroPhase === "departing"} onClick={returnToUniverse} aria-label={language === "en" ? "Back to universe" : "Kembali ke semesta"} title={language === "en" ? "Back to universe" : "Kembali ke semesta"}><ArrowLeft size={16} /><span>{language === "en" ? "Universe" : "Semesta"}</span></motion.button>}
          <motion.div className="cosmic-frame-wrap" data-view={mapView} data-lenis-prevent={showProjectShowcase ? "true" : undefined} inert={motionOn && heroPhase !== "worlds"} style={{ scale: motionOn ? fieldScale : 1, y: motionOn ? fieldY : 0 }}>
            <motion.div className="map-departure" style={{ opacity: motionOn ? mapExitOpacity : 1, y: motionOn ? mapExitY : 0 }}>
            <div className="cosmic-frame" data-view={mapView} data-sector={activeSector} style={{ "--active-world-color": mapView === "universe" ? "#78cdbb" : focusedWorld.color } as CSSProperties}>
              <div className="frame-topline"><span>{t.field.label}</span><span>{mapView === "universe" ? "03 GALAXIES / 10 WORLDS" : `${focusedWorld.name} / ${activeSector === "main" ? activeProject.status[language] : activeSatellite.access[language]}`}</span></div>
              <CosmicCanvas activeId={activeSector === "main" ? activeId : activeSatellite.id} onSelect={focusOrbitWorld} onPrevious={() => cycleOrbitWorld(-1)} onNext={() => cycleOrbitWorld(1)} motionOn={motionOn} progress={scrollYProgress} techNodes={orbitTechNodes} satelliteCatalog={satelliteCatalog} sector={activeSector} view={mapView} language={language} readingOpen={showProjectShowcase} onGalaxySelect={enterGalaxy} onUniverse={returnToUniverse} />
              <AnimatePresence mode="wait" initial={false}>
                {mapView === "orbit" && (showProjectShowcase ? (activeSector === "main" ? <motion.section className="project-showcase" data-lenis-prevent key={activeProject.id} aria-label={`Active project: ${activeProject.name}`} style={{ "--project-showcase-color": activeProject.color } as CSSProperties} initial={motionOn ? { opacity: 0, x: 22 } : false} animate={{ opacity: 1, x: 0 }} exit={motionOn ? { opacity: 0, x: -16 } : undefined} transition={{ duration: motionOn ? .4 : 0, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="project-showcase-topline"><span>ACTIVE WORLD / {String(projects.findIndex((project) => project.id === activeProject.id) + 1).padStart(2, "0")}</span><button type="button" className="project-showcase-close" onClick={() => setShowProjectShowcase(false)} aria-label="Close active world" title="Close active world"><X size={13} /></button></div>
                  <div className="project-showcase-index" role="tablist" aria-label="Project worlds">{projects.map((project, index) => <button type="button" role="tab" aria-selected={activeId === project.id} className={cx(activeId === project.id && "is-active")} style={{ "--world-color": project.color } as CSSProperties} onClick={() => focusProject(project.id)} aria-label={`Focus ${project.name}`} title={project.name} key={project.id}><span className="project-showcase-index-mark"><img src={project.logo} alt="" /></span><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>
                  <div className="project-showcase-identity"><span className="project-showcase-mark"><img src={activeProject.logo} alt="" /></span><div><span>{activeProject.status[language]} · {activeProject.visibility[language]}</span><h2>{activeProject.name}</h2></div></div>
                  <p className="project-showcase-summary">{activeProject.summary[language]}</p>
                  <ProjectSignature project={activeProject} language={language} />
                  <div className="project-showcase-stack">{activeProject.stack.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
                  <div className="project-showcase-actions"><SiteLink href={`/projects/${activeProject.id}?from=universe`} onClick={() => updateQuery({ world: activeProject.id }, true)}>{language === "en" ? "Read project" : "Baca proyek"}<ArrowUpRight size={14} /></SiteLink><a href={activeProject.link} target={activeProject.link.startsWith("http") ? "_blank" : undefined} rel={activeProject.link.startsWith("http") ? "noreferrer" : undefined}>{t.field.open}<ArrowUpRight size={13} /></a></div>
                </motion.section> : <SatelliteReadout key={activeSatellite.id} record={activeSatellite} records={sectorRecords} language={language} motionOn={motionOn} onSelect={selectSatellite} onClose={() => setShowProjectShowcase(false)} />) : <motion.button className="project-showcase-reopen" type="button" key="reopen-project-showcase" onClick={() => setShowProjectShowcase(true)} aria-expanded="false" aria-label="Open active world"><span><PanelRightOpen size={15} /> Active world</span><small>{focusedWorld.name}</small></motion.button>)}
              </AnimatePresence>
              <div className="frame-bottomline"><span>{mapView === "universe" ? "03 galaxies / 10 worlds" : `${String(activeSector === "main" ? projects.length : sectorRecords.length).padStart(2, "0")} worlds / 01 maker`}</span><span>{mapView === "orbit" ? <><MousePointer2 size={13} /> {t.field.hint}</> : "HENRY NUGRAHA"}</span></div>
            </div>
            </motion.div>
          </motion.div>
        </div>
        <div className="hero-telemetry" aria-hidden="true"><span>FIELD STATUS <b>LIVE</b></span><span>WORLD COUNT <b>05</b></span><span>MAKER <b>01</b></span></div>
        <button type="button" className="scroll-cue" onClick={openGalaxyMap}><span>Scroll to enter</span><ArrowDown size={18} /></button>
      </section>

      <div ref={fieldRef} className="field-continuum" data-active-world={activeProject.id} data-worldline-stage={worldlineStage}>
      <motion.section ref={workRef} className="content-section work-section" id="work" aria-labelledby="work-title">
        <HomeProjectPreview project={findWorld(focusedWorld.id)!} />
      </motion.section>

      <section ref={methodRef}
        className="signal-chapter"
        id="method"
        aria-labelledby="method-title"
      >
        <div className="signal-inner">
          <div className="signal-layout">
            <div className="signal-heading">
              <p className="section-kicker section-kicker-dark">{t.method.kicker} <span className="worldline-context">/ {focusedWorld.name}</span></p>
              <motion.h2 id="method-title" style={{ y: motionOn ? methodY : 0 }}>{t.method.title.split("\n").map((line) => <span key={line}>{line}</span>)}</motion.h2>
            </div>
            <div className="signal-copy">
              <p>{t.method.body}</p>
              <div className="signal-steps" aria-label="The Henry method steps">
                <motion.span className="signal-progress" aria-hidden="true" style={{ scaleX: motionOn ? methodProgress : 1 }} />
                {t.method.steps.map((step, index) => <span key={step} className={index === activeMethodStep ? "signal-step--active" : undefined} aria-current={index === activeMethodStep ? "step" : undefined}>
                  <i>{String(index + 1).padStart(2, "0")}</i><strong>{step}</strong>
                  <small>{index === activeMethodStep ? "current signal" : "next useful move"}</small>
                </span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={stackRef} className="stack-section" id="stack" aria-labelledby="stack-title" data-visible={stackVisible}>
        <div className="content-section stack-intro"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Tech orbit <span className="worldline-context">/ {activeProject.name}</span></p><h2 id="stack-title">{t.stack.title}</h2></div><p>{t.stack.body}</p></div></div>
        <div className="maker-orbit content-section" aria-label="Technology stack orbit">
          <motion.div className="maker-orbit-stage" style={{ rotate: motionOn ? stackStageRotate : 0, y: motionOn ? stackStageY : 0, scale: motionOn ? stackStageScale : 1 }}>
            <span className="maker-orbit-path maker-orbit-path--build" aria-hidden="true" />
            <span className="maker-orbit-path maker-orbit-path--interface" aria-hidden="true" />
            <span className="maker-orbit-path maker-orbit-path--systems" aria-hidden="true" />
            <motion.div className="maker-core" data-active-world={activeProject.id} whileHover={motionOn ? { scale: 1.04, rotate: -2 } : undefined} transition={{ type: "spring", stiffness: 230, damping: 18 }}>
              <span className="maker-core-orbit-dot maker-core-orbit-dot--one" aria-hidden="true" />
              <span className="maker-core-orbit-dot maker-core-orbit-dot--two" aria-hidden="true" />
              <div className="maker-core-portrait" aria-hidden="true">
                <span className="maker-core-portrait-grid" />
                <span className="maker-core-mark"><Asterisk size={25} /></span>
                <span className="maker-core-portrait-scan" />
                <small>MAKER SIGNAL / {String(activeProject.stack.length).padStart(2, "0")}</small>
              </div>
              <span className="maker-core-meta">HENRY / MAKER</span>
              <strong>one point<br /><em>of view.</em></strong>
              <small>{activeProject.name} · {activeProject.stack.length} linked signals</small>
            </motion.div>
            {stackGroups.map((group, groupIndex) => <div className={cx("maker-orbit-track", `maker-orbit-track--${groupIndex + 1}`)} key={group.label}>{group.items.map(([label, slug, color], itemIndex) => { const linkedProject = projects.find((project) => project.stack.includes(label)); const linked = activeProject.stack.includes(label); return <button type="button" className={cx("maker-tech", linked && "is-linked", !linkedProject && "is-unmapped")} style={{ "--node-angle": `${itemIndex * (360 / group.items.length)}deg`, "--node-color": `#${color}` } as React.CSSProperties} key={label} title={linkedProject ? `${label} · ${linkedProject.name}` : label} aria-pressed={linked} aria-label={linkedProject ? `Focus ${linkedProject.name} through ${label}` : label} disabled={!linkedProject} onClick={() => focusStackProject(label)}><span className="maker-tech-icon"><TechIcon label={label} slug={slug} color={color} /></span><b>{label}</b></button>; })}</div>)}
          </motion.div>
          <div className="maker-orbit-legend">{stackGroups.map((group, groupIndex) => <span key={group.label}><i>{String(groupIndex + 1).padStart(2, "0")}</i>{group.label}</span>)}<p>One orbit. Three ways to make.</p></div>
          <motion.div className="maker-orbit-inspector" key={activeProject.id} style={{ "--inspector-color": activeProject.color } as React.CSSProperties} initial={motionOn ? { opacity: .45, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionOn ? .35 : 0, ease: [0.16, 1, 0.3, 1] }} aria-live="polite"><div><span>ACTIVE LINK</span><strong>{activeProject.name}</strong><small>{activeProject.access[language]} · {activeProject.stack.length} signals</small></div><div className="maker-orbit-inspector-stack">{activeProject.stack.map((item) => <span key={item}>{item}</span>)}</div></motion.div>
        </div>
        <div className="stack-foot content-section"><span><Brackets size={19} /> from interface to systems</span><span><Zap size={19} /> motion with a reason</span><span><Code2 size={19} /> honest about the state</span></div>
      </section>
      </div>



      <section className="content-section proof-section" id="proof" aria-labelledby="proof-title">
        <div className="section-heading"><div><p className="section-kicker">Credentials / 05 featured</p><h2 id="proof-title">{t.proof.title}</h2></div><p>{t.proof.body}</p></div>
        <SiteLink className="library-text-link" href="/credentials">{language === "en" ? "All 26 credentials" : "Semua 26 kredensial"}<ArrowUpRight size={17} /></SiteLink>
        <div className="certificate-feature certificate-card">
          <button type="button" className="certificate-feature-preview" onClick={() => { setActiveCertificate(spotlightCertificate); }} aria-label={`Inspect ${spotlightCertificate.title} certificate`}>
            {spotlightPool.slice(1, 4).map((certificate, index) => <span className={cx("certificate-feature-ghost", `certificate-feature-ghost--${index + 1}`)} key={certificate.title} aria-hidden="true"><img src={certificate.thumbnail} alt="" /></span>)}
            <AnimatePresence mode="wait" initial={false}><motion.img key={spotlightCertificate.title} src={spotlightCertificate.thumbnail} alt={spotlightCertificate.alt} initial={motionOn ? { opacity: 0, x: 28, rotate: 3 } : false} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={motionOn ? { opacity: 0, x: -22, rotate: -3 } : undefined} transition={{ duration: motionOn ? .42 : 0, ease: [0.22, 1, .36, 1] }} /></AnimatePresence>
            <span className="certificate-index">{String((spotlightPool.indexOf(spotlightCertificate) + 1).toString().padStart(2, "0"))} / FEATURED RECORD</span><span className="certificate-view">inspect full <ArrowUpRight size={13} /></span>
          </button>
          <div className="certificate-feature-copy"><div className="certificate-meta"><span>{spotlightCertificate.issuer}</span><span>{spotlightCertificate.kind}</span></div><div className="certificate-feature-title"><h3>{spotlightCertificate.title}</h3><div className="certificate-feature-switcher"><span>{String(spotlightPool.indexOf(spotlightCertificate) + 1).padStart(2, "0")} / {String(spotlightPool.length).padStart(2, "0")}</span><button type="button" onClick={() => cycleSpotlight(-1)} aria-label="Previous featured credential"><ChevronLeft size={15} /></button><button type="button" onClick={() => cycleSpotlight(1)} aria-label="Next featured credential"><ChevronRight size={15} /></button></div></div><p>One original record from the shelf, kept large enough to read and specific enough to trust.</p><div className="certificate-feature-specs"><span><small>Issued</small><strong>{spotlightCertificate.date}</strong></span><span><small>{language === "en" ? "Featured" : "Pilihan"}</small><strong>{String(visibleCertificates.length).padStart(2, "0")} visible</strong></span></div><button type="button" className="certificate-feature-open" onClick={() => { setActiveCertificate(spotlightCertificate); }}>Open the record <ArrowUpRight size={15} /></button>{spotlightCertificate.source && <a className="certificate-feature-source" href={spotlightCertificate.source} target="_blank" rel="noreferrer">Source PDF <ArrowUpRight size={13} /></a>}</div>
        </div>
        <div className="certificate-shelf certificate-shelf--compact"><AnimatePresence initial={false} mode="popLayout">{shelfCertificates.map((certificate, index) => <motion.article layout className="certificate-card" key={certificate.title} initial={motionOn ? { opacity: 0, y: 26, scale: .98 } : false} whileInView={motionOn ? { opacity: 1, y: 0, scale: 1 } : undefined} viewport={{ once: false, amount: .18, margin: "0px 0px -8% 0px" }} exit={motionOn ? { opacity: 0, y: -14, scale: .96 } : undefined} transition={{ duration: motionOn ? .42 : 0, delay: motionOn ? (index % 3) * .045 : 0, ease: [0.22, 1, .36, 1] }}><button type="button" className="certificate-preview" onClick={() => { setActiveCertificate(certificate); }} aria-label={`Inspect ${certificate.title} certificate`}><img src={certificate.thumbnail} alt={certificate.alt} loading="lazy" /><span className="certificate-index">{String(index + 2).padStart(2, "0")}</span><span className="certificate-view">inspect full <ArrowUpRight size={13} /></span></button><div className="certificate-copy"><div className="certificate-meta"><span>{certificate.issuer}</span><span>{certificate.kind}</span></div><h3>{certificate.title}</h3><div className="certificate-foot"><span>{certificate.date}</span>{certificate.source ? <a href={certificate.source} target="_blank" rel="noreferrer">Source PDF <ArrowUpRight size={13} /></a> : <span className="certificate-muted">Original image</span>}</div></div></motion.article>)}</AnimatePresence></div>
      </section>

      <CredentialViewer record={activeCertificate} onClose={() => setActiveCertificate(null)} />

      <section ref={contactRef} className="contact-section" id="contact" aria-labelledby="contact-title"><div className="content-section contact-content"><div><p className="section-kicker section-kicker-dark">Make the next useful thing</p><h2 id="contact-title">{t.contact.title}</h2></div><div className="contact-copy"><p>{t.contact.body}</p><div className="contact-actions"><a className="button button-bright" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp <ArrowUpRight size={16} /></a><a className="button button-outline" href="mailto:henrynugraha1210@gmail.com"><Mail size={18} /> Email <ArrowUpRight size={16} /></a></div><div className="social-links"><a href="https://github.com/nugrahahenry" target="_blank" rel="noreferrer"><Github size={19} /> GitHub</a><a href="https://www.linkedin.com/in/nugrahahenry/" target="_blank" rel="noreferrer"><Linkedin size={19} /> LinkedIn</a><a href="https://instagram.com/hnry.dev" target="_blank" rel="noreferrer"><Instagram size={19} /> @hnry.dev</a></div></div></div></section>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><Asterisk size={18} /></span><span>StarGod</span></a><span>{t.footer}</span><span>© 2026</span></footer>
    </main>
    </MotionConfig>
  );
}
