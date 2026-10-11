"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { SiteLink, useSitePreferences } from "./site-preferences";
import { StarGodMark } from "./stargod-mark";
import { advanceHeaderScroll, createHeaderScroll } from "./header-scroll";

export function SiteHeader() {
  const { language, motionOn, reducedMotionActive, toggleLanguage, toggleMotion } = useSitePreferences();
  const menu = useRef<HTMLDetailsElement>(null);
  const header = useRef<HTMLElement>(null);
  const scrollState = useRef(createHeaderScroll());
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  const reveal = () => {
    scrollState.current = createHeaderScroll(Math.max(0, window.scrollY));
    setHidden(false);
  };
  useEffect(() => {
    if (menu.current) menu.current.open = false;
    let frame = 0;
    let viewportWidth = window.innerWidth;
    const reset = () => {
      scrollState.current = createHeaderScroll(Math.max(0, window.scrollY));
      setHidden(false);
    };
    reset();
    const sample = () => {
      frame = 0;
      const pinned = Boolean(menu.current?.open || header.current?.querySelector(":focus-visible"));
      const next = advanceHeaderScroll(scrollState.current, window.scrollY, document.documentElement.scrollHeight - window.innerHeight, pinned);
      if (next.hidden !== scrollState.current.hidden) setHidden(next.hidden);
      scrollState.current = next;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(sample); };
    const onResize = () => {
      // Mobile browser chrome changes height during a scroll, not navigation intent.
      if (window.innerWidth === viewportWidth) return;
      viewportWidth = window.innerWidth;
      if (menu.current) menu.current.open = false;
      reset();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pageshow", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", reset);
    };
  }, [pathname]);
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, []);
  const links = [
    { path: "/projects", label: language === "en" ? "Projects" : "Proyek" },
    { path: "/credentials", label: "Credentials" },
    { path: "/#contact", label: language === "en" ? "Contact" : "Kontak" },
  ];
  return <header ref={header} className="site-header" data-hidden={hidden} onFocusCapture={reveal}>
    <a className="skip-to-content" href="#main-content">{language === "en" ? "Skip to content" : "Langsung ke konten"}</a>
    <SiteLink className="brand" href="/" aria-label="StarGod home"><span className="brand-mark"><StarGodMark /></span><span>StarGod</span></SiteLink>
    <nav className="desktop-nav" aria-label="Primary navigation">{links.map(link => <SiteLink key={link.path} href={link.path} aria-current={pathname.startsWith(link.path) ? "page" : undefined}>{link.label}</SiteLink>)}</nav>
    <div className="header-controls">
      <button className="motion-toggle" type="button" onClick={toggleMotion} disabled={reducedMotionActive} aria-label={reducedMotionActive ? "Reduced motion follows device preference" : "Animation"} aria-pressed={motionOn} title={reducedMotionActive ? "Reduced motion follows device preference" : motionOn ? "Turn motion off" : "Turn motion on"}><span className={`signal-dot${motionOn ? " signal-dot--on" : ""}`} />{motionOn ? "Motion" : "Still"}</button>
      <button className="language-toggle" type="button" onClick={toggleLanguage} aria-label="Toggle language"><span className={language === "en" ? "is-active" : ""}>EN</span><span>/</span><span className={language === "id" ? "is-active" : ""}>ID</span></button>
      <details className="mobile-nav" ref={menu} onToggle={event => { if (event.currentTarget.open) reveal(); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape" && menu.current) { event.preventDefault(); menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
        <summary aria-label={language === "en" ? "Navigation" : "Navigasi"}><Menu size={18} /></summary>
        <nav aria-label="Mobile navigation">{links.map(link => <SiteLink href={link.path} key={link.path} aria-current={pathname.startsWith(link.path) ? "page" : undefined} onClick={() => { if (menu.current) menu.current.open = false; }}>{link.label}<ArrowUpRight size={16} /></SiteLink>)}</nav>
      </details>
    </div>
  </header>;
}
