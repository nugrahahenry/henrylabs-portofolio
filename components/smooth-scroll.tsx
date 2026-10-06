"use client";

import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";

type SmoothScrollProps = {
  enabled: boolean;
};

export function SmoothScroll({ enabled }: SmoothScrollProps) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      autoRaf: false,
      anchors: { offset: -84, duration: 0.78 },
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

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.dataset.scrollDriver = "lenis-gsap";
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      gsap.ticker.remove(tick);
      document.documentElement.dataset.scrollDriver = "native";
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
