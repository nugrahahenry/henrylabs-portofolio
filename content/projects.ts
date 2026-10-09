import type { ProjectId } from "../components/cosmic-canvas";
export type Language = "en" | "id";

export const projects: Array<{
  id: ProjectId;
  name: string;
  logo: string;
  color: string;
  status: Record<Language, string>;
  visibility: Record<Language, string>;
  access: Record<Language, string>;
  summary: Record<Language, string>;
  flow: Record<Language, string[]>;
  signature: Record<Language, string[]>;
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
  mediaKind?: "artwork" | "concept";
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
    signature: { en: ["gesture", "emotion", "voice"], id: ["gesture", "emosi", "suara"] },
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
    mediaAlt: "Catmoji product artwork with the Moji mascot and gesture recognition concept",
    mediaKind: "artwork",
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
    signature: { en: ["capture", "structure", "revisit"], id: ["capture", "struktur", "pelajari ulang"] },
    link: "https://nalira-hengs.vercel.app/dashboard",
    linkLabel: { en: "Open MVP", id: "Buka MVP" },
    role: { en: "Product / AI workflow", id: "Produk / workflow AI" },
    signal: { en: "Make knowledge usable", id: "Bikin knowledge berguna" },
    year: "2026",
    stack: ["Next.js", "Supabase", "Groq", "TypeScript"],
    ownership: { en: "Solo product build", id: "Dibangun sendiri" },
    evidence: { en: "Public MVP with a grounded learning workflow", id: "MVP publik dengan workflow belajar yang grounded" },
    next: { en: "Open the MVP and follow the capture journey", id: "Buka MVP dan ikuti capture journey" },
    media: "/assets/projects/nalira-ambient.svg",
    mediaAlt: "Nalira folded-light ambient artwork showing source fragments opening into a structured learning surface",
    mediaKind: "concept",
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
    signature: { en: ["context", "assist", "handoff"], id: ["konteks", "bantu", "handoff"] },
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
    signature: { en: ["message", "guard", "handoff"], id: ["pesan", "jaga", "handoff"] },
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
    signature: { en: ["camera", "play", "memory"], id: ["kamera", "bermain", "memori"] },
    link: "mailto:henrynugraha1210@gmail.com",
    linkLabel: { en: "Discuss the experience", id: "Bahas experience ini" },
    role: { en: "Creative web / camera", id: "Web kreatif / kamera" },
    signal: { en: "Interface as memory", id: "Interface jadi memori" },
    year: "2026",
    stack: ["JavaScript", "HTML", "CSS", "PWA"],
    ownership: { en: "Solo creative web build", id: "Dibangun sendiri sebagai web kreatif" },
    evidence: { en: "Original product artwork; experience in development", id: "Artwork produk asli; experience masih dikembangkan" },
    next: { en: "Request a preview of the work in progress", id: "Minta preview pekerjaan yang masih dikembangkan" },
    media: "/assets/projects/polara-og.png",
    mediaAlt: "Polara product artwork with a photo strip and the original mascot",
    mediaKind: "artwork",
  },
];

export const academicProjects = [
  { title: "RentalMobil.SG", tag: "OOP · Semester 2", body: "A car-rental web system with vehicle catalog, authentication, booking, payment confirmation, user area, and admin operations.", signal: "Model → reserve → confirm", output: "Booking flow", stack: ["PHP", "MySQL"], color: "#efc95f", linkLabel: "Class build · local" },
  { title: "POS Z Shoes", tag: "APBDS · Semester 3", body: "A point-of-sale system with product, supplier, purchase, customer transaction, return, dashboard, and reporting flows.", signal: "Stock → sale → report", output: "Business flow", stack: ["C#", "WinForms"], color: "#ef8e73", link: "https://github.com/nugrahahenry/POS_APBDS", linkLabel: "View source" },
  { title: "LabQ", tag: "Mobile & Web · Semester 4", body: "A digital health laboratory platform connecting patients, lab staff, and admins from registration to test results.", signal: "Register → test → result", output: "Health workflow", stack: ["Java", "Android", "Laravel", "PostgreSQL"], color: "#60c9b0", link: "https://github.com/nugrahahenry/labQ-Android", linkLabel: "View source" },
];

export const clientStacks = { yventures: ["n8n"], soreva: ["Node.js", "Next.js", "React", "TypeScript"] };

export const clientProjects = [
  { title: "Y-Ventures chatbot", body: "n8n-based vendor-matching chatbot for event planning, grounded in researched vendor data with filtering, price sorting, and quote calculation.", context: { en: "Event planning / vendor discovery", id: "Perencanaan event / pencarian vendor" }, ownership: { en: "Solo by Henry · private", id: "Dibangun sendiri Henry · privat" }, output: { en: "Matching + quote path", id: "Pencocokan + alur quote" }, boundary: { en: "Private data omitted", id: "Data privat tidak ditampilkan" }, signal: { en: "Research → match → quote", id: "Riset → cocokkan → quote" }, color: "#6ee7f4" },
  { title: "Soreva Autonomous Content", body: "Social-media content automation for grounded discovery, editorial generation, branded media, review, scheduling, and controlled publishing.", context: { en: "Social content operations", id: "Operasional konten sosial" }, ownership: { en: "Henry solo build + Vieri prototype account", id: "Build Henry + akun prototype Vieri" }, output: { en: "Discovery → review → publishing", id: "Discovery → review → publishing" }, boundary: { en: "Prototype account by Vieri", id: "Akun prototype oleh Vieri" }, signal: { en: "Discover → review → publish", id: "Temukan → review → publish" }, color: "#ff82c8" },
];
