"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Brackets,
  Check,
  Code2,
  Command,
  Github,
  Globe2,
  Instagram,
  Mail,
  MessageCircle,
  MousePointer2,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
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
    work: { title: "The work, in context.", body: "Every world starts with a real friction. Select a planet to see the problem, the flow, and the honest state of the build." },
    stack: { title: "The instruments behind the worlds.", body: "A flexible stack for moving from interface to workflow, from a classroom idea to a system people can actually use." },
    academic: { title: "Built while learning.", body: "University projects where I owned the system end to end: business flows, mobile and web interfaces, and the logic underneath." },
    client: { title: "Work with real stakes.", body: "Private client work is represented as sanitized evidence: what I owned, what I shipped, and where collaboration mattered." },
    proof: { title: "Proof, kept human.", body: "Certificates will live here as a curated shelf, with issuer, title, and date. Evidence should support the story, not become the story." },
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
    work: { title: "Karya, dengan konteks.", body: "Setiap dunia dimulai dari masalah nyata. Pilih planet untuk melihat masalah, alur, dan status build secara jujur." },
    stack: { title: "Instrumen di balik semua dunia.", body: "Stack yang fleksibel untuk bergerak dari interface ke workflow, dari ide kuliah menjadi sistem yang benar-benar bisa dipakai." },
    academic: { title: "Dibuat sambil belajar.", body: "Project kuliah yang kubangun sendiri dari awal sampai akhir: alur bisnis, interface mobile dan web, serta logika di baliknya." },
    client: { title: "Project dengan konsekuensi nyata.", body: "Client work privat ditampilkan sebagai bukti yang sudah disanitasi: bagian yang kupegang, yang kubuat, dan kapan kolaborasi diperlukan." },
    proof: { title: "Bukti, tetap manusiawi.", body: "Sertifikat akan hadir sebagai rak pilihan, lengkap dengan penerbit, judul, dan tanggal. Bukti mendukung cerita, bukan menggantikannya." },
    contact: { title: "Ada sesuatu yang ingin dibuat berguna?", body: "Ceritakan hal yang masih membingungkan, lambat, atau belum sempat dibangun. Aku terbuka untuk project freelance dan tim yang peduli pada detail." },
    footer: "dibuat oleh Henry",
  },
} as const;

const stackGroups = [
  { label: "Build", items: [["JavaScript", "javascript", "f7df1e"], ["Python", "python", "3776ab"], ["Java", "openjdk", "437291"], ["C#", "csharp", "512bd4"]] },
  { label: "Interface", items: [["React", "react", "61dafb"], ["Next.js", "nextdotjs", "ffffff"], ["HTML", "html5", "e34f26"], ["CSS", "css3", "1572b6"]] },
  { label: "Systems", items: [["Node.js", "nodedotjs", "339933"], ["n8n", "n8n", "ea4b71"], ["OpenAI", "openai", "ffffff"], ["Laravel", "laravel", "ff2d20"]] },
];

