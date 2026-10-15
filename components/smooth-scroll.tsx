"use client";

import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";

type SmoothScrollProps = {
  enabled: boolean;
};

type ScrollRequest = {
  top: number;
  duration?: number;
  interruptible?: boolean;
};

const SCROLL_EVENT = "stargod:scroll-to";
const CANCEL_SCROLL_EVENT = "stargod:scroll-cancel";

export function requestSmoothScroll(top: number, duration = 0.9, interruptible = false) {
  if (typeof window === "undefined" || !Number.isFinite(top)) return;

  if (document.documentElement.dataset.scrollDriver !== "lenis-gsap") {
    window.scrollTo({ top, behavior: "smooth" });
    return;
  }

  window.dispatchEvent(new CustomEvent<ScrollRequest>(SCROLL_EVENT, {
    detail: { top, duration, interruptible },
  }));
}

export function cancelSmoothScroll() {
  window.dispatchEvent(new Event(CANCEL_SCROLL_EVENT));
  window.scrollTo({ top: window.scrollY, behavior: "instant" });
}

export function SmoothScroll({ enabled }: SmoothScrollProps) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      autoRaf: false,
      // Lenis already includes the document's CSS scroll padding and target margin.
      anchors: { duration: 0.78 },
      lerp: 0.085,
      prevent: (node) => Boolean(node.closest("[data-lenis-prevent]")),
      smoothWheel: true,
      stopInertiaOnNavigate: true,
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    const onVisibilityChange = () => {
      if (document.hidden) lenis.stop();
      else lenis.start();
    };
    const onScrollRequest = (event: Event) => {
      const detail = (event as CustomEvent<ScrollRequest>).detail;
      if (!detail || !Number.isFinite(detail.top)) return;

      lenis.scrollTo(detail.top, {
        duration: Math.min(1.2, Math.max(0.35, detail.duration ?? 0.9)),
        easing: (time) => 1 - Math.pow(1 - time, 4),
        force: true,
        lock: !detail.interruptible,
      });
    };
    const onCancelScroll = () => lenis.scrollTo(window.scrollY, { immediate: true, force: true });

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.dataset.scrollDriver = "lenis-gsap";
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(SCROLL_EVENT, onScrollRequest);
    window.addEventListener(CANCEL_SCROLL_EVENT, onCancelScroll);

    return () => {
      gsap.ticker.remove(tick);
      document.documentElement.dataset.scrollDriver = "native";
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(SCROLL_EVENT, onScrollRequest);
      window.removeEventListener(CANCEL_SCROLL_EVENT, onCancelScroll);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
