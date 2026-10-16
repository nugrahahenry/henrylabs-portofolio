"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import { makerLayoutNeedsRestore, makerReadingProgress, MAKER_PROOF_START } from "./maker-motion";

type Reading = { active: boolean; proof: boolean; progress: number; group: number; card: number; focus: HTMLElement | null };

export function useMakerReading(section: RefObject<HTMLElement | null>, progress: MotionValue<number>, viewport: { width: number; height: number }, spatial: boolean, group: number, restore: (group: number, proof: boolean, progress: number) => void) {
  const layout = useRef({ width: 0, height: 0, spatial });
  const reading = useRef<Reading | null>(null);
  const restoring = useRef(false);
  const current = useRef({ spatial, group, restore });
  current.current = { spatial, group, restore };

  const capture = () => {
    const node = section.current, previous = layout.current;
    if (!node || restoring.current || innerWidth !== previous.width || innerHeight !== previous.height || current.current.spatial !== previous.spatial) return;
    const box = node.getBoundingClientRect(), center = innerHeight * .5;
    const active = box.top <= center && box.bottom > center;
    if (!active) { if (reading.current) reading.current.active = false; return; }
    const cards = [...node.querySelectorAll<HTMLElement>(".maker-evidence-card")];
    const focused = document.activeElement instanceof HTMLElement && node.contains(document.activeElement) && !document.activeElement.closest("dialog") ? document.activeElement : null;
    const focusBounds = focused?.getBoundingClientRect();
    const visibleFocus = focusBounds && focusBounds.bottom > 0 && focusBounds.top < innerHeight ? focused : null;
    // In a linear layout both chapters can be visible; the focused reading action wins.
    const proof = current.current.spatial ? progress.get() > MAKER_PROOF_START
      : visibleFocus?.closest(".maker-tools-controls, .maker-tool-detail, .maker-tools") ? false
      : visibleFocus?.closest(".maker-proof-heading, .maker-evidence") ? true
      : (node.querySelector(".maker-evidence")?.getBoundingClientRect().top ?? Infinity) < innerHeight * .65;
    const focusedCard = cards.indexOf(focused!);
    const nearest = !current.current.spatial && proof ? cards.reduce((best, card, index) => Math.abs(card.getBoundingClientRect().top - innerHeight * .2) < Math.abs(cards[best].getBoundingClientRect().top - innerHeight * .2) ? index : best, 0) : 0;
    reading.current = {
      active, proof, group: current.current.group,
      progress: current.current.spatial ? progress.get() : makerReadingProgress(reading.current?.progress ?? 0, current.current.group, proof),
      card: focusedCard >= 0 ? focusedCard : current.current.spatial ? 0 : nearest,
      focus: focused,
    };
  };
  const captureRef = useRef(capture); captureRef.current = capture;

  useEffect(() => {
    const record = () => captureRef.current();
    window.addEventListener("scroll", record, { passive: true });
    document.addEventListener("focusin", record);
    const unsubscribe = progress.on("change", record);
    return () => { window.removeEventListener("scroll", record); document.removeEventListener("focusin", record); unsubscribe(); };
  }, [progress]);

  useLayoutEffect(() => {
    const node = section.current, previous = layout.current, saved = reading.current;
    if (!node || !viewport.width) return;
    const changed = makerLayoutNeedsRestore(previous, { ...viewport, spatial }, window.matchMedia("(pointer: coarse)").matches);
    layout.current = { ...viewport, spatial };
    if (!changed || !saved?.active) { captureRef.current(); return; }
    restoring.current = true;
    // Keep an in-flight exchange in flight; reading holds are only for layout-mode changes.
    const target = makerReadingProgress(saved.progress, saved.group, saved.proof, previous.spatial && spatial);
    current.current.restore(saved.group, saved.proof, target);
    const align = () => {
      if (spatial) {
        window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + Math.max(0, node.offsetHeight - innerHeight) * target, behavior: "instant" });
        progress.set(target);
      } else {
        const anchor = saved.proof ? node.querySelectorAll<HTMLElement>(".maker-evidence-card")[saved.card] : node.querySelector<HTMLElement>(".maker-tools-controls");
        if (anchor) {
          const bounds = anchor.getBoundingClientRect();
          const inset = Math.max(16, Math.min(96, innerHeight * .2, innerHeight - bounds.height - 16));
          window.scrollTo({ top: scrollY + bounds.top - inset, behavior: "instant" });
        }
      }
    };
    align();
    // React and the scroll observer both remeasure when sticky becomes linear (or back).
    const frame = requestAnimationFrame(() => {
      align();
      if (saved.focus?.isConnected && !document.querySelector("dialog[open]") && document.activeElement === document.body) saved.focus.focus({ preventScroll: true });
      restoring.current = false; captureRef.current();
    });
    return () => { cancelAnimationFrame(frame); restoring.current = false; };
  }, [viewport, spatial, section, progress]);

  useLayoutEffect(() => { captureRef.current(); }, [group]);

  return restoring;
}
