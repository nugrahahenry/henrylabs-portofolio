"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowUpRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { Credential } from "@/content/credentials";
import { useSitePreferences } from "./site-preferences";

export function CredentialViewer({ record, onClose }: { record: Credential | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [zoomed, setZoomed] = useState(false);
  const { language } = useSitePreferences();
  const close = useCallback(() => closeRef.current(), []);
  useEffect(() => {
    if (!record || !dialog.current) return;
    const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    const element = dialog.current;
    setZoomed(false);
    element.showModal();
    document.body.style.overflow = "hidden";
    element.querySelector<HTMLElement>("button")?.focus();
    return () => { element.close(); document.body.style.overflow = previous; if (target?.isConnected) target.focus({ preventScroll: true }); };
  }, [record?.id]);
  if (!record) return null;
  return <dialog ref={dialog} className="credential-dialog" data-lenis-prevent aria-labelledby="credential-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="credential-dialog-inner">
      <div className="credential-dialog-bar"><div><small>{record.issuer}</small><h2 id="credential-dialog-title">{record.title}</h2></div><button type="button" aria-label={language === "en" ? "Close certificate viewer" : "Tutup sertifikat"} title={language === "en" ? "Close" : "Tutup"} onClick={close}><X size={20} /></button></div>
      <div className={`credential-dialog-image${zoomed ? " is-zoomed" : ""}`}><img src={record.image} alt={record.alt} /></div>
      <div className="credential-dialog-foot"><span>{record.kind} / {record.date === "Date not shown" && language === "id" ? "Tanggal tidak tercantum" : record.date}</span><button type="button" onClick={() => setZoomed(value => !value)} aria-label={zoomed ? "Fit certificate" : "Zoom certificate"} title={zoomed ? "Fit certificate" : "Zoom certificate"}>{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button>{record.source && <a href={record.source} target="_blank" rel="noreferrer">{language === "en" ? "Source PDF" : "PDF asli"}<ArrowUpRight size={16} /></a>}<a href={record.image} target="_blank" rel="noreferrer">{language === "en" ? "Original image" : "Gambar asli"}<ArrowUpRight size={16} /></a></div>
    </div>
  </dialog>;
}
