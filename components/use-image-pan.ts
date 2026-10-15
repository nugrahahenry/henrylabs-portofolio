"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

type Drag = { node: HTMLElement; id: number; x: number; y: number; left: number; top: number };

export function useImagePan(enabled: boolean) {
  const drag = useRef<Drag | null>(null);
  const stop = useCallback(() => {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    delete active.node.dataset.panning;
    if (active.node.hasPointerCapture(active.id)) active.node.releasePointerCapture(active.id);
  }, []);

  useEffect(() => { if (!enabled) stop(); return stop; }, [enabled, stop]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", hidden); };
  }, [stop]);

  const finish = (event: PointerEvent<HTMLElement>) => { if (drag.current?.id === event.pointerId) stop(); };
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      // Touch keeps native two-axis scrolling and pinch zoom, including inertia.
      if (!enabled || event.pointerType === "touch" || !event.isPrimary || event.button !== 0 || drag.current) return;
      const node = event.currentTarget;
      if (node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight) return;
      event.preventDefault();
      node.focus({ preventScroll: true });
      node.setPointerCapture(event.pointerId);
      drag.current = { node, id: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
      node.dataset.panning = "true";
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const active = drag.current;
      if (!active || event.pointerId !== active.id) return;
      if (!(event.buttons & 1)) { stop(); return; }
      event.preventDefault();
      active.node.scrollLeft = active.left + active.x - event.clientX;
      active.node.scrollTop = active.top + active.y - event.clientY;
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!enabled || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target !== event.currentTarget) return;
      const steps: Record<string, [number, number]> = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] };
      const step = steps[event.key];
      if (!step) return;
      event.preventDefault();
      stop();
      event.currentTarget.scrollBy({ left: step[0], top: step[1], behavior: "instant" });
    },
  };
}
