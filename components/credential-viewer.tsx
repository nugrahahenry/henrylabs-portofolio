"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Credential } from "@/content/credentials";
import { useSitePreferences } from "./site-preferences";

type ViewerProps = {
  record: Credential | null;
  collection: readonly Credential[];
  onSelect: (record: Credential) => void;
  onClose: () => void;
};

export function CredentialViewer(props: ViewerProps) {
  return props.record ? <CertificateDialog {...props} record={props.record} /> : null;
}

function CertificateDialog({ record, collection, onSelect, onClose }: ViewerProps & { record: Credential }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { language } = useSitePreferences();
  const isEn = language === "en";
  const index = collection.findIndex(item => item.id === record.id);
  const hasGallery = index >= 0 && collection.length > 1;
  const close = useCallback(() => closeRef.current(), []);
  const select = (direction: number) => {
    const next = hasGallery ? collection[index + direction] : undefined;
    if (!next) return;
    // Keep focus in the persistent toolbar while the document content resets.
    const canContinue = Boolean(collection[index + direction * 2]);
    dialog.current?.querySelector<HTMLButtonElement>(canContinue ? `[data-direction="${direction}"]` : ".credential-dialog-close")?.focus();
    onSelect(next);
  };
  useEffect(() => {
    if (!dialog.current) return;
    const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    const element = dialog.current;
    element.showModal();
    document.body.style.overflow = "hidden";
    element.querySelector<HTMLElement>("button")?.focus();
    return () => { element.close(); document.body.style.overflow = previous; if (target?.isConnected) target.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="credential-dialog" data-lenis-prevent aria-labelledby="credential-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => {
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !event.altKey && !event.ctrlKey && !event.metaKey && !dialog.current?.querySelector(".is-zoomed")) {
      event.preventDefault();
      select(event.key === "ArrowLeft" ? -1 : 1);
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="credential-dialog-inner">
      <div className="credential-dialog-bar">
        <div className="credential-dialog-heading" aria-live="polite" aria-atomic="true"><small>{record.issuer}</small><h2 id="credential-dialog-title">{record.title}</h2></div>
        <button className="credential-dialog-close" type="button" aria-label={isEn ? "Close certificate viewer" : "Tutup sertifikat"} title={isEn ? "Close" : "Tutup"} onClick={close}><X size={20} /></button>
        {hasGallery && <nav className="credential-dialog-navigation" aria-label={isEn ? "Certificate collection" : "Koleksi sertifikat"}>
          <span className="credential-dialog-count">{String(index + 1).padStart(2, "0")} <span>/ {String(collection.length).padStart(2, "0")}</span></span>
          <button type="button" data-direction="-1" disabled={index === 0} onClick={() => select(-1)} aria-label={isEn ? "Previous certificate" : "Sertifikat sebelumnya"} title={isEn ? "Previous certificate" : "Sertifikat sebelumnya"}><ChevronLeft size={18} /></button>
          <button type="button" data-direction="1" disabled={index === collection.length - 1} onClick={() => select(1)} aria-label={isEn ? "Next certificate" : "Sertifikat berikutnya"} title={isEn ? "Next certificate" : "Sertifikat berikutnya"}><ChevronRight size={18} /></button>
        </nav>}
      </div>
      <CertificateDocument key={record.id} record={record} />
    </div>
  </dialog>;
}

function CertificateDocument({ record }: { record: Credential }) {
  const imageArea = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [previewAvailable, setPreviewAvailable] = useState(true);
  const { language } = useSitePreferences();
  const isEn = language === "en";
  const zoomLabel = zoomed ? (isEn ? "Fit certificate" : "Sesuaikan sertifikat") : (isEn ? "Zoom certificate" : "Perbesar sertifikat");
  useEffect(() => {
    imageArea.current?.scrollTo(0, 0);
    if (zoomed) imageArea.current?.focus({ preventScroll: true });
  }, [zoomed]);
  const retry = () => {
    imageArea.current?.closest("dialog")?.querySelector<HTMLButtonElement>(".credential-dialog-close")?.focus();
    setStatus("loading");
    setAttempt(value => value + 1);
  };
  return <>
      <div className="credential-dialog-stage" data-image-state={status}>
        <div ref={imageArea} className={`credential-dialog-image${zoomed ? " is-zoomed" : ""}`} role="region" aria-label={isEn ? "Certificate image" : "Gambar sertifikat"} aria-busy={status === "loading"} tabIndex={zoomed ? 0 : -1}>
          <div className="credential-dialog-sheet">
            {status !== "ready" && previewAvailable && <img className="credential-dialog-preview" src={record.thumbnail} alt="" aria-hidden="true" onError={() => setPreviewAvailable(false)} />}
            <img key={attempt} data-credential-original className="credential-dialog-original" src={attempt ? `${record.image}?retry=${attempt}` : record.image} alt={record.alt} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
          </div>
        </div>
        {status !== "ready" && <div className="credential-image-notice">
          <p role={status === "error" ? "alert" : "status"}>{status === "loading" ? <><LoaderCircle className="credential-loading-icon" size={17} aria-hidden="true" />{isEn ? "Loading full-size image..." : "Memuat gambar ukuran penuh..."}</> : (isEn ? "The full-size image could not load." : "Gambar ukuran penuh belum berhasil dimuat.")}</p>
          {status === "error" && <button type="button" onClick={retry} aria-label={isEn ? "Retry image" : "Coba muat lagi"} title={isEn ? "Retry image" : "Coba muat lagi"}><RotateCcw size={18} /></button>}
        </div>}
      </div>
      <div className="credential-dialog-foot"><span>{record.kind} / {record.date === "Date not shown" && !isEn ? "Tanggal tidak tercantum" : record.date}<br />{isEn ? "Watermarked portfolio copy" : "Salinan portofolio ber-watermark"}</span><button type="button" disabled={status !== "ready"} onClick={() => setZoomed(value => !value)} aria-pressed={zoomed} aria-label={zoomLabel} title={zoomLabel}>{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button>{record.source && <a href={record.source} target="_blank" rel="noreferrer">{isEn ? "PDF preview" : "Preview PDF"}<ArrowUpRight size={16} /></a>}<a href={record.image} target="_blank" rel="noreferrer">{isEn ? "Full-size preview" : "Preview ukuran penuh"}<ArrowUpRight size={16} /></a></div>
  </>;
}
