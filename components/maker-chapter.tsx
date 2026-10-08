"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2 } from "lucide-react";
import { motion, useInView, useMotionValueEvent, useScroll } from "motion/react";
import { certificates, type Credential } from "@/content/credentials";
import { orbitTechNodes, stackGroups } from "@/content/technologies";
import { findWorld } from "@/content/catalog";
import { PortraitReveal } from "./portrait-reveal";
import { SiteLink, useSitePreferences } from "./site-preferences";
import { CredentialViewer } from "./credential-viewer";
import { MakerOrbitField } from "./maker-orbit-field";
import { makerGroupAt, MAKER_RETREAT_START, MAKER_PROOF_START, type OrbitRotation } from "./maker-motion";

const featured = certificates.filter(record => record.featuredOrder !== null);
const groups = [...stackGroups.map((group, i) => ({ label: group.label, items: orbitTechNodes.filter(tech => group.items.some(item => item[0] === tech.label) || i === 2 && !stackGroups.some(entry => entry.items.some(item => item[0] === tech.label))) })), { label: "All", items: orbitTechNodes }];

function ToolIcon({ slug, label, color }: { slug: string; label: string; color: string }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => { if (image.current?.complete && !image.current.naturalWidth) setFailed(true); }, []);
  return <span className="maker-tool-icon" aria-hidden="true">{failed ? <small>{label.slice(0, 2)}</small> : <img ref={image} src={`https://cdn.simpleicons.org/${slug}/${color}`} width="28" height="28" alt="" loading="lazy" onError={() => setFailed(true)} />}</span>;
}

export function MakerChapter() {
  const { language, motionOn } = useSitePreferences();
  const en = language === "en";
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const paused = useRef(false);
  const rotation = useRef<OrbitRotation>({ angle: 0, velocity: 0, dragging: false });
  const scrollGroup = useRef(0);
  const [group, setGroup] = useState(0);
  const [selected, setSelected] = useState(orbitTechNodes[0]);
  const [record, setRecord] = useState<Credential | null>(null);
  const [proof, setProof] = useState(false);
  const [room, setRoom] = useState(false);
  const spatial = motionOn && room;
  const visible = useInView(section, { margin: "120px" });
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const items = groups[group].items;
  useMotionValueEvent(scrollYProgress, "change", value => {
    setProof(value > MAKER_PROOF_START);
    const next = makerGroupAt(value);
    if (spatial && next !== scrollGroup.current) {
      setGroup(next); setSelected(groups[next].items[0]);
    }
    scrollGroup.current = next;
    section.current?.style.setProperty("--maker-progress", String(value));
    section.current?.style.setProperty("--tool-retreat", String(Math.min(1, Math.max(0, (value - MAKER_RETREAT_START) / (MAKER_PROOF_START - MAKER_RETREAT_START)))));
  });

  useEffect(() => {
    const media = matchMedia("(min-height: 560px)");
    const sync = () => setRoom(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!spatial) return;
    const value = scrollYProgress.get(), next = makerGroupAt(value);
    scrollGroup.current = next; setGroup(next); setSelected(groups[next].items[0]);
    setProof(value > MAKER_PROOF_START);
  }, [spatial, scrollYProgress]);

  return <section ref={section} className="maker-chapter" id="stack" data-proof={proof} data-motion={motionOn} data-spatial={spatial} aria-labelledby="maker-title">
    <span className="maker-proof-anchor" id="proof" />
    <div className="maker-sticky">
      <div className="maker-heading" id="method">
        <h2 id="maker-title">Henry <br />Nugraha<span>.</span></h2>
        <p>{en ? "The person behind the worlds." : "Orang di balik semua dunia."}</p>
        <div className="maker-principles"><span>{en ? "Notice." : "Amati."}</span><span>{en ? "Shape." : "Bentuk."}</span><span>{en ? "Build." : "Bangun."}</span></div>
      </div>
      <div ref={stage} className="maker-scene" data-all={group === 3} aria-label={en ? "Henry and his technology orbit" : "Henry dan orbit teknologinya"}>
        <PortraitReveal />
        {spatial && visible && !proof && <MakerOrbitField items={items} nodes={nodes} paused={paused} rotation={rotation} progress={scrollYProgress} selected={selected.label} />}
      <div className="maker-tools-controls" onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}>
        <div role="group" aria-label={en ? "Technology group" : "Kelompok teknologi"} className="maker-groups">
          {groups.map((entry, index) => <button key={entry.label} type="button" aria-pressed={index === group} onClick={() => { setGroup(index); setSelected(entry.items[0]); }}>{entry.label}<small>{entry.items.length}</small></button>)}
        </div>
        {spatial && <div className="maker-orbit-turn">
          <button type="button" title={en ? "Rotate technologies left" : "Putar teknologi ke kiri"} aria-label={en ? "Rotate technologies left" : "Putar teknologi ke kiri"} onClick={() => { rotation.current.velocity = -3.5; }}><ArrowLeft size={17} /></button>
          <button type="button" title={en ? "Rotate technologies right" : "Putar teknologi ke kanan"} aria-label={en ? "Rotate technologies right" : "Putar teknologi ke kanan"} onClick={() => { rotation.current.velocity = 3.5; }}><ArrowRight size={17} /></button>
        </div>}
      </div>

        <div className="maker-tools" aria-label={en ? "Technology stack orbit" : "Orbit teknologi"} onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }} onFocus={() => { paused.current = true; rotation.current.velocity = 0; }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) paused.current = false; }}>
          {items.map((tech, index) => <button key={tech.label} ref={element => { nodes.current[index] = element; }} type="button" className="maker-tool" style={{ "--tool-color": `#${tech.color}`, "--tool-delay": `${index * -.4}s` } as CSSProperties} aria-label={tech.label} aria-pressed={selected.label === tech.label} onClick={() => setSelected(tech)}>
            <ToolIcon {...tech} /><span>{tech.label}</span>
          </button>)}
        </div>
      </div>
      <div className="maker-tool-detail" aria-live="polite">
        <strong>{selected.label}</strong>
        {selected.projectIds.length ? <div>{selected.projectIds.map(id => { const project = findWorld(id)!; return <SiteLink key={id} href={`/projects/${project.slug}`}>{project.name}<ArrowUpRight size={13} /></SiteLink>; })}</div> : <p>{en ? "Part of my working toolkit." : "Bagian dari perangkat kerjaku."}</p>}
      </div>
      <div className="maker-proof-heading"><h3>{en ? "Always learning." : "Terus belajar."}</h3><SiteLink href="/credentials">{en ? "Credential library" : "Library kredensial"}<ArrowUpRight size={17} /></SiteLink></div>
      <div className="maker-evidence" aria-label={en ? "Selected credentials" : "Kredensial pilihan"}>
        {featured.map((certificate, index) => <Evidence key={certificate.id} record={certificate} index={index} spatial={spatial} language={language} progress={scrollYProgress} onOpen={() => setRecord(certificate)} />)}
      </div>
    </div>
    <CredentialViewer record={record} onClose={() => setRecord(null)} />
  </section>;
}

