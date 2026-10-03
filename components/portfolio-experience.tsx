"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Asterisk,
  Brackets,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Command,
  Github,
  Instagram,
  Linkedin,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  MousePointer2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { CosmicCanvas, type ProjectId } from "./cosmic-canvas";

type Language = "en" | "id";

const projects: Array<{
  id: ProjectId;
  name: string;
  logo: string;
  color: string;
  status: Record<Language, string>;
  visibility: Record<Language, string>;
  access: Record<Language, string>;
  summary: Record<Language, string>;
  flow: Record<Language, string[]>;
  link: string;
  linkLabel: Record<Language, string>;
  role: Record<Language, string>;
  signal: Record<Language, string>;
  year: string;
  stack: string[];
  ownership: Record<Language, string>;
  evidence: Record<Language, string>;
  next: Record<Language, string>;
  media?: string;
  mediaAlt?: string;
  source?: string;
}> = [
  {
    id: "catmoji",
    name: "Catmoji",
    logo: "/assets/brand/catmoji.png",
    color: "#ee674f",
    status: { en: "Live", id: "Live" },
    visibility: { en: "Public product", id: "Produk publik" },
    access: { en: "Open source", id: "Open source" },
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
    stack: ["JavaScript", "MediaPipe", "kNN", "PWA"],
    ownership: { en: "Solo build", id: "Dibangun sendiri" },
    evidence: { en: "Live product and open source repository", id: "Produk live dan repository open source" },
    next: { en: "Inspect the live interaction or read the source", id: "Coba interaksi live atau baca source" },
    media: "/assets/projects/catmoji-hero.png",
    mediaAlt: "Catmoji product preview showing gesture recognition and the Moji cat interface",
    source: "https://github.com/nugrahahenry/AI-Gesture-Cat",
  },
  {
    id: "nalira",
    name: "Nalira",
    logo: "/assets/brand/nalira.svg",
    color: "#60c9b0",
    status: { en: "MVP", id: "MVP" },
    visibility: { en: "Public MVP", id: "MVP publik" },
    access: { en: "Public demo", id: "Demo publik" },
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
    stack: ["Next.js", "Supabase", "Groq", "TypeScript"],
    ownership: { en: "Solo product build", id: "Dibangun sendiri" },
    evidence: { en: "Public MVP with a grounded learning workflow", id: "MVP publik dengan workflow belajar yang grounded" },
    next: { en: "Open the MVP and follow the capture journey", id: "Buka MVP dan ikuti capture journey" },
  },
  {
    id: "canox",
    name: "Canox",
    logo: "/assets/brand/canox.png",
    color: "#657be8",
    status: { en: "Private build", id: "Build privat" },
    visibility: { en: "Private system", id: "Sistem privat" },
    access: { en: "Private walkthrough", id: "Walkthrough privat" },
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
    stack: ["Python", "FastAPI", "JavaScript", "Local-first"],
    ownership: { en: "Solo system build", id: "Dibangun sendiri" },
    evidence: { en: "Private system shown through sanitized architecture evidence", id: "Sistem privat ditampilkan lewat bukti arsitektur yang disanitasi" },
    next: { en: "Request a focused walkthrough", id: "Minta walkthrough terarah" },
  },
  {
    id: "hengs",
    name: "Hengs",
    logo: "/assets/brand/hengs.png",
    color: "#efc95f",
    status: { en: "Live system", id: "Sistem live" },
    visibility: { en: "Private evidence", id: "Bukti privat" },
    access: { en: "Private evidence", id: "Bukti privat" },
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
    stack: ["Node.js", "WhatsApp", "Discord", "AI safety"],
    ownership: { en: "Solo runtime and safety work", id: "Runtime dan safety dikerjakan sendiri" },
    evidence: { en: "Live private runtime with privacy-safe proof", id: "Runtime privat live dengan bukti yang menjaga privasi" },
    next: { en: "Discuss the system boundary", id: "Bahas batas sistemnya" },
  },
  {
    id: "polara",
    name: "Polara",
    logo: "/assets/brand/polara.png",
    color: "#a96ba9",
    status: { en: "In progress", id: "Dalam proses" },
    visibility: { en: "Creative web experience", id: "Pengalaman web kreatif" },
    access: { en: "Preview on request", id: "Preview lewat permintaan" },
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
    stack: ["JavaScript", "HTML", "CSS", "PWA"],
    ownership: { en: "Solo creative web build", id: "Dibangun sendiri sebagai web kreatif" },
    evidence: { en: "Live creative experience with authored visual assets", id: "Experience kreatif live dengan aset visual yang dibuat khusus" },
    next: { en: "Open the experience and see the proof desk", id: "Buka experience dan lihat proof desk" },
    media: "/assets/projects/polara-og.png",
    mediaAlt: "Polara product preview showing a playful digital photobooth interface",
  },
];

