"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Asterisk, Menu } from "lucide-react";
import { SiteLink, useSitePreferences } from "./site-preferences";

export function SiteHeader() {
  const { language, motionOn, reducedMotionActive, toggleLanguage, toggleMotion } = useSitePreferences();
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const links = [
    { path: "/projects", label: language === "en" ? "Projects" : "Proyek" },
    { path: "/credentials", label: "Credentials" },
    { path: "/#contact", label: language === "en" ? "Contact" : "Kontak" },
  ];
  return <header className="site-header">
    <SiteLink className="brand" href="/" aria-label="StarGod home"><span className="brand-mark"><Asterisk size={18} /></span><span>StarGod</span></SiteLink>
    <nav className="desktop-nav" aria-label="Primary navigation">{links.map(link => <SiteLink key={link.path} href={link.path} aria-current={pathname.startsWith(link.path) ? "page" : undefined}>{link.label}</SiteLink>)}</nav>
    <div className="header-controls">
      <button className="motion-toggle" type="button" onClick={toggleMotion} disabled={reducedMotionActive} aria-label={reducedMotionActive ? "Reduced motion follows device preference" : "Animation"} aria-pressed={motionOn} title={reducedMotionActive ? "Reduced motion follows device preference" : motionOn ? "Turn motion off" : "Turn motion on"}><span className={`signal-dot${motionOn ? " signal-dot--on" : ""}`} />{motionOn ? "Motion" : "Still"}</button>
      <button className="language-toggle" type="button" onClick={toggleLanguage} aria-label="Toggle language"><span className={language === "en" ? "is-active" : ""}>EN</span><span>/</span><span className={language === "id" ? "is-active" : ""}>ID</span></button>
      <details className="mobile-nav" ref={menu} onKeyDown={event => { if (event.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
        <summary aria-label={language === "en" ? "Navigation" : "Navigasi"}><Menu size={18} /></summary>
        <nav aria-label="Mobile navigation">{links.map(link => <SiteLink href={link.path} key={link.path} onClick={() => { if (menu.current) menu.current.open = false; }}>{link.label}<ArrowUpRight size={16} /></SiteLink>)}</nav>
      </details>
    </div>
  </header>;
}