function Evidence({ record, index, spatial, language, progress, onOpen }: { record: Credential; index: number; spatial: boolean; language: string; progress: ReturnType<typeof useScroll>["scrollYProgress"]; onOpen: () => void }) {
  const element = useRef<HTMLButtonElement>(null);
  const update = (value: number) => {
    const node = element.current;
    if (!node) return;
    const t = spatial ? Math.min(1, Math.max(0, (value - .72 - index * .025) / .12)) : 1;
    const eased = 1 - Math.pow(1 - t, 3);
    node.style.setProperty("--evidence-rise", `${(1 - eased) * 85}svh`);
    node.style.setProperty("--evidence-turn", `${(1 - eased) * (index % 2 ? -22 : 22)}deg`);
    node.style.setProperty("--evidence-drift", `${Math.sin(value * Math.PI * 2 + index * 1.8) * 9}px`);
    node.style.setProperty("--evidence-opacity", String(Math.min(1, t * 4)));
    node.dataset.arrived = String(t > .95);
    node.inert = spatial && t < .95;
  };
  useMotionValueEvent(progress, "change", update);
  useEffect(() => {
    const sync = () => update(progress.get());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [spatial]); // Scroll, not a timer, owns the reversible throw.
  return <motion.button ref={element} type="button" className={`maker-evidence-card maker-evidence-card--${index}`} onClick={onOpen} aria-label={`${language === "en" ? "Inspect" : "Lihat"} ${record.title} certificate`} whileHover={spatial ? { scale: 1.035, rotate: 0 } : undefined} style={{ "--evidence-rise": "85svh", "--evidence-opacity": 0 } as CSSProperties}>
    <img src={record.thumbnail} alt={record.alt} width="720" height="510" loading="lazy" />
    <span><span><small>{record.issuer}</small><strong>{record.title}</strong></span><Maximize2 size={16} aria-hidden="true" /></span>
  </motion.button>;
}