const copy = {
  en: {
    nav: { work: "Work", stack: "Stack", proof: "Proof", contact: "Contact" },
    loading: ["Calibrating the field", "Waking project identities", "Mapping useful worlds", "Almost ready"],
    loader: { eyebrow: "HenryLabs / useful worlds", title: "I build things", accent: "I actually see.", body: "Loading the worlds, tools, and proof behind the work.", phases: ["Identity", "Project field", "Proof archive"], telemetry: ["Identity signal", "Project field", "Proof archive", "Field ready"] },
    hero: {
      title: "I build things I actually see.",
      body: "Product-minded developer turning everyday friction into useful systems, playful interfaces, and honest experiments.",
      work: "Explore the work",
      contact: "Start a project",
      note: "Open to thoughtful freelance work and the right team.",
    },
    field: { label: "A living map of HenryLabs", hint: "Drag the field · select a world", inspect: "Inspect dossier", open: "Open project" },
    transition: { eyebrow: "02 / Project field", title: "The signal is live.", body: "Scroll into the systems behind the marks." },
    method: {
      kicker: "The Henry method",
      title: "Notice the friction.\nShape the useful.",
      body: "The best interface starts before the interface. I look for the awkward handoff, the missing context, and the tiny moment that should feel easier.",
      steps: ["See the friction", "Make the system legible", "Ship the next useful move"],
      marker: "SIGNAL / 01",
    },
    work: { title: "The work, in context.", body: "The orbit is the index. Select a world to see its friction, flow, and honest build state." },
    caseStudy: { stack: "Stack", ownership: "Ownership", evidence: "Evidence", next: "Next move", source: "Read source", private: "Private details stay protected", sequence: ["Friction", "System", "Proof"] },
    stack: { title: "The instruments behind the worlds.", body: "A flexible stack for moving from interface to workflow, from a classroom idea to a system people can actually use." },
    academic: { title: "Built while learning.", body: "University projects where I owned the system end to end: business flows, mobile and web interfaces, and the logic underneath." },
    client: { title: "Work with real stakes.", body: "Private client work is represented as sanitized evidence: what I owned, what I shipped, and where collaboration mattered." },
    proof: { title: "Proof, kept human.", body: "Five records lead the story. Open the full archive when you want the wider learning trail." },
    contact: { title: "Have something useful in mind?", body: "Tell me what is unclear, slow, or still waiting to be built. I am open to thoughtful freelance projects and teams that care about details." },
    footer: "built by Henry",
  },
  id: {
    nav: { work: "Karya", stack: "Stack", proof: "Bukti", contact: "Kontak" },
    loading: ["Mengkalibrasi ruang", "Membangunkan identitas project", "Memetakan useful worlds", "Hampir siap"],
    loader: { eyebrow: "HenryLabs / useful worlds", title: "Aku membangun hal", accent: "yang benar-benar kulihat.", body: "Memuat dunia, tools, dan bukti di balik karya ini.", phases: ["Identitas", "Project field", "Arsip bukti"], telemetry: ["Sinyal identitas", "Project field", "Arsip bukti", "Field siap"] },
    hero: {
      title: "Aku membangun hal yang benar-benar kulihat.",
      body: "Developer product-minded yang mengubah rasa penasaran sehari-hari menjadi sistem berguna, interface playful, dan eksperimen jujur.",
      work: "Jelajahi karya",
      contact: "Mulai project",
      note: "Terbuka untuk project freelance dan tim yang tepat.",
    },
    field: { label: "Peta hidup HenryLabs", hint: "Geser field · pilih sebuah dunia", inspect: "Buka dossier", open: "Buka project" },
    transition: { eyebrow: "02 / Project field", title: "Sinyalnya hidup.", body: "Masuk lebih dalam ke sistem di balik setiap mark." },
    method: {
      kicker: "Cara kerja Henry",
      title: "Lihat friksinya.\nBentuk yang berguna.",
      body: "Interface yang baik dimulai sebelum interface. Aku mencari handoff yang canggung, konteks yang hilang, dan momen kecil yang seharusnya terasa lebih mudah.",
      steps: ["Lihat friksinya", "Buat sistemnya terbaca", "Kirim langkah berguna berikutnya"],
      marker: "SIGNAL / 01",
    },
    work: { title: "Karya, dengan konteks.", body: "Orbit ini adalah index-nya. Pilih sebuah dunia untuk melihat friksi, alur, dan status build secara jujur." },
    caseStudy: { stack: "Stack", ownership: "Kepemilikan", evidence: "Bukti", next: "Langkah berikutnya", source: "Baca source", private: "Detail privat tetap dilindungi", sequence: ["Friksi", "Sistem", "Bukti"] },
    stack: { title: "Instrumen di balik semua dunia.", body: "Stack yang fleksibel untuk bergerak dari interface ke workflow, dari ide kuliah menjadi sistem yang benar-benar bisa dipakai." },
    academic: { title: "Dibuat sambil belajar.", body: "Project kuliah yang kubangun sendiri dari awal sampai akhir: alur bisnis, interface mobile dan web, serta logika di baliknya." },
    client: { title: "Project dengan konsekuensi nyata.", body: "Client work privat ditampilkan sebagai bukti yang sudah disanitasi: bagian yang kupegang, yang kubuat, dan kapan kolaborasi diperlukan." },
    proof: { title: "Bukti, tetap manusiawi.", body: "Lima record memimpin ceritanya. Buka arsip penuh saat ingin melihat perjalanan belajar yang lebih lengkap." },
    contact: { title: "Ada sesuatu yang ingin dibuat berguna?", body: "Ceritakan hal yang masih membingungkan, lambat, atau belum sempat dibangun. Aku terbuka untuk project freelance dan tim yang peduli pada detail." },
    footer: "dibuat oleh Henry",
  },
} as const;

const stackGroups = [
  { label: "Build", items: [["JavaScript", "javascript", "f7df1e"], ["Python", "python", "3776ab"], ["Java", "openjdk", "437291"], ["C#", "csharp", "512bd4"], ["PHP", "php", "777bb4"], ["TypeScript", "typescript", "3178c6"]] },
  { label: "Interface", items: [["React", "react", "61dafb"], ["Next.js", "nextdotjs", "ffffff"], ["HTML", "html5", "e34f26"], ["CSS", "css3", "1572b6"], ["PWA", "pwa", "5a0fc8"], ["MediaPipe", "mediapipe", "0097a7"]] },
  { label: "Systems", items: [["Node.js", "nodedotjs", "339933"], ["n8n", "n8n", "ea4b71"], ["OpenAI", "openai", "ffffff"], ["Laravel", "laravel", "ff2d20"], ["Supabase", "supabase", "3ecf8e"], ["Groq", "groq", "f55036"], ["FastAPI", "fastapi", "009688"], ["WhatsApp", "whatsapp", "25d366"], ["Discord", "discord", "5865f2"]] },
];

