"use client";

import { useCallback, useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import { useSitePreferences } from "./site-preferences";

export function LibraryThumbnail({ src, srcSet, sizes, width, height, alt, eager = false, className = "" }: { src: string; srcSet?: string; sizes?: string; width?: number; height?: number; alt: string; eager?: boolean; className?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const { language } = useSitePreferences();
  const attach = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setState(image.naturalWidth ? "ready" : "error");
  }, []);
  return <span className={`library-thumbnail ${className}`} data-image-state={state}>
    <img ref={attach} src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} width={width} height={height} alt={alt} decoding="async" loading={eager ? "eager" : "lazy"} aria-hidden={state === "error" || undefined} onError={() => setState("error")} onLoad={() => setState("ready")} />
    {state === "loading" && <span className="library-thumbnail-loading" aria-hidden="true"><LoaderCircle size={22} /></span>}
    {state === "error" && <span className="library-thumbnail-unavailable"><ImageOff size={24} aria-hidden="true" /><span>{language === "en" ? "Preview unavailable" : "Preview belum tersedia"}</span></span>}
  </span>;
}
