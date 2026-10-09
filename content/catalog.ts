import { projects, academicProjects, clientProjects, clientStacks } from "./projects";
import type { Language } from "./projects";

type Text = Record<Language, string>;
export type Category = "henrylabs" | "university" | "client";
export type CatalogProject = {
  id: string; slug: string; category: Category; name: string; color: string;
  summary: Text; flow: Record<Language, string[]>; role: Text; ownership: Text;
  status: Text; access: Text; evidence: Text; next: Text; stack: string[];
  logo?: string; media?: string; mediaAlt?: string; mediaKind?: "artwork" | "concept"; source?: string;
  link?: string; linkLabel?: Text;
};
export const categories: Record<"all" | Category, Text> = {
  all: { en: "All projects", id: "Semua proyek" },
  henrylabs: { en: "HenryLabs", id: "HenryLabs" },
  university: { en: "University", id: "Kuliah" },
  client: { en: "Client Work", id: "Proyek Klien" },
};

const academicIds = ["rental", "pos", "labq"];
const academicSlugs = ["rentalmobil-sg", "pos-z-shoes", "labq"];
const academicIndonesian = [
  "Sistem rental mobil berbasis web: katalog kendaraan, autentikasi, pemesanan, konfirmasi pembayaran, area pengguna, dan operasional admin.",
  "Sistem point-of-sale dengan alur produk, pemasok, pembelian, transaksi pelanggan, retur, dashboard, dan laporan.",
  "Platform laboratorium kesehatan digital yang menghubungkan pasien, staf laboratorium, dan admin, dari pendaftaran sampai hasil pemeriksaan.",
];
const academicFlows = [["Model", "Pesan", "Konfirmasi"], ["Stok", "Penjualan", "Laporan"], ["Daftar", "Pemeriksaan", "Hasil"]];
const clientIds = ["yventures", "soreva"] as const;
const clientIndonesian = [
  "Chatbot pencocokan vendor berbasis n8n untuk perencanaan event. Data vendor hasil riset menjadi dasar filter, pengurutan harga, dan perhitungan penawaran.",
  "Automation konten sosial untuk discovery berbasis sumber, editorial, media bermerek, review, penjadwalan, dan publikasi terkontrol.",
];

// Catalog, planet actions, and detail pages project the same existing public records.
export const projectCatalog: CatalogProject[] = [
  ...projects.map(project => ({ ...project, slug: project.id, category: "henrylabs" as const })),
  ...academicProjects.map((project, index) => ({
    id: academicIds[index], slug: academicSlugs[index], category: "university" as const,
    name: project.title, color: project.color, stack: project.stack,
    summary: { en: project.body, id: academicIndonesian[index] },
    role: { en: project.tag, id: project.tag },
    ownership: { en: "Solo build by Henry", id: "Dibangun sendiri oleh Henry" },
    status: { en: "University build", id: "Proyek kuliah" },
    access: project.link ? { en: "Public source", id: "Source publik" } : { en: "Local class build", id: "Proyek kuliah lokal" },
    flow: { en: project.signal.split(" → "), id: academicFlows[index] },
    evidence: { en: `${project.output}. ${project.link ? "Public repository available." : "Local coursework; no public repository is linked."}`, id: project.link ? "Alur sistem dan repository publik tersedia untuk ditinjau." : "Project kuliah lokal; belum ada repository publik yang ditautkan." },
    next: { en: project.link ? "Inspect the implementation in the repository." : "Discuss the coursework and request a walkthrough.", id: project.link ? "Tinjau implementasi di repository." : "Bahas proyek kuliah dan minta walkthrough." },
    source: project.link,
  })),
  ...clientProjects.map((project, index) => ({
    id: clientIds[index], slug: index === 0 ? "y-ventures" : "soreva", category: "client" as const,
    name: project.title, color: project.color, stack: clientStacks[clientIds[index]],
    summary: { en: project.body, id: clientIndonesian[index] }, role: project.context,
    ownership: project.ownership,
    status: { en: "Client work", id: "Proyek klien" },
    access: { en: "Private walkthrough", id: "Walkthrough privat" },
    flow: { en: project.signal.en.split(" → "), id: project.signal.id.split(" → ") },
    evidence: project.output,
    next: { en: "Request a focused, sanitized walkthrough. Private data and source remain protected.", id: "Minta walkthrough terarah yang disanitasi. Data dan source privat tetap dilindungi." },
  })),
];

export const findProject = (slug: string) => projectCatalog.find(project => project.slug === slug);
export const findWorld = (id: string) => projectCatalog.find(project => project.id === id);
export function normalizeCategory(value: string | null): "all" | Category {
  return value === "henrylabs" || value === "university" || value === "client" ? value : "all";
}
export function filterProjects(category: string | null, query: string) {
  const selected = normalizeCategory(category);
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return projectCatalog.filter(project => {
    const content = `${project.name} ${project.summary.en} ${project.summary.id} ${project.stack.join(" ")}`.toLocaleLowerCase();
    return (selected === "all" || project.category === selected) && terms.every(term => content.includes(term));
  });
}
