"use client";

import { useCallback, useState } from "react";
import { ImageOff } from "lucide-react";
import { useSitePreferences } from "./site-preferences";

export function LibraryThumbnail({ src, alt, eager = false, className = "" }: { src: string; alt: string; eager?: boolean; className?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const { language } = useSitePreferences();
  const attach = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setState(image.naturalWidth ? "ready" : "error");
  }, []);
  return <span className={`library-thumbnail ${className}`} data-image-state={state}>
    <img ref={attach} src={src} alt={alt} loading={eager ? "eager" : "lazy"} aria-hidden={state === "error" || undefined} onError={() => setState("error")} onLoad={() => setState("ready")} />
    {state === "error" && <span className="library-thumbnail-unavailable"><ImageOff size={24} aria-hidden="true" /><span>{language === "en" ? "Preview unavailable" : "Preview belum tersedia"}</span></span>}
  </span>;
}
