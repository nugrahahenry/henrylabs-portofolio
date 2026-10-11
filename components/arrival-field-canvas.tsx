"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createArrivalField } from "./arrival-field";

export function ArrivalField({ progress, motionOn, active }: { progress: number; motionOn: boolean; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ progress, motionOn, active });
  stateRef.current = { progress, motionOn, active };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || !motionOn) return;
    let renderer: THREE.WebGLRenderer;
    let field: ReturnType<typeof createArrivalField>;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      field = createArrivalField();
    } catch {
      canvas.dataset.fallback = "true";
      return;
    }
    let frame = 0, lastTime = performance.now(), displayedProgress = stateRef.current.progress;
    const resize = () => renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    const render = (time: number) => {
      frame = 0;
      if (document.hidden) return;
      const current = stateRef.current;
      const delta = Math.min(.05, Math.max(0, (time - lastTime) / 1000));
      lastTime = time;
      displayedProgress = THREE.MathUtils.damp(displayedProgress, current.progress, 14, delta);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      field.update(displayedProgress, width / Math.max(1, height), height);
      field.scene.visible = current.active;
      renderer.render(field.scene, field.camera);
      canvas.dataset.ready = "true";
      canvas.dataset.camera = field.camera.position.toArray().map(value => value.toFixed(3)).join(",");
      if (current.active && current.motionOn) frame = requestAnimationFrame(render);
    };
    const wake = () => {
      if (!document.hidden && !frame) { lastTime = performance.now(); frame = requestAnimationFrame(render); }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    resize();
    wake();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", wake); field.dispose(); renderer.dispose(); };
  }, [active, motionOn]);

  return active ? <canvas ref={canvasRef} className="arrival-field-canvas" aria-hidden="true" data-active={String(active)} /> : null;
}