const academicProjects = [
  { title: "RentalMobil.SG", tag: "OOP · Semester 2", body: "A car-rental web system with vehicle catalog, authentication, booking, payment confirmation, user area, and admin operations.", output: "Booking flow", stack: ["Java", "OOP", "Rental"], color: "#efc95f", linkLabel: "Class build · local" },
  { title: "POS Z Shoes", tag: "APBDS · Semester 3", body: "A point-of-sale system with product, supplier, purchase, customer transaction, return, dashboard, and reporting flows.", output: "Business flow", stack: ["Analysis", "POS", "Reporting"], color: "#ef8e73", link: "https://github.com/nugrahahenry/POS_APBDS", linkLabel: "View source" },
  { title: "LabQ", tag: "Mobile & Web · Semester 4", body: "A digital health laboratory platform connecting patients, lab staff, and admins from registration to test results.", output: "Health workflow", stack: ["React", "Web", "Mobile"], color: "#60c9b0", link: "https://github.com/nugrahahenry/labQ-Android", linkLabel: "View source" },
];

const clientProjects = [
  { title: "Y-Ventures chatbot", icon: MessageCircle, body: "n8n-based vendor-matching chatbot for event planning, grounded in researched vendor data with filtering, price sorting, and quote calculation.", ownership: "Solo by Henry · private", signal: "Research → match → quote", color: "#6ee7f4" },
  { title: "Soreva Autonomous Content", icon: Instagram, body: "Social-media content automation for grounded discovery, editorial generation, branded media, review, scheduling, and controlled publishing.", ownership: "Henry solo build + Vieri prototype account", signal: "Discover → review → publish", color: "#ff82c8" },
];