const academicProjects = [
  { title: "RentalMobil.SG", tag: "OOP · Semester 2", body: "A car-rental web system with vehicle catalog, authentication, booking, payment confirmation, user area, and admin operations." },
  { title: "POS Z Shoes", tag: "APBDS · Semester 3", body: "A point-of-sale system with product, supplier, purchase, customer transaction, return, dashboard, and reporting flows." },
  { title: "LabQ", tag: "Mobile & Web · Semester 4", body: "A digital health laboratory platform connecting patients, lab staff, and admins from registration to test results." },
];

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function PortfolioExperience() {
  const [language, setLanguage] = useState<Language>("en");
  const [activeId, setActiveId] = useState<ProjectId>("catmoji");
  const [introDone, setIntroDone] = useState(false);
  const [motionOn, setMotionOn] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const pointerX = useMotionValue(-100);
  const pointerY = useMotionValue(-100);
  const cursorX = useSpring(pointerX, { stiffness: 240, damping: 28, mass: 0.28 });
  const cursorY = useSpring(pointerY, { stiffness: 240, damping: 28, mass: 0.28 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroCopyOpacity = useTransform(scrollYProgress, [0, 0.17, 0.31], [1, 1, 0]);
  const heroCopyY = useTransform(scrollYProgress, [0, 0.31], [0, -84]);
  const fieldScale = useTransform(scrollYProgress, [0.08, 0.42], [0.62, 1]);
  const fieldOpacity = useTransform(scrollYProgress, [0.08, 0.22, 0.48], [0, 1, 1]);
  const fieldY = useTransform(scrollYProgress, [0.08, 0.44], [110, 0]);

  const t = copy[language];
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];

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
  }, [motionOn]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [pointerX, pointerY]);

  const selectProject = (id: ProjectId) => {
    setActiveId(id);
    window.requestAnimationFrame(() => document.getElementById("work")?.scrollIntoView({ behavior: motionOn ? "smooth" : "auto" }));
  };

  return (
    <main className="site-shell">
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

      <header className="site-header">
        <a className="brand" href="#top" aria-label="HenryLabs home"><span className="brand-mark"><Asterisk size={18} /></span><span>HenryLabs</span></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#work">{t.nav.work}</a><a href="#stack">{t.nav.stack}</a><a href="#proof">{t.nav.proof}</a><a href="#contact">{t.nav.contact}</a>
        </nav>
        <div className="header-controls">
          <button className="motion-toggle" type="button" onClick={() => setMotionOn((value) => !value)} aria-pressed={motionOn} title={motionOn ? "Turn motion off" : "Turn motion on"}><span className={cx("signal-dot", motionOn && "signal-dot--on")} />{motionOn ? "Motion" : "Still"}</button>
          <button className="language-toggle" type="button" onClick={() => setLanguage((value) => value === "en" ? "id" : "en")} aria-label="Toggle language"><span className={language === "en" ? "is-active" : ""}>EN</span><span>/</span><span className={language === "id" ? "is-active" : ""}>ID</span></button>
        </div>
      </header>

      <section ref={heroRef} className="hero-stage" id="top" aria-labelledby="hero-title">
        <div className="space-backdrop" aria-hidden="true"><img src="/assets/background/cosmic-nebula.png" alt="" /><span className="star star-1" /><span className="star star-2" /><span className="star star-3" /><span className="star star-4" /><span className="star star-5" /><div className="backdrop-arc arc-one" /><div className="backdrop-arc arc-two" /></div>
        <div className="hero-sticky">
          <motion.div className="hero-copy" style={{ opacity: heroCopyOpacity, y: heroCopyY }}>
            <p className="hero-kicker"><span className="live-pulse" /> product-minded developer / Indonesia</p>
            <h1 id="hero-title">{t.hero.title}</h1>
            <p className="hero-body">{t.hero.body}</p>
            <div className="hero-actions"><a className="button button-bright" href="#work">{t.hero.work}<ArrowDown size={17} /></a><a className="button button-quiet" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer">{t.hero.contact}<ArrowUpRight size={17} /></a></div>
            <p className="hero-note"><span className="status-light" />{t.hero.note}</p>
          </motion.div>

          <motion.div className="cosmic-frame-wrap" style={{ opacity: fieldOpacity, scale: fieldScale, y: fieldY }}>
            <div className="cosmic-frame">
              <div className="frame-topline"><span>{t.field.label}</span><span>drag / select / explore</span></div>
              <CosmicCanvas activeId={activeId} onSelect={selectProject} motionOn={motionOn} progress={scrollYProgress} />
              <div className="frame-bottomline"><span>05 worlds / 01 maker</span><span><MousePointer2 size={13} /> {t.field.hint}</span></div>
            </div>
          </motion.div>
        </div>
        <a href="#work" className="scroll-cue"><span>Scroll to enter</span><ArrowDown size={18} /></a>
      </section>

      <section className="content-section work-section" id="work" aria-labelledby="work-title">
        <div className="section-heading"><div><p className="section-kicker">Selected worlds</p><h2 id="work-title">{t.work.title}</h2></div><p>{t.work.body}</p></div>
        <div className="work-layout">
          <div className="project-index" role="list" aria-label="Project index">{projects.map((project, index) => <button key={project.id} className={cx("project-row", project.id === activeId && "project-row--active")} type="button" role="listitem" onClick={() => setActiveId(project.id)}><span className="project-number">0{index + 1}</span><span className="project-icon"><img src={project.logo} alt="" /></span><span className="project-row-copy"><strong>{project.name}</strong><small>{project.visibility[language]}</small></span><ArrowRight className="row-arrow" size={18} /></button>)}</div>
          <motion.article className="dossier" key={activeProject.id} style={{ "--dossier-color": activeProject.color } as React.CSSProperties} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="dossier-art"><div className="dossier-art-ring" /><img src={activeProject.logo} alt={`${activeProject.name} logo`} /></div>
            <div className="dossier-copy"><div className="dossier-meta"><span>{activeProject.status[language]}</span><span>{activeProject.visibility[language]}</span></div><h3>{activeProject.name}</h3><p>{activeProject.summary[language]}</p><div className="flow-line">{activeProject.flow[language].map((step, index) => <span key={step}><i>{String(index + 1).padStart(2, "0")}</i>{step}</span>)}</div><a className="inline-link" href={activeProject.link} target={activeProject.link.startsWith("http") ? "_blank" : undefined} rel={activeProject.link.startsWith("http") ? "noreferrer" : undefined}>{activeProject.linkLabel[language]}<ArrowUpRight size={17} /></a></div>
          </motion.article>
        </div>
      </section>

      <section className="stack-section" id="stack" aria-labelledby="stack-title">
        <div className="content-section stack-intro"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Working stack</p><h2 id="stack-title">{t.stack.title}</h2></div><p>{t.stack.body}</p></div></div>
        <div className="stack-marquee" aria-label="Technology stack"><div className="stack-track">{[...stackGroups, ...stackGroups].map((group, groupIndex) => <div className="stack-group" key={`${group.label}-${groupIndex}`}><span className="stack-group-label">{group.label}</span>{group.items.map(([label, slug, color]) => <span className="stack-chip" key={`${label}-${groupIndex}`}><img src={`https://cdn.simpleicons.org/${slug}/${color}`} alt="" />{label}</span>)}</div>)}</div></div>
        <div className="stack-foot content-section"><span><Brackets size={19} /> from interface to systems</span><span><Zap size={19} /> motion with a reason</span><span><Code2 size={19} /> honest about the state</span></div>
      </section>

      <section className="content-section split-section" id="academic" aria-labelledby="academic-title"><div className="section-heading"><div><p className="section-kicker">University builds</p><h2 id="academic-title">{t.academic.title}</h2></div><p>{t.academic.body}</p></div><div className="academic-list">{academicProjects.map((project) => <article className="academic-row" key={project.title}><span className="academic-mark"><Command size={20} /></span><div><p>{project.tag}</p><h3>{project.title}</h3><span>{project.body}</span></div><ArrowUpRight size={20} /></article>)}</div></section>

      <section className="client-section" id="client-work" aria-labelledby="client-title"><div className="content-section"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Private evidence</p><h2 id="client-title">{t.client.title}</h2></div><p>{t.client.body}</p></div><div className="client-grid"><article><div className="client-topline"><span>01</span><MessageCircle size={21} /></div><h3>Y-Ventures chatbot</h3><p>n8n-based vendor-matching chatbot for event planning, grounded in researched vendor data with filtering, price sorting, and quote calculation.</p><span className="client-tag">Solo by Henry · private</span></article><article><div className="client-topline"><span>02</span><Instagram size={21} /></div><h3>Soreva Autonomous Content</h3><p>Social-media content automation for grounded discovery, editorial generation, branded media, review, scheduling, and controlled publishing.</p><span className="client-tag">Henry solo build + Vieri prototype account</span></article></div></div></section>

      <section className="content-section proof-section" id="proof" aria-labelledby="proof-title"><div className="section-heading"><div><p className="section-kicker">Credentials</p><h2 id="proof-title">{t.proof.title}</h2></div><p>{t.proof.body}</p></div><div className="proof-shelf"><div className="proof-card proof-card-one"><Sparkles size={22} /><span>Google / Gemini</span><strong>Learning record</strong></div><div className="proof-card proof-card-two"><Check size={22} /><span>Dicoding / Codelab</span><strong>Verified practice</strong></div><div className="proof-card proof-card-three"><Globe2 size={22} /><span>Skills / Cloud</span><strong>Curious by default</strong></div><div className="proof-note"><span>certificate shelf</span><p>Original certificate images will be curated here next, with their real issuer and date.</p></div></div></section>

      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="content-section contact-content"><div><p className="section-kicker section-kicker-dark">Make the next useful thing</p><h2 id="contact-title">{t.contact.title}</h2></div><div className="contact-copy"><p>{t.contact.body}</p><div className="contact-actions"><a className="button button-bright" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp <ArrowUpRight size={16} /></a><a className="button button-outline" href="mailto:henrynugraha1210@gmail.com"><Mail size={18} /> Email <ArrowUpRight size={16} /></a></div><div className="social-links"><a href="https://github.com/nugrahahenry" target="_blank" rel="noreferrer"><Github size={19} /> GitHub</a><a href="https://instagram.com/hnry.dev" target="_blank" rel="noreferrer"><Instagram size={19} /> @hnry.dev</a></div></div></div></section>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><Asterisk size={18} /></span><span>HenryLabs</span></a><span>{t.footer}</span><span>© 2026</span></footer>
    </main>
  );
}
