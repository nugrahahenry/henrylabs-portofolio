"use client";
import { ArrowLeft } from "lucide-react";
import { SiteLink, useSitePreferences } from "@/components/site-preferences";

export default function NotFound() {
  const { language } = useSitePreferences();
  return <main className="library-page"><div className="library-heading"><span className="library-eyebrow">StarGod / 404</span><h1>{language === "en" ? "World not found." : "Dunia tidak ditemukan."}</h1><SiteLink href="/projects" className="library-text-link"><ArrowLeft size={18} />{language === "en" ? "Browse projects" : "Lihat proyek"}</SiteLink></div></main>;
}
