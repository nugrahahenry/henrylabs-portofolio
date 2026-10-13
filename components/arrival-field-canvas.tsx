"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { arrivalBridge, arrivalCandidate, arrivalChapter, createArrivalField } from "./arrival-field";

export function ArrivalField({ progress, motionOn, active, projects }: { progress: number; motionOn: boolean; active: boolean; projects: readonly { id: string; name: string; logo: string }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
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
    const labels = Array.from(labelsRef.current?.children ?? []) as HTMLElement[];
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
      const bridge = arrivalBridge(displayedProgress / 100);
      renderer.setClearColor(field.background, 1 - bridge.nebula);
      field.scene.visible = current.active;
      renderer.render(field.scene, field.camera);
      canvas.dataset.ready = "true";
      canvas.dataset.camera = field.camera.position.toArray().map(value => value.toFixed(3)).join(",");
      canvas.dataset.chapter = String(arrivalChapter(displayedProgress / 100));
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.atlas = JSON.stringify(field.atlas);
      canvas.dataset.skyOpacity = (1 - bridge.nebula).toFixed(3);
      labels.forEach((element, i) => {
        const anchor = field.labels[i];
        element.style.transform = `translate3d(${anchor.x}px,${anchor.y}px,0)`;
        element.style.opacity = String(anchor.visible ? anchor.opacity : 0);
        if (i === 0) {
        const uiProgress = current.progress / 100;
        element.textContent = uiProgress < .22 ? `U-${arrivalCandidate(uiProgress)} / ...` : uiProgress < .32 ? "StarGod / Henry Nugraha" : "Laniakea";
        element.dataset.matched = String(uiProgress >= .22);
        }
      });
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

  return active ? <>
    <canvas ref={canvasRef} className="arrival-field-canvas" aria-hidden="true" data-active={String(active)} />
    <div className="arrival-labels" ref={labelsRef} aria-hidden="true">
      <span className="arrival-anchor arrival-destination" />
      {["HenryLabs", "University", "Client Work"].map(name => <span className="arrival-anchor arrival-galaxy-label" key={name}><span>{name}</span></span>)}
      {projects.map(project => <span className="arrival-anchor arrival-project-label" key={project.id}><span><img src={project.logo} alt="" width={28} height={28} /><b>{project.name}</b></span></span>)}
    </div>
  </> : null;
}
