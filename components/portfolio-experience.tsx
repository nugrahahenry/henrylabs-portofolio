"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Brackets,
  Code2,
  Command,
  Github,
  Instagram,
  Mail,
  Menu,
  MessageCircle,
  MousePointer2,
  Sparkles,
  Zap,
} from "lucide-react";
import { MotionConfig, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { CosmicCanvas, type ProjectId } from "./cosmic-canvas";

type Language = "en" | "id";

const projects: Array<{
  id: ProjectId;
  name: string;
  logo: string;
  color: string;
  status: Record<Language, string>;
  visibility: Record<Language, string>;
  summary: Record<Language, string>;
  flow: Record<Language, string[]>;
  link: string;
  linkLabel: Record<Language, string>;
  role: Record<Language, string>;
  signal: Record<Language, string>;
  year: string;
}> = [
  {
    id: "catmoji",
    name: "Catmoji",
    logo: "/assets/brand/catmoji.png",
    color: "#ee674f",
    status: { en: "Live", id: "Live" },
    visibility: { en: "Public product", id: "Produk publik" },
    summary: {
      en: "A playful browser product that turns a hand gesture into emotion, a cat sticker, and a voice.",
      id: "Produk browser playful yang mengubah gesture tangan menjadi emosi, stiker kucing, dan suara.",
    },
    flow: { en: ["Hand gesture", "Emotion", "Cat sticker + voice"], id: ["Gesture tangan", "Emosi", "Stiker kucing + suara"] },
    link: "https://catmoji.vercel.app/",
    linkLabel: { en: "Open live product", id: "Buka produk live" },
    role: { en: "Product / interaction", id: "Produk / interaksi" },
    signal: { en: "Playful input", id: "Input playful" },
    year: "2026",
  },
  {
    id: "nalira",
    name: "Nalira",
    logo: "/assets/brand/nalira.svg",
    color: "#60c9b0",
    status: { en: "MVP", id: "MVP" },
    visibility: { en: "Public MVP", id: "MVP publik" },
    summary: {
      en: "An audio-to-knowledge workflow for turning lectures, meetings, and ideas into material you can revisit.",
      id: "Workflow audio-to-knowledge untuk mengubah kuliah, meeting, dan ide menjadi materi yang bisa dipelajari ulang.",
    },
    flow: { en: ["Audio", "Structured knowledge", "Contextual chat"], id: ["Audio", "Knowledge terstruktur", "Chat kontekstual"] },
    link: "https://nalira-hengs.vercel.app/dashboard",
    linkLabel: { en: "Open MVP", id: "Buka MVP" },
    role: { en: "Product / AI workflow", id: "Produk / workflow AI" },
    signal: { en: "Make knowledge usable", id: "Bikin knowledge berguna" },
    year: "2026",
  },
  {
    id: "canox",
    name: "Canox",
    logo: "/assets/brand/canox.png",
    color: "#657be8",
    status: { en: "Private build", id: "Build privat" },
    visibility: { en: "Private system", id: "Sistem privat" },
    summary: {
      en: "A personal AI cockpit connecting Henry’s tools, context, and everyday workflows.",
      id: "Cockpit AI personal yang menghubungkan tools, konteks, dan workflow sehari-hari Henry.",
    },
    flow: { en: ["Personal context", "AI tools", "Next action"], id: ["Konteks personal", "Tools AI", "Aksi berikutnya"] },
    link: "https://wa.me/6289513559554",
    linkLabel: { en: "Request a demo", id: "Minta demo" },
    role: { en: "System / personal AI", id: "Sistem / AI personal" },
    signal: { en: "Context is the interface", id: "Konteks adalah interface" },
    year: "2026",
  },
  {
    id: "hengs",
    name: "Hengs",
    logo: "/assets/brand/hengs.png",
    color: "#efc95f",
    status: { en: "Live system", id: "Sistem live" },
    visibility: { en: "Private evidence", id: "Bukti privat" },
    summary: {
      en: "A WhatsApp focus assistant and Discord community bot designed around calmer communication and useful handoffs.",
      id: "Asisten fokus WhatsApp dan bot komunitas Discord untuk komunikasi lebih tenang dan handoff yang berguna.",
    },
    flow: { en: ["Message", "Context", "Useful handoff"], id: ["Pesan", "Konteks", "Handoff berguna"] },
    link: "mailto:henrynugraha1210@gmail.com",
    linkLabel: { en: "Discuss this build", id: "Bahas build ini" },
    role: { en: "Automation / safety", id: "Automation / safety" },
    signal: { en: "Calmer communication", id: "Komunikasi lebih tenang" },
    year: "2026",
  },
  {
    id: "polara",
    name: "Polara",
    logo: "/assets/brand/polara.png",
    color: "#a96ba9",
    status: { en: "In progress", id: "Dalam proses" },
    visibility: { en: "Creative web experience", id: "Pengalaman web kreatif" },
    summary: {
      en: "A browser-based digital photobooth where the interface becomes part of the memory.",
      id: "Photobooth digital berbasis browser ketika interface-nya sendiri menjadi bagian dari kenangan.",
    },
    flow: { en: ["Frame", "Play", "Keep the moment"], id: ["Frame", "Bermain", "Simpan momen"] },
    link: "mailto:henrynugraha1210@gmail.com",
    linkLabel: { en: "Discuss the experience", id: "Bahas experience ini" },
    role: { en: "Creative web / camera", id: "Web kreatif / kamera" },
    signal: { en: "Interface as memory", id: "Interface jadi memori" },
    year: "2026",
  },
];

const copy = {
  en: {
    nav: { work: "Work", stack: "Stack", proof: "Proof", contact: "Contact" },
    loading: ["Calibrating the field", "Waking project identities", "Mapping useful worlds", "Almost ready"],
    hero: {
      title: "I build things I actually see.",
      body: "Product-minded developer turning everyday friction into useful systems, playful interfaces, and honest experiments.",
      work: "Explore the work",
      contact: "Start a project",
      note: "Open to thoughtful freelance work and the right team.",
    },
    field: { label: "A living map of HenryLabs", hint: "Drag the field · select a world" },
    method: {
      kicker: "The Henry method",
      title: "Notice the friction.\nShape the useful.",
      body: "The best interface starts before the interface. I look for the awkward handoff, the missing context, and the tiny moment that should feel easier.",
      steps: ["See the friction", "Make the system legible", "Ship the next useful move"],
      marker: "SIGNAL / 01",
    },
    work: { title: "The work, in context.", body: "Every world starts with a real friction. Select a planet to see the problem, the flow, and the honest state of the build." },
    stack: { title: "The instruments behind the worlds.", body: "A flexible stack for moving from interface to workflow, from a classroom idea to a system people can actually use." },
    academic: { title: "Built while learning.", body: "University projects where I owned the system end to end: business flows, mobile and web interfaces, and the logic underneath." },
    client: { title: "Work with real stakes.", body: "Private client work is represented as sanitized evidence: what I owned, what I shipped, and where collaboration mattered." },
    proof: { title: "Proof, kept human.", body: "A curated shelf of real learning records, competition results, and community work. Open the original whenever the detail matters." },
    contact: { title: "Have something useful in mind?", body: "Tell me what is unclear, slow, or still waiting to be built. I am open to thoughtful freelance projects and teams that care about details." },
    footer: "built by Henry",
  },
  id: {
    nav: { work: "Karya", stack: "Stack", proof: "Bukti", contact: "Kontak" },
    loading: ["Mengkalibrasi ruang", "Membangunkan identitas project", "Memetakan useful worlds", "Hampir siap"],
    hero: {
      title: "Aku membangun hal yang benar-benar kulihat.",
      body: "Developer product-minded yang mengubah rasa penasaran sehari-hari menjadi sistem berguna, interface playful, dan eksperimen jujur.",
      work: "Jelajahi karya",
      contact: "Mulai project",
      note: "Terbuka untuk project freelance dan tim yang tepat.",
    },
    field: { label: "Peta hidup HenryLabs", hint: "Geser field · pilih sebuah dunia" },
    method: {
      kicker: "Cara kerja Henry",
      title: "Lihat friksinya.\nBentuk yang berguna.",
      body: "Interface yang baik dimulai sebelum interface. Aku mencari handoff yang canggung, konteks yang hilang, dan momen kecil yang seharusnya terasa lebih mudah.",
      steps: ["Lihat friksinya", "Buat sistemnya terbaca", "Kirim langkah berguna berikutnya"],
      marker: "SIGNAL / 01",
    },
    work: { title: "Karya, dengan konteks.", body: "Setiap dunia dimulai dari masalah nyata. Pilih planet untuk melihat masalah, alur, dan status build secara jujur." },
    stack: { title: "Instrumen di balik semua dunia.", body: "Stack yang fleksibel untuk bergerak dari interface ke workflow, dari ide kuliah menjadi sistem yang benar-benar bisa dipakai." },
    academic: { title: "Dibuat sambil belajar.", body: "Project kuliah yang kubangun sendiri dari awal sampai akhir: alur bisnis, interface mobile dan web, serta logika di baliknya." },
    client: { title: "Project dengan konsekuensi nyata.", body: "Client work privat ditampilkan sebagai bukti yang sudah disanitasi: bagian yang kupegang, yang kubuat, dan kapan kolaborasi diperlukan." },
    proof: { title: "Bukti, tetap manusiawi.", body: "Rak pilihan berisi sertifikat, hasil kompetisi, dan kontribusi komunitas yang asli. Buka dokumen sumber saat detailnya penting." },
    contact: { title: "Ada sesuatu yang ingin dibuat berguna?", body: "Ceritakan hal yang masih membingungkan, lambat, atau belum sempat dibangun. Aku terbuka untuk project freelance dan tim yang peduli pada detail." },
    footer: "dibuat oleh Henry",
  },
} as const;

const stackGroups = [
  { label: "Build", items: [["JavaScript", "javascript", "f7df1e"], ["Python", "python", "3776ab"], ["Java", "openjdk", "437291"], ["C#", "csharp", "512bd4"], ["PHP", "php", "777bb4"]] },
  { label: "Interface", items: [["React", "react", "61dafb"], ["Next.js", "nextdotjs", "ffffff"], ["HTML", "html5", "e34f26"], ["CSS", "css3", "1572b6"]] },
  { label: "Systems", items: [["Node.js", "nodedotjs", "339933"], ["n8n", "n8n", "ea4b71"], ["OpenAI", "openai", "ffffff"], ["Laravel", "laravel", "ff2d20"]] },
];

const stackOrbitItems = stackGroups.flatMap((group) => group.items).map(([label, slug, color], index) => ({ label, slug, color, index }));

const chapters = [
  { id: "method", number: "01", label: "Method" },
  { id: "work", number: "02", label: "Worlds" },
  { id: "stack", number: "03", label: "Stack" },
  { id: "proof", number: "04", label: "Proof" },
] as const;

const academicProjects = [
  { title: "RentalMobil.SG", tag: "OOP · Semester 2", body: "A car-rental web system with vehicle catalog, authentication, booking, payment confirmation, user area, and admin operations." },
  { title: "POS Z Shoes", tag: "APBDS · Semester 3", body: "A point-of-sale system with product, supplier, purchase, customer transaction, return, dashboard, and reporting flows." },
  { title: "LabQ", tag: "Mobile & Web · Semester 4", body: "A digital health laboratory platform connecting patients, lab staff, and admins from registration to test results." },
];

const certificates = [
  { title: "Gemini Certified Educator", issuer: "Google", kind: "Certification", date: "18 Apr 2026", image: "/assets/certificates/previews/gemini-certified-educator.png", source: "/assets/certificates/source/gemini-certified-educator.pdf", alt: "Gemini Certified Educator certificate for Henry Nugraha" },
  { title: "Gemini Certified Student", issuer: "Google", kind: "Certification", date: "08 Apr 2026", image: "/assets/certificates/previews/gemini-certified.png", source: "/assets/certificates/source/gemini-certified.pdf", alt: "Gemini Certified Student certificate for Henry Nugraha" },
  { title: "Class of 2026 Graduation", issuer: "Google Student Ambassador", kind: "Community", date: "Class of 2026", image: "/assets/certificates/previews/google-student-ambassador.png", source: "/assets/certificates/source/google-student-ambassador.pdf", alt: "Google Student Ambassador Class of 2026 graduation certificate for Henry Nugraha" },
  { title: "TechSprint Web Development", issuer: "Codelab Indonesia", kind: "Competition", date: "Date not shown", image: "/assets/certificates/previews/codelab-techsprint-web-development.png", source: "/assets/certificates/source/codelab-techsprint-web-development.pdf", alt: "TechSprint Innovation Cup Web Development certificate for Henry Nugraha" },
  { title: "Belajar Prinsip Pemrograman SOLID", issuer: "Dicoding Academy", kind: "Course", date: "30 Apr 2026", image: "/assets/certificates/previews/dicoding-oop.png", source: "/assets/certificates/source/dicoding-oop.pdf", alt: "Dicoding certificate for learning SOLID programming principles" },
  { title: "Top 10 Finalist RBCA", issuer: "IMPACT / Retail Business Case Analysis", kind: "Competition", date: "Date not shown", image: "/assets/certificates/previews/top-ten-rbca.jpeg", alt: "Top 10 Finalist Retail Business Case Analysis certificate for Henry Nugraha" },
  { title: "Google Workspace for Education Fundamentals", issuer: "Google for Education", kind: "Credential", date: "Date not shown", image: "/assets/certificates/previews/google-for-education.png", source: "/assets/certificates/source/google-for-education.pdf", alt: "Google Workspace for Education Fundamentals credential for Henry Nugraha" },
  { title: "Build Your First Agent with ADK", issuer: "Google Skills", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-build-first-agent.png", alt: "Google Skills badge for Build Your First Agent with Agent Development Kit" },
];

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

function PhaseBridge({ tone, motionOn }: { tone: "method" | "work" | "stack" | "academic" | "proof"; motionOn: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-24, 24]);
  const labels = { method: "follow the signal", work: "select a world", stack: "read the instruments", academic: "keep learning", proof: "show the receipt" };
  return <div ref={ref} className={`phase-bridge phase-bridge--${tone}`} aria-hidden="true">
    <motion.img className="phase-bridge-atmosphere" src="/assets/background/cosmic-nebula.png" alt="" loading="lazy" style={{ y: motionOn ? y : 0 }} />
    <span className="phase-bridge-orbit" />
    <span className="phase-bridge-spark phase-bridge-spark--one" />
    <span className="phase-bridge-spark phase-bridge-spark--two" />
    <span className="phase-bridge-spark phase-bridge-spark--three" />
    <span className="phase-bridge-caption">{labels[tone]} <ArrowDown size={13} /></span>
    {tone === "work" && <div className="phase-bridge-worlds">{projects.map((project) => <span className="phase-bridge-world" key={project.id}><img src={project.logo} alt="" /></span>)}</div>}
  </div>;
}

export function PortfolioExperience() {
  const [language, setLanguage] = useState<Language>("en");
  const [activeId, setActiveId] = useState<ProjectId>("catmoji");
  const [introDone, setIntroDone] = useState(false);
  const [motionPreference, setMotionPreference] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [activeChapter, setActiveChapter] = useState<(typeof chapters)[number]["id"]>("method");
  const [methodStep, setMethodStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const motionOn = motionReady && motionPreference && !reducedMotion;
  const [loadingStep, setLoadingStep] = useState(0);
  const [heroPhase, setHeroPhase] = useState("intro");
  const heroRef = useRef<HTMLElement>(null);
  const methodRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const stackVisible = useInView(stackRef, { margin: "150px" });
  const { scrollYProgress: methodProgress } = useScroll({ target: methodRef, offset: ["start start", "end start"] });
  const methodY = useTransform(methodProgress, [0, 1], [42, 0]);
  const methodImageY = useTransform(methodProgress, [0, 1], [-36, 0]);
  const pointerX = useMotionValue(-100);
  const pointerY = useMotionValue(-100);
  const cursorX = useSpring(pointerX, { stiffness: 240, damping: 28, mass: 0.28 });
  const cursorY = useSpring(pointerY, { stiffness: 240, damping: 28, mass: 0.28 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const heroCopyY = useTransform(scrollYProgress, [0, 0.28], [0, -58]);
  const fieldScale = useTransform(scrollYProgress, [0.32, 0.65], [0.8, 1]);
  const fieldY = useTransform(scrollYProgress, [0.32, 0.65], [52, 0]);
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const phase = value < 0.28 ? "intro" : value < 0.5 ? "transition" : "worlds";
    setHeroPhase((previous) => previous === phase ? previous : phase);
  });
  useMotionValueEvent(methodProgress, "change", (value) => {
    const nextStep = value < 0.34 ? 0 : value < 0.68 ? 1 : 2;
    setMethodStep((previous) => previous === nextStep ? previous : nextStep);
  });

  const t = copy[language];
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];

  useEffect(() => {
    setMotionReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), 1900);
    const interval = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, 3)), 460);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = motionOn ? "on" : "off";
    return () => { delete document.documentElement.dataset.motion; };
  }, [motionOn]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const chapter = visible.at(-1)?.target.id as (typeof chapters)[number]["id"] | undefined;
      if (chapter) setActiveChapter(chapter);
    }, { rootMargin: "-42% 0px -45% 0px", threshold: 0 });
    chapters.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, []);

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

  const selectProject = (id: ProjectId) => {
    setActiveId(id);
    window.requestAnimationFrame(() => document.getElementById("work")?.scrollIntoView({ behavior: motionOn ? "smooth" : "auto" }));
  };

  return (
    <MotionConfig reducedMotion={motionOn ? "never" : "always"} transition={{ duration: motionOn ? 0.55 : 0, ease: [0.16, 1, 0.3, 1] }}>
    <main className="site-shell" data-motion={motionOn ? "on" : "off"}>
      <motion.div className={cx("intro-loader", introDone && "intro-loader--done")} aria-hidden={introDone}>
        <div className="loader-orbit" aria-hidden="true"><Asterisk size={30} strokeWidth={1.6} /></div>
        <div className="loader-content">
          <div className="loader-meta"><span>HENRYLABS / 2026</span><span>{String((loadingStep + 1) * 25).padStart(2, "0")} %</span></div>
          <h2>Entering<br /><em>the orbit.</em></h2>
          <div className="loader-line"><span style={{ transform: `scaleX(${(loadingStep + 1) / 4})` }} /></div>
          <p>{t.loading[loadingStep]}</p>
        </div>
      </motion.div>

      <motion.div className="cursor-guide" style={{ x: cursorX, y: cursorY }} aria-hidden="true">
        <span>Henry</span><Asterisk size={10} />
      </motion.div>

      <nav className="chapter-rail" aria-label="Chapter navigation">
        <span className="chapter-rail-caption">Navigate the field</span>
        <div className="chapter-rail-track">
          {chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} className={activeChapter === chapter.id ? "chapter-rail-link--active" : undefined} aria-current={activeChapter === chapter.id ? "page" : undefined}><span>{chapter.number}</span><strong>{chapter.label}</strong></a>)}
        </div>
      </nav>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="HenryLabs home"><span className="brand-mark"><Asterisk size={18} /></span><span>HenryLabs</span></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#work">{t.nav.work}</a><a href="#stack">{t.nav.stack}</a><a href="#proof">{t.nav.proof}</a><a href="#contact">{t.nav.contact}</a>
        </nav>
        <div className="header-controls">
          <button className="motion-toggle" type="button" onClick={() => setMotionPreference((value) => !value)} disabled={Boolean(reducedMotion)} aria-label={reducedMotion ? "Reduced motion follows device preference" : "Animation"} aria-pressed={motionOn} title={reducedMotion ? "Reduced motion follows device preference" : motionOn ? "Turn motion off" : "Turn motion on"}><span className={cx("signal-dot", motionOn && "signal-dot--on")} />{motionOn ? "Motion" : "Still"}</button>
          <button className="language-toggle" type="button" onClick={() => setLanguage((value) => value === "en" ? "id" : "en")} aria-label="Toggle language"><span className={language === "en" ? "is-active" : ""}>EN</span><span>/</span><span className={language === "id" ? "is-active" : ""}>ID</span></button>
          <details className="mobile-nav" ref={menuRef} onKeyDown={(event) => { if (event.key === "Escape" && menuRef.current) { menuRef.current.open = false; menuRef.current.querySelector("summary")?.focus(); } }}>
            <summary aria-label={language === "en" ? "Navigation" : "Navigasi"}><Menu size={18} /></summary>
            <nav aria-label="Mobile navigation">{Object.entries(t.nav).map(([id, label]) => <a href={`#${id}`} key={id} onClick={() => { if (menuRef.current) menuRef.current.open = false; }}>{label}<ArrowUpRight size={16} /></a>)}</nav>
          </details>
        </div>
      </header>

      <section ref={heroRef} className="hero-stage" id="top" aria-labelledby="hero-title" data-phase={motionOn ? heroPhase : "all"}>
        <div className="space-backdrop" aria-hidden="true">
          <motion.img src="/assets/background/cosmic-nebula.png" alt="" style={{ scale: motionOn ? backdropScale : 1 }} />
          <span className="star star-1" /><span className="star star-2" /><span className="star star-3" /><span className="star star-4" /><span className="star star-5" />
          <div className="backdrop-arc arc-one" /><div className="backdrop-arc arc-two" />
        </div>
        <div className="hero-sticky">
          <motion.div className="hero-copy" inert={motionOn && heroPhase !== "intro"} style={{ y: motionOn ? heroCopyY : 0 }}>
            <p className="hero-kicker"><span className="live-pulse" /> product-minded developer / Indonesia</p>
            <h1 id="hero-title">{t.hero.title}</h1>
            <p className="hero-body">{t.hero.body}</p>
            <div className="hero-actions"><a className="button button-bright" href="#work">{t.hero.work}<ArrowDown size={17} /></a><a className="button button-quiet" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer">{t.hero.contact}<ArrowUpRight size={17} /></a></div>
            <p className="hero-note"><span className="status-light" />{t.hero.note}</p>
          </motion.div>

          <motion.div className="cosmic-frame-wrap" inert={motionOn && heroPhase !== "worlds"} style={{ scale: motionOn ? fieldScale : 1, y: motionOn ? fieldY : 0 }}>
            <div className="cosmic-frame">
              <div className="frame-topline"><span>{t.field.label}</span><span>HenryLabs</span></div>
              <CosmicCanvas activeId={activeId} onSelect={selectProject} motionOn={motionOn} progress={scrollYProgress} />
              <div className="frame-bottomline"><span>05 worlds / 01 maker</span><span><MousePointer2 size={13} /> {t.field.hint}</span></div>
            </div>
          </motion.div>
        </div>
        <a href="#work" className="scroll-cue"><span>Scroll to enter</span><ArrowDown size={18} /></a>
      </section>

      <PhaseBridge tone="method" motionOn={motionOn} />

      <section ref={methodRef}
        className="signal-chapter"
        id="method"
        aria-labelledby="method-title"
      >
        <motion.img className="chapter-atmosphere" src="/assets/background/cosmic-nebula.png" alt="" loading="lazy" style={{ y: motionOn ? methodImageY : 0 }} />
        <div className="signal-inner">
          <div className="signal-layout">
            <div className="signal-heading">
              <p className="section-kicker section-kicker-dark">{t.method.kicker}</p>
              <motion.h2 id="method-title" style={{ y: motionOn ? methodY : 0 }}>{t.method.title.split("\n").map((line) => <span key={line}>{line}</span>)}</motion.h2>
            </div>
            <div className="signal-copy"><p>{t.method.body}</p><div className="signal-steps"><motion.span className="signal-progress" aria-hidden="true" style={{ scaleX: motionOn ? methodProgress : 1 }} />{t.method.steps.map((step, index) => <span key={step} className={index === methodStep ? "signal-step--active" : undefined}><i>{String(index + 1).padStart(2, "0")}</i>{step}</span>)}</div></div>
          </div>
          <div className="signal-constellation" aria-hidden="true"><span className="signal-constellation-label">observe / shape / ship</span><span className="signal-constellation-dot dot-a" /><span className="signal-constellation-dot dot-b" /><span className="signal-constellation-dot dot-c" /><span className="signal-constellation-line line-a" /><span className="signal-constellation-line line-b" /><span className="signal-constellation-line line-c" /></div>
        </div>
      </section>

      <PhaseBridge tone="work" motionOn={motionOn} />

      <section className="content-section work-section" id="work" aria-labelledby="work-title">
        <div className="section-heading"><div><p className="section-kicker">Selected worlds</p><h2 id="work-title">{t.work.title}</h2></div><p>{t.work.body}</p></div>
        <div className="work-layout">
          <div className="project-index" role="list" aria-label="Project index">{projects.map((project, index) => <button key={project.id} className={cx("project-row", project.id === activeId && "project-row--active")} style={{ "--project-color": project.color } as React.CSSProperties} type="button" onClick={() => setActiveId(project.id)}><span className="project-number">0{index + 1}</span><span className="project-icon"><img src={project.logo} alt="" /></span><span className="project-row-copy"><strong>{project.name}</strong><small>{project.visibility[language]}</small></span><ArrowRight className="row-arrow" size={18} /></button>)}</div>
          <motion.article className="dossier" key={activeProject.id} style={{ "--dossier-color": activeProject.color } as React.CSSProperties} initial={motionOn ? { opacity: 0, y: 18 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionOn ? 0.5 : 0, ease: [0.16, 1, 0.3, 1] }}>
            <div className="dossier-art"><div className="dossier-art-ring dossier-art-ring--one" /><div className="dossier-art-ring dossier-art-ring--two" /><div className="dossier-art-readout"><span>WORLD / {String(projects.findIndex((project) => project.id === activeProject.id) + 1).padStart(2, "0")}</span><span>{activeProject.year}</span></div><span className="dossier-art-stamp">{activeProject.signal[language]}</span><img src={activeProject.logo} alt={`${activeProject.name} logo`} /></div>
            <div className="dossier-copy"><div className="dossier-meta"><span>{activeProject.status[language]}</span><span>{activeProject.visibility[language]}</span></div><h3>{activeProject.name}</h3><p>{activeProject.summary[language]}</p><div className="dossier-details"><span><small>Role</small><strong>{activeProject.role[language]}</strong></span><span><small>Signal</small><strong>{activeProject.signal[language]}</strong></span></div><div className="flow-line">{activeProject.flow[language].map((step, index) => <span key={step}><i>{String(index + 1).padStart(2, "0")}</i>{step}</span>)}</div><a className="inline-link" href={activeProject.link} target={activeProject.link.startsWith("http") ? "_blank" : undefined} rel={activeProject.link.startsWith("http") ? "noreferrer" : undefined}>{activeProject.linkLabel[language]}<ArrowUpRight size={17} /></a></div>
          </motion.article>
        </div>
      </section>

      <PhaseBridge tone="stack" motionOn={motionOn} />

      <section ref={stackRef} className="stack-section" id="stack" aria-labelledby="stack-title" data-visible={stackVisible}>
        <div className="content-section stack-intro"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Working stack</p><h2 id="stack-title">{t.stack.title}</h2></div><p>{t.stack.body}</p></div></div>
        <div className="stack-marquee" aria-label="Technology stack"><div className="stack-track">{[...stackGroups, ...stackGroups].map((group, groupIndex) => <div className="stack-group" key={`${group.label}-${groupIndex}`}><span className="stack-group-label">{group.label}</span>{group.items.map(([label, slug, color]) => <span className="stack-chip" key={`${label}-${groupIndex}`}><TechIcon label={label} slug={slug} color={color} />{label}</span>)}</div>)}</div></div>
        <div className="stack-constellation content-section" aria-label="Stack constellation">
          <div className="stack-orbit-copy"><p className="section-kicker section-kicker-dark">Tools in orbit</p><h3>Different tools.<br /><em>One point of view.</em></h3><p>Technology changes. The instinct stays: make the next action clearer, lighter, and worth returning to.</p></div>
          <div className="stack-orbit" aria-hidden="true"><div className="stack-orbit-core"><Asterisk size={29} /><span>HENRY</span></div><span className="stack-orbit-ring stack-orbit-ring--one" /><span className="stack-orbit-ring stack-orbit-ring--two" />{stackOrbitItems.map((item) => <span className="stack-orbit-node" key={item.label} style={{ "--orbit-index": item.index, "--orbit-count": stackOrbitItems.length } as React.CSSProperties}><span><TechIcon label={item.label} slug={item.slug} color={item.color} /></span><strong>{item.label}</strong></span>)}</div>
        </div>
        <div className="stack-foot content-section"><span><Brackets size={19} /> from interface to systems</span><span><Zap size={19} /> motion with a reason</span><span><Code2 size={19} /> honest about the state</span></div>
      </section>

      <PhaseBridge tone="academic" motionOn={motionOn} />

      <section className="content-section split-section" id="academic" aria-labelledby="academic-title"><div className="section-heading"><div><p className="section-kicker">University builds</p><h2 id="academic-title">{t.academic.title}</h2></div><p>{t.academic.body}</p></div><div className="academic-list">{academicProjects.map((project) => <article className="academic-row" key={project.title}><span className="academic-mark"><Command size={20} /></span><div><p>{project.tag}</p><h3>{project.title}</h3><span>{project.body}</span></div><ArrowUpRight size={20} /></article>)}</div></section>

      <section className="client-section" id="client-work" aria-labelledby="client-title"><div className="content-section"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Private evidence</p><h2 id="client-title">{t.client.title}</h2></div><p>{t.client.body}</p></div><div className="client-grid"><article><div className="client-topline"><span>01</span><MessageCircle size={21} /></div><h3>Y-Ventures chatbot</h3><p>n8n-based vendor-matching chatbot for event planning, grounded in researched vendor data with filtering, price sorting, and quote calculation.</p><span className="client-tag">Solo by Henry · private</span></article><article><div className="client-topline"><span>02</span><Instagram size={21} /></div><h3>Soreva Autonomous Content</h3><p>Social-media content automation for grounded discovery, editorial generation, branded media, review, scheduling, and controlled publishing.</p><span className="client-tag">Henry solo build + Vieri prototype account</span></article></div></div></section>

      <PhaseBridge tone="proof" motionOn={motionOn} />

      <section className="content-section proof-section" id="proof" aria-labelledby="proof-title"><div className="section-heading"><div><p className="section-kicker">Credentials</p><h2 id="proof-title">{t.proof.title}</h2></div><p>{t.proof.body}</p></div><div className="certificate-shelf">{certificates.map((certificate, index) => <motion.article className="certificate-card" key={certificate.title} initial={motionOn ? { opacity: 0, y: 26 } : undefined} whileInView={motionOn ? { opacity: 1, y: 0 } : undefined} viewport={{ once: true, margin: "-70px" }} transition={{ duration: .55, delay: (index % 3) * .07, ease: [0.22, 1, .36, 1] }}><div className="certificate-preview">{certificate.source ? <a href={certificate.source} target="_blank" rel="noreferrer" aria-label={`Open original ${certificate.title} certificate`}><img src={certificate.image} alt={certificate.alt} loading={index < 3 ? "eager" : "lazy"} /></a> : <img src={certificate.image} alt={certificate.alt} loading="lazy" />}<span className="certificate-index">{String(index + 1).padStart(2, "0")}</span><span className="certificate-view">{certificate.source ? "open original" : "image record"} <ArrowUpRight size={13} /></span></div><div className="certificate-copy"><div className="certificate-meta"><span>{certificate.issuer}</span><span>{certificate.kind}</span></div><h3>{certificate.title}</h3><div className="certificate-foot"><span>{certificate.date}</span>{certificate.source ? <a href={certificate.source} target="_blank" rel="noreferrer">Source PDF <ArrowUpRight size={13} /></a> : <span className="certificate-muted">Original image</span>}</div></div></motion.article>)}<div className="certificate-archive"><span>certificate shelf</span><p>Original assets, issuer names, and dates stay visible so the proof feels specific, not ornamental.</p><Sparkles size={19} /></div></div></section>

      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="content-section contact-content"><div><p className="section-kicker section-kicker-dark">Make the next useful thing</p><h2 id="contact-title">{t.contact.title}</h2></div><div className="contact-copy"><p>{t.contact.body}</p><div className="contact-actions"><a className="button button-bright" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp <ArrowUpRight size={16} /></a><a className="button button-outline" href="mailto:henrynugraha1210@gmail.com"><Mail size={18} /> Email <ArrowUpRight size={16} /></a></div><div className="social-links"><a href="https://github.com/nugrahahenry" target="_blank" rel="noreferrer"><Github size={19} /> GitHub</a><a href="https://instagram.com/hnry.dev" target="_blank" rel="noreferrer"><Instagram size={19} /> @hnry.dev</a></div></div></div></section>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><Asterisk size={18} /></span><span>HenryLabs</span></a><span>{t.footer}</span><span>© 2026</span></footer>
    </main>
    </MotionConfig>
  );
}
