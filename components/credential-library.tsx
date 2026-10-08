"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import { certificates, certificateFilters } from "@/content/credentials";
import { CredentialViewer } from "./credential-viewer";
import { LibraryFooter } from "./project-library";
import { updateQuery, useQuery, useSitePreferences } from "./site-preferences";

const issuers = [...new Set(certificates.map(record => record.issuer))].sort();
export function CredentialLibrary() {
  const { language } = useSitePreferences();
  const query = useQuery();
  const isEn = language === "en";
  const search = query.get("q") ?? "";
  const kind = certificateFilters.find(item => item === query.get("kind")) ?? "All";
  const issuer = issuers.includes(query.get("issuer") ?? "") ? query.get("issuer")! : "";
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const results = certificates.filter(record => (kind === "All" || record.kind === kind) && (!issuer || record.issuer === issuer) && terms.every(term => `${record.title} ${record.issuer} ${record.kind}`.toLocaleLowerCase().includes(term)));
  const active = certificates.find(record => record.id === query.get("record")) ?? null;
  const clear = () => updateQuery({ q: null, kind: null, issuer: null, record: null });
  return <main className="library-page credential-library" id="main-content">
    <div className="library-heading"><h1>{isEn ? "Credentials." : "Jejak belajar."}</h1><p>{isEn ? "26 original records. Certifications, coursework, community, and the steps in between." : "26 dokumen asli. Sertifikasi, kelas, komunitas, dan perjalanan di antaranya."}</p></div>
    <div className="library-controls credential-filters"><label className="library-search"><Search size={18} /><span className="sr-only">{isEn ? "Search credentials" : "Cari kredensial"}</span><input type="search" value={search} placeholder={isEn ? "Title or issuer" : "Judul atau penerbit"} onChange={event => updateQuery({ q: event.target.value || null }, true)} /></label><label>{isEn ? "Type" : "Jenis"}<select value={kind} onChange={event => updateQuery({ kind: event.target.value === "All" ? null : event.target.value })}>{certificateFilters.map(item => <option value={item} key={item}>{item === "All" ? (isEn ? "All types" : "Semua jenis") : item}</option>)}</select></label><label>{isEn ? "Issuer" : "Penerbit"}<select value={issuer} onChange={event => updateQuery({ issuer: event.target.value || null })}><option value="">{isEn ? "All issuers" : "Semua penerbit"}</option>{issuers.map(item => <option key={item}>{item}</option>)}</select></label></div>
    <div className="library-results" aria-live="polite"><span>{String(results.length).padStart(2, "0")} / {certificates.length} {isEn ? "records" : "dokumen"}</span>{(search || kind !== "All" || issuer) ? <button className="library-text-link" type="button" onClick={clear}><X size={14} />{isEn ? "Clear filters" : "Hapus filter"}</button> : <span>{isEn ? "Original documents" : "Dokumen asli"}</span>}</div>
    <div className="credential-library-grid">{results.map((record, index) => <article key={record.id} className="credential-record">
      <button className="credential-record-preview" type="button" onClick={() => updateQuery({ record: record.id })} aria-label={`${isEn ? "Open" : "Buka"} ${record.title}`}><img src={record.thumbnail} alt={record.alt} loading={index < 3 ? "eager" : "lazy"} /><span className="credential-expand"><ArrowUpRight size={18} /></span></button>
      <div className="credential-record-copy"><span className="record-status">{record.issuer} / {record.kind}</span><h2>{record.title}</h2><div className="credential-record-foot"><span>{record.date === "Date not shown" && !isEn ? "Tanggal tidak tercantum" : record.date}</span>{record.source && <a href={record.source} target="_blank" rel="noreferrer">{isEn ? "Source PDF" : "PDF asli"}<ArrowUpRight size={14} /></a>}</div></div>
    </article>)}</div>
    {results.length === 0 && <div className="library-empty"><Search size={28} /><h2>{isEn ? "No matching records." : "Belum ada dokumen yang cocok."}</h2><button className="library-text-link" type="button" onClick={clear}><X size={16} />{isEn ? "Clear filters" : "Hapus filter"}</button></div>}
    <CredentialViewer record={active} onClose={() => updateQuery({ record: null }, true)} />
    <LibraryFooter />
  </main>;
}
