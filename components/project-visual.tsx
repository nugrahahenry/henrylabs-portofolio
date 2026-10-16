"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Expand, LoaderCircle, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { CatalogProject } from "@/content/catalog";
import { useSitePreferences } from "./site-preferences";
import { useImagePan } from "./use-image-pan";

export function ProjectVisual({ project, captureTitle, captureNote }: { project: CatalogProject; captureTitle?: string; captureNote?: string }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const preview = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A cached failure can finish before React attaches the error handler.
    if (preview.current?.complete && preview.current.naturalWidth === 0) setFailed(true);
  }, [attempt, project.media]);
  const kind = captureTitle ? `${en ? "Application screenshot" : "Screenshot aplikasi"} / ${captureTitle}` : project.mediaKind === "concept" ? (en ? "Concept artwork" : "Artwork konsep") : (en ? "Product artwork" : "Artwork produk");
  const mediaLabel = captureTitle ? "screenshot" : "artwork";
  if (!project.media) return null;
  return <figure className="project-visual" data-project={project.id}>
    <button type="button" className="project-visual-open" onClick={() => setOpen(true)} disabled={failed} aria-label={`${en ? "Inspect" : "Lihat"} ${mediaLabel}: ${captureTitle ?? project.name}`}>
      {!failed && <img ref={preview} key={attempt} src={attempt ? `${project.media}?retry=${attempt}` : project.media} width={project.mediaSize?.[0]} height={project.mediaSize?.[1]} alt={project.mediaAlt ?? project.name} loading="lazy" onError={() => setFailed(true)} />}
      {!failed && <span className="project-visual-expand" aria-hidden="true"><Expand size={18} /></span>}
    </button>
    {failed && <div className="project-visual-error"><p role="status">{captureTitle ? (en ? "Screenshot could not load." : "Screenshot belum berhasil dimuat.") : (en ? "Artwork could not load." : "Artwork belum berhasil dimuat.")}</p><button type="button" aria-label={en ? `Retry ${mediaLabel}` : `Coba muat ${mediaLabel} lagi`} title={en ? `Retry ${mediaLabel}` : `Coba muat ${mediaLabel} lagi`} onClick={() => { setAttempt(value => value + 1); setFailed(false); }}><RotateCcw size={18} /></button></div>}
    <figcaption><span>{kind}</span><span>{project.name}</span></figcaption>
    {open && <ArtworkDialog project={project} kind={kind} capture={Boolean(captureTitle)} captureNote={captureNote} onClose={() => setOpen(false)} />}
  </figure>;
}

function ArtworkDialog({ project, kind, capture, captureNote, onClose }: { project: CatalogProject; kind: string; capture: boolean; captureNote?: string; onClose: () => void }) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const title = useId();
  const [zoomed, setZoomed] = useState(false);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    node.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { node.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  const pan = useImagePan(zoomed && status === "ready");
  useEffect(() => { stage.current?.scrollTo(0, 0); if (zoomed) stage.current?.focus({ preventScroll: true }); }, [zoomed]);
  const noun = capture ? "screenshot" : "artwork";
  const disclosure = capture ? (captureNote ?? (en ? "Actual application screenshot." : "Screenshot aplikasi asli.")) : (en ? "Original artwork, not an application screenshot." : "Artwork asli, bukan screenshot aplikasi.");
  const zoomLabel = zoomed ? (en ? `Fit ${noun}` : `Sesuaikan ${noun}`) : (en ? `Zoom ${noun}` : `Perbesar ${noun}`);
  return <dialog ref={dialog} className="project-art-dialog" data-lenis-prevent aria-labelledby={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="project-art-inner">
      <header><div><h2 id={title}>{project.name}</h2><p>{kind}</p></div><button type="button" className="project-art-close" onClick={onClose} aria-label={en ? `Close ${noun}` : `Tutup ${noun}`} title={en ? `Close ${noun}` : `Tutup ${noun}`}><X size={20} /></button></header>
      <div ref={stage} {...pan} className="project-art-stage" data-zoomed={zoomed} data-image-state={status} role="region" aria-label={en ? `Project ${noun}` : `${capture ? "Screenshot" : "Artwork"} proyek`} aria-busy={status === "loading"} tabIndex={zoomed ? 0 : -1}>
        <img key={attempt} draggable={false} src={attempt ? `${project.media}?retry=${attempt}` : project.media} alt={project.mediaAlt ?? project.name} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
      </div>
      <footer>{status === "ready" ? <span>{disclosure}</span> : <div className="project-art-status"><p role={status === "error" ? "alert" : "status"}>{status === "loading" ? <><LoaderCircle size={18} />{en ? `Loading ${noun}...` : `Memuat ${noun}...`}</> : (en ? `${capture ? "Screenshot" : "Artwork"} could not load.` : `${capture ? "Screenshot" : "Artwork"} belum berhasil dimuat.`)}</p>{status === "error" && <button type="button" aria-label={en ? `Retry ${noun}` : `Coba muat ${noun} lagi`} onClick={() => { dialog.current?.querySelector<HTMLButtonElement>(".project-art-close")?.focus(); setStatus("loading"); setAttempt(value => value + 1); }}><RotateCcw size={18} /></button>}</div>}<button type="button" disabled={status !== "ready"} aria-label={zoomLabel} title={zoomLabel} aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button></footer>
    </div>
  </dialog>;
}
