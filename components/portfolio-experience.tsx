"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  CarFront,
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
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { CosmicCanvas, type OrbitId, type ProjectId, type SatelliteId, type SatelliteWorld } from "./cosmic-canvas";
import { SmoothScroll } from "./smooth-scroll";
import { WorldlineBackdrop } from "./worldline-backdrop";
import type { GalaxyId } from "./galaxy-system";

import { projects, academicProjects as academicData, clientProjects as clientData, clientStacks, type Language } from "@/content/projects";
import { orbitTechNodes } from "@/content/technologies";
import { HomeProjectPreview } from "./home-project-preview";
import { findWorld } from "@/content/catalog";
import { SiteLink, useSitePreferences, useQuery, updateQuery } from "./site-preferences";
import { MakerChapter } from "./maker-chapter";
import { StarGodMark } from "./stargod-mark";
import { UNIVERSE_CHAPTER as chapter, universeLanding, chapterBlend } from "./universe-chapter";

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
  const returnUniverse = query.get("view") === "universe";
  const [activeId, setActiveId] = useState<ProjectId>("catmoji");
  const [activeSector, setActiveSector] = useState<Sector>("main");
  const [mapView, setMapView] = useState<"universe" | "orbit">("universe");
  const [activeSatellites, setActiveSatellites] = useState({ university: "rental" as SatelliteId, client: "yventures" as SatelliteId });
  const [introDone, setIntroDone] = useState(false);
  const [worldlineStage, setWorldlineStage] = useState<WorldlineStage>("world");
  const [heroPhase, setHeroPhase] = useState("intro");
  const [showProjectShowcase, setShowProjectShowcase] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const contactVisible = useInView(contactRef, { amount: .15 });
  const { scrollYProgress: contactProgress } = useScroll({ target: contactRef, offset: ["start 65%", "end end"] });
  const { scrollYProgress: worldlineProgress } = useScroll({ target: fieldRef, offset: ["start 72%", "end 30%"] });
  const pointerX = useMotionValue(-100);
  const pointerY = useMotionValue(-100);
  const cursorX = useSpring(pointerX, { stiffness: 240, damping: 28, mass: 0.28 });
  const cursorY = useSpring(pointerY, { stiffness: 240, damping: 28, mass: 0.28 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  // Function transforms keep sticky DOM and Three.js on the same JS scroll clock.
  // Native ViewTimeline acceleration otherwise interpolates outside this window.
  const heroCopyY = useTransform(scrollYProgress, p => -58 * chapterBlend(p, 0, .28));
  const fieldScale = useTransform(scrollYProgress, p => .88 + .12 * chapterBlend(p, chapter.entry, chapter.settled));
  const fieldY = useTransform(scrollYProgress, p => 40 * (1 - chapterBlend(p, chapter.entry, chapter.settled)));
  const mapEntryOpacity = useTransform(scrollYProgress, p => chapterBlend(p, chapter.entry, chapter.visible));
  const mapExitOpacity = useTransform(scrollYProgress, p => 1 - chapterBlend(p, chapter.departure, chapter.hidden));
  const mapExitY = useTransform(scrollYProgress, p => -44 * chapterBlend(p, chapter.departure, 1));
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const phase = value < chapter.entry ? "intro" : value < chapter.visible ? "transition" : value < chapter.departure ? "worlds" : "departing";
    setHeroPhase((previous) => previous === phase ? previous : phase);
  });
  useMotionValueEvent(worldlineProgress, "change", (value) => {
    const nextStage: WorldlineStage = value < 0.34 ? "world" : value < 0.68 ? "method" : "stack";
    setWorldlineStage((previous) => previous === nextStage ? previous : nextStage);
  });

  const t = copy[language];
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];
  const sectorRecords = activeSector === "university" ? universityRecords : clientRecords;
  const activeSatellite = sectorRecords.find((record) => record.id === (activeSector === "university" ? activeSatellites.university : activeSatellites.client)) ?? sectorRecords[0];
  const focusedWorld = activeSector === "main" ? activeProject : activeSatellite;

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
    const directEntry = Boolean(window.location.hash || new URLSearchParams(window.location.search).get("world") || new URLSearchParams(window.location.search).get("view") === "universe");
    if ((introSeen || directEntry) && !replay || reduced) {
      setIntroDone(true);
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
    const timer = window.setTimeout(() => {
      setIntroDone(true);
    }, 1250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (introDone) try { window.sessionStorage.setItem("henrylabs-intro-seen", "1"); } catch { /* Storage is optional. */ }
  }, [introDone]);


  useEffect(() => {
    const world = returnWorld ? findWorld(returnWorld) : undefined;
    if ((!world && !returnUniverse) || !introDone) return;
    if (world) {
      setActiveSector(world.category === "henrylabs" ? "main" : world.category);
      if (world.category === "henrylabs") setActiveId(world.id as ProjectId);
      else setActiveSatellites(previous => ({ ...previous, [world.category]: world.id }));
    }
    setMapView(world ? "orbit" : "universe");
    // Wait for the restored route's layout before landing inside the sticky map.
    const frame = requestAnimationFrame(() => {
      const hero = heroRef.current;
      if (!hero) return;
      const top = motionOn ? universeLanding(hero.offsetTop, hero.offsetHeight, innerHeight) : hero.offsetTop + (hero.querySelector<HTMLElement>(".cosmic-frame-wrap")?.offsetTop ?? 0) - 84;
      window.scrollTo({ top, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [returnWorld, returnUniverse, introDone, motionOn]);

  useEffect(() => {
    if (!motionOn) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      document.documentElement.dataset.cursor = target?.closest(".site-header, h1, h2, h3, p, a, button, .portrait-reveal, .signal-steps, .project-index") ? "quiet" : "visible";
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
    const hero = heroRef.current;
    if (hero && motionOn) window.scrollTo({ top: universeLanding(hero.offsetTop, hero.offsetHeight, innerHeight), behavior: "smooth" });
  };
  const openGalaxyMap = () => {
    const hero = heroRef.current;
    if (!hero) return;
    setShowProjectShowcase(false);
    setMapView("universe");
    const top = motionOn ? universeLanding(hero.offsetTop, hero.offsetHeight, innerHeight) : hero.offsetTop + (hero.querySelector<HTMLElement>(".cosmic-frame-wrap")?.offsetTop ?? 0) - 84;
    window.scrollTo({ top, behavior: motionOn ? "smooth" : "instant" });
  };

  return (
    <MotionConfig reducedMotion={motionOn ? "never" : "always"} transition={{ duration: motionOn ? 0.55 : 0, ease: [0.16, 1, 0.3, 1] }}>
    <main className="site-shell" data-motion={motionOn ? "on" : "off"}>
      <SmoothScroll enabled={motionOn} />
      <WorldlineBackdrop activeId={activeProject.id} motionOn={motionOn} progress={worldlineProgress} contactProgress={contactProgress} contactVisible={contactVisible} mapActive={heroPhase === "worlds"} />
      <div className={cx("intro-loader", "arrival-intro", introDone && "intro-loader--done")} aria-hidden={introDone} inert={introDone}>
        <div className="arrival-content">
          <StarGodMark className="arrival-mark" size={88} />
          <strong>StarGod</strong>
          <span className="arrival-rule" aria-hidden="true" />
          <p>{language === "en" ? "Entering the universe" : "Memasuki semesta"}</p>
        </div>
        <button type="button" className="arrival-skip" onClick={() => setIntroDone(true)}>{language === "en" ? "Skip intro" : "Lewati intro"}<ArrowUpRight size={15} /></button>
      </div>

      <motion.div className="cursor-guide" style={{ x: cursorX, y: cursorY }} aria-hidden="true">
        <span>Henry</span><StarGodMark size={14} />
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

          {mapView === "orbit" && <motion.button type="button" className="universe-return" style={{ opacity: motionOn ? mapExitOpacity : 1 }} inert={motionOn && heroPhase !== "worlds"} onClick={returnToUniverse} aria-label={language === "en" ? "Back to universe" : "Kembali ke semesta"} title={language === "en" ? "Back to universe" : "Kembali ke semesta"}><ArrowLeft size={16} /><StarGodMark size={20} /><span>{language === "en" ? "Universe" : "Semesta"}</span></motion.button>}
          <motion.div className="cosmic-frame-wrap" data-view={mapView} data-lenis-prevent={showProjectShowcase ? "true" : undefined} inert={motionOn && heroPhase !== "worlds"} style={{ opacity: motionOn ? mapEntryOpacity : 1, scale: motionOn ? fieldScale : 1, y: motionOn ? fieldY : 0 }}>
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

      <div className="maker-approach" aria-hidden="true" />
      <MakerChapter />
      </div>

      <section ref={contactRef} className="contact-section" id="contact" aria-labelledby="contact-title"><div className="content-section contact-content"><div><p className="section-kicker section-kicker-dark">Make the next useful thing</p><h2 id="contact-title">{t.contact.title}</h2></div><div className="contact-copy"><p>{t.contact.body}</p><div className="contact-actions"><a className="button button-bright" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp <ArrowUpRight size={16} /></a><a className="button button-outline" href="mailto:henrynugraha1210@gmail.com"><Mail size={18} /> Email <ArrowUpRight size={16} /></a></div><div className="social-links"><a href="https://github.com/nugrahahenry" target="_blank" rel="noreferrer"><Github size={19} /> GitHub</a><a href="https://www.linkedin.com/in/nugrahahenry/" target="_blank" rel="noreferrer"><Linkedin size={19} /> LinkedIn</a><a href="https://instagram.com/hnry.dev" target="_blank" rel="noreferrer"><Instagram size={19} /> @hnry.dev</a></div></div></div></section>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><StarGodMark /></span><span>StarGod</span></a><span>{t.footer}</span><span>© 2026</span></footer>
    </main>
    </MotionConfig>
  );
}
