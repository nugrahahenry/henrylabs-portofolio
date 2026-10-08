"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Credential } from "@/content/credentials";
import { useSitePreferences } from "./site-preferences";

export function CredentialViewer({ record, onClose }: { record: Credential | null; onClose: () => void }) {
  return record ? <CertificateDialog key={record.id} record={record} onClose={onClose} /> : null;
}

function CertificateDialog({ record, onClose }: { record: Credential; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const imageArea = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [zoomed, setZoomed] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [previewAvailable, setPreviewAvailable] = useState(true);
  const { language } = useSitePreferences();
  const isEn = language === "en";
  const zoomLabel = zoomed ? (isEn ? "Fit certificate" : "Sesuaikan sertifikat") : (isEn ? "Zoom certificate" : "Perbesar sertifikat");
  const close = useCallback(() => closeRef.current(), []);
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
  useEffect(() => {
    imageArea.current?.scrollTo(0, 0);
    if (zoomed) imageArea.current?.focus({ preventScroll: true });
  }, [zoomed]);
  const retry = () => {
    dialog.current?.querySelector<HTMLButtonElement>(".credential-dialog-bar button")?.focus();
    setStatus("loading");
    setAttempt(value => value + 1);
  };
  return <dialog ref={dialog} className="credential-dialog" data-lenis-prevent aria-labelledby="credential-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="credential-dialog-inner">
      <div className="credential-dialog-bar"><div><small>{record.issuer}</small><h2 id="credential-dialog-title">{record.title}</h2></div><button type="button" aria-label={language === "en" ? "Close certificate viewer" : "Tutup sertifikat"} title={language === "en" ? "Close" : "Tutup"} onClick={close}><X size={20} /></button></div>
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
    </div>
  </dialog>;
}