const certificates = [
  { title: "Class of 2026 Graduation", issuer: "Google Student Ambassador", kind: "Community", date: "Class of 2026", image: "/assets/certificates/previews/google-student-ambassador.png", source: "/assets/certificates/source/google-student-ambassador.pdf", alt: "Google Student Ambassador Class of 2026 graduation certificate for Henry Nugraha" },
  { title: "Gemini Certified Educator", issuer: "Google", kind: "Certification", date: "18 Apr 2026", image: "/assets/certificates/previews/gemini-certified-educator.png", source: "/assets/certificates/source/gemini-certified-educator.pdf", alt: "Gemini Certified Educator certificate for Henry Nugraha" },
  { title: "Gemini Certified Student", issuer: "Google", kind: "Certification", date: "08 Apr 2026", image: "/assets/certificates/previews/gemini-certified.png", source: "/assets/certificates/source/gemini-certified.pdf", alt: "Gemini Certified Student certificate for Henry Nugraha" },
  { title: "TechSprint Web Development", issuer: "Codelab Indonesia", kind: "Competition", date: "Date not shown", image: "/assets/certificates/previews/codelab-techsprint-web-development.png", source: "/assets/certificates/source/codelab-techsprint-web-development.pdf", alt: "TechSprint Innovation Cup Web Development certificate for Henry Nugraha" },
  { title: "Belajar Prinsip Pemrograman SOLID", issuer: "Dicoding Academy", kind: "Course", date: "30 Apr 2026", image: "/assets/certificates/previews/dicoding-oop.png", source: "/assets/certificates/source/dicoding-oop.pdf", alt: "Dicoding certificate for learning SOLID programming principles" },
  { title: "Top 10 Finalist RBCA", issuer: "IMPACT / Retail Business Case Analysis", kind: "Competition", date: "Date not shown", image: "/assets/certificates/previews/top-ten-rbca.jpeg", alt: "Top 10 Finalist Retail Business Case Analysis certificate for Henry Nugraha" },
  { title: "Google Workspace for Education Fundamentals", issuer: "Google for Education", kind: "Credential", date: "Date not shown", image: "/assets/certificates/previews/google-for-education.png", source: "/assets/certificates/source/google-for-education.pdf", alt: "Google Workspace for Education Fundamentals credential for Henry Nugraha" },
  { title: "Build Your First Agent with ADK", issuer: "Google Skills", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-build-first-agent.png", alt: "Google Skills badge for Build Your First Agent with Agent Development Kit" },
  { title: "Spec-Driven Development with Antigravity CLI", issuer: "GDG Jakarta / GDG Cloud Jakarta", kind: "Workshop record", date: "22 Jul 2026", image: "/assets/certificates/previews/gdg-spec-driven-development-antigravity-cli.png", source: "/assets/certificates/source/gdg-spec-driven-development-antigravity-cli.pdf", alt: "GDG recognition of engagement for Spec-Driven Development with Antigravity CLI, issued to Henry Nugraha" },
  { title: "AI-Assisted Checks with Antigravity CLI and SDK", issuer: "GDG Jakarta / GDG Cloud Jakarta", kind: "Workshop record", date: "24 Jul 2026", image: "/assets/certificates/previews/gdg-code-quality-security-antigravity-cli.png", source: "/assets/certificates/source/gdg-code-quality-security-antigravity-cli.pdf", alt: "GDG recognition of engagement for AI-assisted code quality and security checks, issued to Henry Nugraha" },
  { title: "App Building with AppSheet", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-adventure-app-building-appsheet.png", alt: "Google Cloud skill badge for App Building with AppSheet" },
  { title: "Build Serverless Applications with Cloud Run Functions", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-adventure-build-serverless-applications.png", alt: "Google Cloud skill badge for building serverless applications with Cloud Run Functions" },
  { title: "Build a Data Mesh with Dataplex", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-data-mesh-knowledge-catalog.png", alt: "Google Cloud skill badge for building a data mesh with Dataplex" },
  { title: "Build a Data Warehouse with BigQuery", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-data-warehouse-bigquery.png", alt: "Google Cloud skill badge for building a data warehouse with BigQuery" },
  { title: "Mitigate Threats with Security Command Center", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-safe-space-security-command-center.png", alt: "Google Cloud skill badge for mitigating threats and vulnerabilities with Security Command Center" },
  { title: "Optimize Costs for Google Kubernetes Engine", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-safe-space-optimize-costs-kubernetes-engine.png", alt: "Google Cloud skill badge for optimizing costs for Google Kubernetes Engine" },
  { title: "Create Your First Gemini Enterprise Application", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-create-gemini-enterprise-application.png", alt: "Google Cloud skill badge for creating a Gemini Enterprise application" },
  { title: "Deploy Multi-Agent Architectures", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-deploy-multi-agent-architectures.png", alt: "Google Cloud skill badge for deploying multi-agent architectures" },
  { title: "Engineer AI Agents with ADK", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-engineer-ai-agents-adk.png", alt: "Google Cloud skill badge for engineering AI agents with Agent Development Kit" },
  { title: "Gemini for Data Scientists and Analysts", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-gemini-data-scientists-analysts.png", alt: "Google Cloud completion badge for Gemini for Data Scientists and Analysts" },
  { title: "Optimize Agent Behavior", issuer: "Google Cloud", kind: "Completion badge", date: "Date not shown", image: "/assets/certificates/previews/google-skills-optimize-agent-behavior.png", alt: "Google Cloud completion badge for optimizing agent behavior" },
  { title: "Google Skills Arcade: Base Camp", issuer: "Google Cloud", kind: "Completion badge", date: "Jul 2026", image: "/assets/certificates/previews/google-skills-arcade-base-camp.png", alt: "Google Skills Arcade Base Camp badge from July 2026" },
  { title: "Google Skills Arcade: Data Mesh Architect", issuer: "Google Cloud", kind: "Completion badge", date: "Jul 2026", image: "/assets/certificates/previews/google-skills-arcade-data-mesh-architect.png", alt: "Google Skills Arcade Data Mesh Architect badge from July 2026" },
  { title: "Google Skills Arcade: Low-Code Development", issuer: "Google Cloud", kind: "Completion badge", date: "Jul 2026", image: "/assets/certificates/previews/google-skills-arcade-low-code-development.png", alt: "Google Skills Arcade Low-Code Development badge from July 2026" },
  { title: "Google Skills Arcade: Safe Space", issuer: "Google Cloud", kind: "Completion badge", date: "Jul 2026", image: "/assets/certificates/previews/google-skills-arcade-safe-space.png", alt: "Google Skills Arcade Safe Space badge from July 2026" },
  { title: "Google Skills Arcade: Voyage", issuer: "Google Cloud", kind: "Completion badge", date: "Jul 2026", image: "/assets/certificates/previews/google-skills-arcade-voyage.png", alt: "Google Skills Arcade Voyage badge from July 2026" },
];

const certificateFilters = ["All", "Certification", "Course", "Competition", "Community", "Credential", "Completion badge", "Workshop record"] as const;

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

export function PortfolioExperience() {
  const [language, setLanguage] = useState<Language>("en");
  const [activeId, setActiveId] = useState<ProjectId>("catmoji");
  const [activeCertificate, setActiveCertificate] = useState<(typeof certificates)[number] | null>(null);
  const [certificateFilter, setCertificateFilter] = useState<(typeof certificateFilters)[number]>("All");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [showCertificateArchive, setShowCertificateArchive] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [motionPreference, setMotionPreference] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [methodStep, setMethodStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const motionOn = motionReady && motionPreference && !reducedMotion;
  const [loadingStep, setLoadingStep] = useState(0);
  const [heroPhase, setHeroPhase] = useState("intro");
  const heroRef = useRef<HTMLElement>(null);
  const methodRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const certificateModalRef = useRef<HTMLDivElement>(null);
  const certificateTriggerRef = useRef<HTMLButtonElement | null>(null);
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
  const filteredCertificates = certificateFilter === "All" ? certificates : certificates.filter((certificate) => certificate.kind === certificateFilter);
  const visibleCertificates = showCertificateArchive ? filteredCertificates : filteredCertificates.slice(0, 5);
  const spotlightPool = visibleCertificates.slice(0, Math.min(5, visibleCertificates.length));
  const spotlightCertificate = spotlightPool[spotlightIndex % Math.max(spotlightPool.length, 1)] ?? certificates[0];
  const shelfCertificates = visibleCertificates.filter((certificate) => certificate.title !== spotlightCertificate.title);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  useEffect(() => {
    const introSeen = window.sessionStorage.getItem("henrylabs-intro-seen") === "1";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (introSeen || reduced) {
      setLoadingStep(3);
      setIntroDone(true);
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
    const timer = window.setTimeout(() => {
      setIntroDone(true);
      window.sessionStorage.setItem("henrylabs-intro-seen", "1");
    }, 1900);
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
    setSpotlightIndex(0);
  }, [certificateFilter, showCertificateArchive]);

  useEffect(() => {
    if (!activeCertificate) return;
    const restoreTarget = certificateTriggerRef.current;
    const modal = certificateModalRef.current;
    const focusable = modal ? Array.from(modal.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])")) : [];
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveCertificate(null);
        return;
      }
      if (event.key !== "Tab" || focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => focusable[0]?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      restoreTarget?.focus();
    };
  }, [activeCertificate]);

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

  const focusProject = (id: ProjectId) => setActiveId(id);

  const focusStackProject = (label: string) => {
    const project = projects.find((candidate) => candidate.stack.includes(label));
    if (project) setActiveId(project.id);
  };

  const openProjectDossier = () => {
    window.requestAnimationFrame(() => document.getElementById("work")?.scrollIntoView({ behavior: motionOn ? "smooth" : "auto" }));
  };

  const cycleProject = (direction: -1 | 1) => {
    const index = projects.findIndex((project) => project.id === activeId);
    setActiveId(projects[(index + direction + projects.length) % projects.length].id);
  };

  const cycleSpotlight = (direction: -1 | 1) => {
    if (spotlightPool.length < 2) return;
    setSpotlightIndex((index) => (index + direction + spotlightPool.length) % spotlightPool.length);
  };

  return (
    <MotionConfig reducedMotion={motionOn ? "never" : "always"} transition={{ duration: motionOn ? 0.55 : 0, ease: [0.16, 1, 0.3, 1] }}>
    <main className="site-shell" data-motion={motionOn ? "on" : "off"}>
      <motion.div className={cx("intro-loader", introDone && "intro-loader--done")} aria-hidden={introDone}>
        <div className="loader-stars" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        <div className="loader-system" aria-hidden="true"><span className="loader-system-axis loader-system-axis--one" /><span className="loader-system-axis loader-system-axis--two" /><span className="loader-system-orbit loader-system-orbit--one"><i><img src="/assets/brand/catmoji.png" alt="" /></i></span><span className="loader-system-orbit loader-system-orbit--two"><i><img src="/assets/brand/nalira.svg" alt="" /></i></span><span className="loader-system-node loader-system-node--canox"><img src="/assets/brand/canox.png" alt="" /></span><span className="loader-system-node loader-system-node--hengs"><img src="/assets/brand/hengs.png" alt="" /></span><span className="loader-system-node loader-system-node--polara"><img src="/assets/brand/polara.png" alt="" /></span><span className="loader-system-core"><span className="loader-core-pulse" /><Asterisk size={27} strokeWidth={1.5} /><small>HENRY</small></span></div>
        <div className="loader-content">
          <div className="loader-meta"><span>HENRYLABS / USEFUL WORLDS</span><span>0{Math.min(loadingStep + 1, 4)} / 04</span></div>
          <p className="loader-eyebrow">{t.loader.eyebrow}</p>
          <h2><span>{t.loader.title}</span><em>{t.loader.accent}</em></h2>
          <p className="loader-intro">{t.loader.body}</p>
          <div className="loader-line"><span style={{ transform: `scaleX(${(loadingStep + 1) / 4})` }} /></div>
          <div className="loader-status"><p>{t.loading[loadingStep]}</p><span className="loader-status-dots"><i className={loadingStep >= 0 ? "is-on" : undefined} /><i className={loadingStep >= 1 ? "is-on" : undefined} /><i className={loadingStep >= 2 ? "is-on" : undefined} /><i className={loadingStep >= 3 ? "is-on" : undefined} /></span></div>
          <div className="loader-telemetry"><span>{t.loader.telemetry[loadingStep]}</span><span>MARKS / 05</span><span>MAKER / 01</span></div>
          <div className="loader-phases" aria-label="Portfolio loading phases">{t.loader.phases.map((phase, index) => <span className={cx(index <= loadingStep - 1 && "is-complete", index === loadingStep && "is-active")} key={phase}><i>{String(index + 1).padStart(2, "0")}</i><strong>{phase}</strong></span>)}</div>
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
          <span className="star-field star-field--far" /><span className="star-field star-field--near" />
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
            <div className="cosmic-frame" style={{ "--active-world-color": activeProject.color } as CSSProperties}>
              <div className="frame-topline"><span>{t.field.label}</span><span>{activeProject.name} / {activeProject.status[language]}</span></div>
              <CosmicCanvas activeId={activeId} onSelect={focusProject} onPrevious={() => cycleProject(-1)} onNext={() => cycleProject(1)} motionOn={motionOn} progress={scrollYProgress} />
              <AnimatePresence mode="wait" initial={false}>
                <motion.section className="project-showcase" key={activeProject.id} aria-label={`Active project: ${activeProject.name}`} style={{ "--project-showcase-color": activeProject.color } as CSSProperties} initial={motionOn ? { opacity: 0, x: 22 } : false} animate={{ opacity: 1, x: 0 }} exit={motionOn ? { opacity: 0, x: -16 } : undefined} transition={{ duration: motionOn ? .4 : 0, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="project-showcase-topline"><span>ACTIVE WORLD / {String(projects.findIndex((project) => project.id === activeProject.id) + 1).padStart(2, "0")}</span><div className="project-showcase-nav"><button type="button" onClick={() => cycleProject(-1)} aria-label="Previous project"><ChevronLeft size={13} /></button><button type="button" onClick={() => cycleProject(1)} aria-label="Next project"><ChevronRight size={13} /></button></div></div>
                  <div className="project-showcase-index" role="tablist" aria-label="Project worlds">{projects.map((project, index) => <button type="button" role="tab" aria-selected={activeId === project.id} className={cx(activeId === project.id && "is-active")} style={{ "--world-color": project.color } as CSSProperties} onClick={() => focusProject(project.id)} aria-label={`Focus ${project.name}`} title={project.name} key={project.id}><span className="project-showcase-index-mark"><img src={project.logo} alt="" /></span><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>
                  <div className="project-showcase-identity"><span className="project-showcase-mark"><img src={activeProject.logo} alt="" /></span><div><span>{activeProject.status[language]} · {activeProject.visibility[language]}</span><h2>{activeProject.name}</h2></div></div>
                  <p className="project-showcase-summary">{activeProject.summary[language]}</p>
                  <div className="project-showcase-stack">{activeProject.stack.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
                  <div className="project-showcase-actions"><button type="button" onClick={openProjectDossier}>{t.field.inspect}<ArrowDown size={14} /></button><a href={activeProject.link} target={activeProject.link.startsWith("http") ? "_blank" : undefined} rel={activeProject.link.startsWith("http") ? "noreferrer" : undefined}>{t.field.open}<ArrowUpRight size={13} /></a></div>
                </motion.section>
              </AnimatePresence>
              <div className="frame-bottomline"><span>05 worlds / 01 maker</span><span><MousePointer2 size={13} /> {t.field.hint}</span></div>
            </div>
          </motion.div>
          <div className="hero-transition" aria-hidden={heroPhase !== "transition"}>
            <div className="hero-transition-card"><span>{t.transition.eyebrow}</span><strong>{t.transition.title}</strong><small>{t.transition.body}</small><i><b /><b /><b /></i></div>
          </div>
        </div>
        <div className="hero-telemetry" aria-hidden="true"><span>FIELD STATUS <b>LIVE</b></span><span>WORLD COUNT <b>05</b></span><span>MAKER <b>01</b></span></div>
        <a href="#work" className="scroll-cue"><span>Scroll to enter</span><ArrowDown size={18} /></a>
      </section>

      <section className="content-section work-section" id="work" aria-labelledby="work-title">
        <div className="section-heading"><div><p className="section-kicker">Selected worlds</p><h2 id="work-title">{t.work.title}</h2></div><p>{t.work.body}</p></div>
        <div className="work-world-context"><div><span>ACTIVE WORLD / {String(projects.findIndex((project) => project.id === activeProject.id) + 1).padStart(2, "0")}</span><strong>{activeProject.name}</strong><small>Focused from the project orbit</small></div><div className="work-world-controls"><button type="button" onClick={() => cycleProject(-1)} aria-label="Previous project"><ChevronLeft size={17} /></button><button type="button" onClick={() => cycleProject(1)} aria-label="Next project"><ChevronRight size={17} /></button></div></div>
        <div className="work-layout">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article className="dossier" key={activeProject.id} style={{ "--dossier-color": activeProject.color } as React.CSSProperties} initial={motionOn ? { opacity: 0, y: 18, scale: .985 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={motionOn ? { opacity: 0, y: -10, scale: .99 } : undefined} transition={{ duration: motionOn ? 0.45 : 0, ease: [0.16, 1, 0.3, 1] }}>
              <div className="dossier-art"><div className="dossier-art-ring dossier-art-ring--one" /><div className="dossier-art-ring dossier-art-ring--two" /><span className="dossier-art-scan" aria-hidden="true" /><div className="dossier-art-readout"><span>WORLD / {String(projects.findIndex((project) => project.id === activeProject.id) + 1).padStart(2, "0")}</span><span>{activeProject.year}</span></div><span className="dossier-art-stamp">{activeProject.signal[language]}</span><div className="dossier-art-evidence" aria-label="Project evidence signals"><span><small>Surface</small><strong>{activeProject.media ? "Visual" : "System map"}</strong></span><span><small>Access</small><strong>{activeProject.access[language]}</strong></span><span><small>State</small><strong>{activeProject.status[language]}</strong></span></div>{activeProject.media ? <img className="dossier-art-preview" src={activeProject.media} alt={activeProject.mediaAlt} /> : <div className="dossier-art-map" aria-label={`${activeProject.name} system map`}>{activeProject.flow[language].map((step, index) => <span key={step}><i>{String(index + 1).padStart(2, "0")}</i>{step}</span>)}</div>}<img className="dossier-art-logo" src={activeProject.logo} alt={`${activeProject.name} logo`} /></div>
              <div className="dossier-copy"><div className="dossier-meta"><span>{activeProject.status[language]}</span><span>{activeProject.visibility[language]}</span></div><h3>{activeProject.name}</h3><p>{activeProject.summary[language]}</p><div className="dossier-details"><span><small>Role</small><strong>{activeProject.role[language]}</strong></span><span><small>Access</small><strong>{activeProject.access[language]}</strong></span><span><small>Signal</small><strong>{activeProject.signal[language]}</strong></span></div><div className="dossier-sequence" aria-label="Case study sequence">{activeProject.flow[language].map((step, index) => <span key={step}><small>0{index + 1} / {t.caseStudy.sequence[index]}</small><strong>{step}</strong></span>)}</div><div className="case-facts"><span><small>{t.caseStudy.stack}</small><strong>{activeProject.stack.join(" · ")}</strong></span><span><small>{t.caseStudy.ownership}</small><strong>{activeProject.ownership[language]}</strong></span><span><small>{t.caseStudy.evidence}</small><strong>{activeProject.evidence[language]}</strong></span></div><div className="dossier-next"><span>{t.caseStudy.next}</span><p>{activeProject.next[language]}</p></div><div className="dossier-actions"><a className="inline-link" href={activeProject.link} target={activeProject.link.startsWith("http") ? "_blank" : undefined} rel={activeProject.link.startsWith("http") ? "noreferrer" : undefined}>{activeProject.linkLabel[language]}<ArrowUpRight size={17} /></a>{activeProject.source && <a className="inline-link inline-link--source" href={activeProject.source} target="_blank" rel="noreferrer"><Github size={16} />{t.caseStudy.source}<ArrowUpRight size={15} /></a>}</div>{!activeProject.source && <p className="dossier-private"><LockKeyhole size={14} />{t.caseStudy.private}</p>}</div>
            </motion.article>
          </AnimatePresence>
        </div>
      </section>

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
        <div className="world-chain" aria-hidden="true"><span className="world-chain-label">05 worlds / 01 maker</span><div className="world-chain-track">{projects.map((project, index) => <span className="world-chain-node" style={{ "--world-color": project.color } as React.CSSProperties} key={project.id}><i><img src={project.logo} alt="" /></i><b>0{index + 1}</b></span>)}</div><span className="world-chain-note">different friction / same instinct</span></div>
      </section>

      <section ref={stackRef} className="stack-section" id="stack" aria-labelledby="stack-title" data-visible={stackVisible}>
        <div className="content-section stack-intro"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Tech orbit</p><h2 id="stack-title">{t.stack.title}</h2></div><p>{t.stack.body}</p></div></div>
        <div className="maker-orbit content-section" aria-label="Technology stack orbit">
          <div className="maker-orbit-stage">
            <span className="maker-orbit-path maker-orbit-path--build" aria-hidden="true" />
            <span className="maker-orbit-path maker-orbit-path--interface" aria-hidden="true" />
            <span className="maker-orbit-path maker-orbit-path--systems" aria-hidden="true" />
            <motion.div className="maker-core" whileHover={motionOn ? { scale: 1.04, rotate: -2 } : undefined} transition={{ type: "spring", stiffness: 230, damping: 18 }}>
              <span className="maker-core-mark"><Asterisk size={25} /></span>
              <span className="maker-core-meta">HENRY / MAKER</span>
              <strong>one point<br /><em>of view.</em></strong>
              <small>products · systems · playful interfaces</small>
            </motion.div>
            {stackGroups.map((group, groupIndex) => <div className={cx("maker-orbit-track", `maker-orbit-track--${groupIndex + 1}`)} key={group.label}>{group.items.map(([label, slug, color], itemIndex) => { const linkedProject = projects.find((project) => project.stack.includes(label)); const linked = activeProject.stack.includes(label); return <button type="button" className={cx("maker-tech", linked && "is-linked", !linkedProject && "is-unmapped")} style={{ "--node-angle": `${itemIndex * (360 / group.items.length)}deg`, "--node-color": `#${color}` } as React.CSSProperties} key={label} title={linkedProject ? `${label} · ${linkedProject.name}` : label} aria-pressed={linked} aria-label={linkedProject ? `Focus ${linkedProject.name} through ${label}` : label} disabled={!linkedProject} onClick={() => focusStackProject(label)}><span className="maker-tech-icon"><TechIcon label={label} slug={slug} color={color} /></span><b>{label}</b></button>; })}</div>)}
          </div>
          <div className="maker-orbit-legend">{stackGroups.map((group, groupIndex) => <span key={group.label}><i>{String(groupIndex + 1).padStart(2, "0")}</i>{group.label}</span>)}<p>One orbit. Three ways to make.</p></div>
          <div className="maker-orbit-inspector" aria-live="polite"><div><span>ACTIVE LINK</span><strong>{activeProject.name}</strong><small>{activeProject.access[language]} · {activeProject.stack.length} signals</small></div><div className="maker-orbit-inspector-stack">{activeProject.stack.map((item) => <span key={item}>{item}</span>)}</div></div>
        </div>
        <div className="stack-foot content-section"><span><Brackets size={19} /> from interface to systems</span><span><Zap size={19} /> motion with a reason</span><span><Code2 size={19} /> honest about the state</span></div>
      </section>

      <section className="content-section split-section academic-section" id="academic" aria-labelledby="academic-title"><div className="section-heading"><div><p className="section-kicker">University builds</p><h2 id="academic-title">{t.academic.title}</h2></div><p>{t.academic.body}</p></div><div className="academic-grid">{academicProjects.map((project, index) => <article className="academic-card" style={{ "--academic-color": project.color } as React.CSSProperties} key={project.title}><div className="academic-card-top"><span>0{index + 1}</span><small>solo system</small></div><span className="academic-mark"><Command size={20} /></span><p>{project.tag}</p><h3>{project.title}</h3><span className="academic-card-body">{project.body}</span><div className="academic-card-foot"><strong>{project.output}</strong><span>{project.stack.join(" · ")}</span>{project.link ? <a href={project.link} target="_blank" rel="noreferrer" aria-label={`${project.linkLabel} for ${project.title}`}>{project.linkLabel}<ArrowUpRight size={18} /></a> : <span className="academic-card-local">class build</span>}</div></article>)}</div></section>

      <section className="client-section" id="client-work" aria-labelledby="client-title"><div className="content-section"><div className="section-heading"><div><p className="section-kicker section-kicker-dark">Private evidence</p><h2 id="client-title">{t.client.title}</h2></div><p>{t.client.body}</p></div><div className="client-grid">{clientProjects.map(({ title, icon: Icon, body, ownership, signal, color }, index) => <article className="client-card" style={{ "--client-color": color } as React.CSSProperties} key={title}><div className="client-topline"><span>0{index + 1}</span><Icon size={21} /></div><h3>{title}</h3><p>{body}</p><div className="client-proof"><span><small>Signal</small><strong>{signal}</strong></span><span><small>Ownership</small><strong>{ownership}</strong></span></div><a className="client-card-action" href="#contact">Request a private walkthrough <ArrowUpRight size={15} /></a></article>)}</div></div></section>

      <section className="content-section proof-section" id="proof" aria-labelledby="proof-title">
        <div className="section-heading"><div><p className="section-kicker">Credentials / 05 featured</p><h2 id="proof-title">{t.proof.title}</h2></div><p>{t.proof.body}</p></div>
        <div className="proof-toolbar"><div className="proof-count"><strong>{String(visibleCertificates.length).padStart(2, "0")}</strong><span>{showCertificateArchive ? "archive records" : "featured records"}</span></div><div className="certificate-filters" role="tablist" aria-label="Filter credentials">{certificateFilters.map((filter) => <button key={filter} type="button" role="tab" aria-selected={certificateFilter === filter} className={cx(certificateFilter === filter && "is-active")} onClick={() => setCertificateFilter(filter)}>{filter}</button>)}</div></div>
        <div className="certificate-feature certificate-card">
          <button type="button" className="certificate-feature-preview" onClick={(event) => { certificateTriggerRef.current = event.currentTarget; setActiveCertificate(spotlightCertificate); }} aria-label={`Inspect ${spotlightCertificate.title} certificate`}>
            {spotlightPool.slice(1, 4).map((certificate, index) => <span className={cx("certificate-feature-ghost", `certificate-feature-ghost--${index + 1}`)} key={certificate.title} aria-hidden="true"><img src={certificate.image} alt="" /></span>)}
            <AnimatePresence mode="wait" initial={false}><motion.img key={spotlightCertificate.title} src={spotlightCertificate.image} alt={spotlightCertificate.alt} initial={motionOn ? { opacity: 0, x: 28, rotate: 3 } : false} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={motionOn ? { opacity: 0, x: -22, rotate: -3 } : undefined} transition={{ duration: motionOn ? .42 : 0, ease: [0.22, 1, .36, 1] }} /></AnimatePresence>
            <span className="certificate-index">{String((spotlightPool.indexOf(spotlightCertificate) + 1).toString().padStart(2, "0"))} / FEATURED RECORD</span><span className="certificate-view">inspect full <ArrowUpRight size={13} /></span>
          </button>
          <div className="certificate-feature-copy"><div className="certificate-meta"><span>{spotlightCertificate.issuer}</span><span>{spotlightCertificate.kind}</span></div><div className="certificate-feature-title"><h3>{spotlightCertificate.title}</h3><div className="certificate-feature-switcher"><span>{String(spotlightPool.indexOf(spotlightCertificate) + 1).padStart(2, "0")} / {String(spotlightPool.length).padStart(2, "0")}</span><button type="button" onClick={() => cycleSpotlight(-1)} aria-label="Previous featured credential"><ChevronLeft size={15} /></button><button type="button" onClick={() => cycleSpotlight(1)} aria-label="Next featured credential"><ChevronRight size={15} /></button></div></div><p>One original record from the shelf, kept large enough to read and specific enough to trust.</p><div className="certificate-feature-specs"><span><small>Issued</small><strong>{spotlightCertificate.date}</strong></span><span><small>{showCertificateArchive ? "Archive" : "Featured"}</small><strong>{String(visibleCertificates.length).padStart(2, "0")} visible</strong></span></div><button type="button" className="certificate-feature-open" onClick={(event) => { certificateTriggerRef.current = event.currentTarget; setActiveCertificate(spotlightCertificate); }}>Open the record <ArrowUpRight size={15} /></button>{spotlightCertificate.source && <a className="certificate-feature-source" href={spotlightCertificate.source} target="_blank" rel="noreferrer">Source PDF <ArrowUpRight size={13} /></a>}</div>
        </div>
        <div className="certificate-shelf certificate-shelf--compact"><AnimatePresence initial={false} mode="popLayout">{shelfCertificates.map((certificate, index) => <motion.article layout className="certificate-card" key={certificate.title} initial={motionOn ? { opacity: 0, y: 26, scale: .98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={motionOn ? { opacity: 0, y: -14, scale: .96 } : undefined} transition={{ duration: motionOn ? .42 : 0, delay: motionOn ? (index % 3) * .045 : 0, ease: [0.22, 1, .36, 1] }}><button type="button" className="certificate-preview" onClick={(event) => { certificateTriggerRef.current = event.currentTarget; setActiveCertificate(certificate); }} aria-label={`Inspect ${certificate.title} certificate`}><img src={certificate.image} alt={certificate.alt} loading="lazy" /><span className="certificate-index">{String(index + 2).padStart(2, "0")}</span><span className="certificate-view">inspect full <ArrowUpRight size={13} /></span></button><div className="certificate-copy"><div className="certificate-meta"><span>{certificate.issuer}</span><span>{certificate.kind}</span></div><h3>{certificate.title}</h3><div className="certificate-foot"><span>{certificate.date}</span>{certificate.source ? <a href={certificate.source} target="_blank" rel="noreferrer">Source PDF <ArrowUpRight size={13} /></a> : <span className="certificate-muted">Original image</span>}</div></div></motion.article>)}</AnimatePresence></div>
        <div className="certificate-archive"><span>certificate shelf</span><p>Original assets, issuer names, and dates stay visible so the proof feels specific, not ornamental.</p><button type="button" className="certificate-archive-toggle" aria-expanded={showCertificateArchive} onClick={() => setShowCertificateArchive((value) => !value)}>{showCertificateArchive ? "Show featured five" : `Open full archive (${filteredCertificates.length})`}<motion.span animate={{ rotate: showCertificateArchive ? 180 : 0 }} transition={{ duration: .3 }}><ChevronDown size={14} /></motion.span></button><Sparkles size={19} /></div>
      </section>

      <AnimatePresence>{activeCertificate && <motion.div className="certificate-modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(event) => { if (event.target === event.currentTarget) setActiveCertificate(null); }}><motion.div ref={certificateModalRef} className="certificate-modal" role="dialog" aria-modal="true" aria-labelledby="certificate-modal-title" initial={motionOn ? { opacity: 0, y: 26, scale: .97 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={motionOn ? { opacity: 0, y: 18, scale: .98 } : undefined} transition={{ duration: .35, ease: [0.22, 1, .36, 1] }}><button type="button" className="certificate-modal-close" onClick={() => setActiveCertificate(null)} aria-label="Close certificate viewer"><X size={19} /></button><div className="certificate-modal-image"><img src={activeCertificate.image} alt={activeCertificate.alt} /></div><div className="certificate-modal-copy"><p className="section-kicker">Certificate detail</p><div className="certificate-meta"><span>{activeCertificate.issuer}</span><span>{activeCertificate.kind}</span></div><h2 id="certificate-modal-title">{activeCertificate.title}</h2><p>{activeCertificate.date}</p>{activeCertificate.source && <a className="button button-bright" href={activeCertificate.source} target="_blank" rel="noreferrer">Open source PDF <ArrowUpRight size={16} /></a>}</div></motion.div></motion.div>}</AnimatePresence>

      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="content-section contact-content"><div><p className="section-kicker section-kicker-dark">Make the next useful thing</p><h2 id="contact-title">{t.contact.title}</h2></div><div className="contact-copy"><p>{t.contact.body}</p><div className="contact-actions"><a className="button button-bright" href="https://wa.me/6289513559554" target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp <ArrowUpRight size={16} /></a><a className="button button-outline" href="mailto:henrynugraha1210@gmail.com"><Mail size={18} /> Email <ArrowUpRight size={16} /></a></div><div className="social-links"><a href="https://github.com/nugrahahenry" target="_blank" rel="noreferrer"><Github size={19} /> GitHub</a><a href="https://www.linkedin.com/in/nugrahahenry/" target="_blank" rel="noreferrer"><Linkedin size={19} /> LinkedIn</a><a href="https://instagram.com/hnry.dev" target="_blank" rel="noreferrer"><Instagram size={19} /> @hnry.dev</a></div></div></div></section>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><Asterisk size={18} /></span><span>HenryLabs</span></a><span>{t.footer}</span><span>© 2026</span></footer>
    </main>
    </MotionConfig>
  );
}
