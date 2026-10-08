"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "./site-preferences";

export function ReadingSky() {
  const pathname = usePathname();
  return pathname === "/" ? null : <ReadingField />;
}

function ReadingField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { motionOn } = useSitePreferences();
  const moving = useRef(motionOn);
  const wake = useRef(() => {});
  useEffect(() => { moving.current = motionOn; wake.current(); }, [motionOn]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const host = hostRef.current!;
    const canvas = host.querySelector("canvas")!;
    void (async () => {
      const [THREE, { createDeepSpace }, { createDistantStarMaterial, distantStarPoint }] = await Promise.all([import("three"), import("./deep-space"), import("./ambient-field")]);
      if (disposed) return;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power", preserveDrawingBuffer: true }); }
      catch { host.dataset.fallback = "true"; return; }
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
      camera.position.set(.2, 0, 6.4);
      const sky = createDeepSpace();
      scene.add(sky.volume);
      const points = new Float32Array(800 * 3), colors = new Float32Array(800 * 3);
      for (let i = 0; i < 800; i++) {
        distantStarPoint(i).toArray(points, i * 3);
        colors.set(i % 5 === 0 ? [.96, .78, .50] : [.55, .76, .85], i * 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = createDistantStarMaterial();
      scene.add(new THREE.Points(geometry, material));
      let frame = 0, last = 0, lastPaint = 0, time = 0, lost = false;
      const render = (now: number) => {
        frame = 0;
        if (disposed || lost || document.hidden) { last = 0; return; }
        if (!moving.current || now - lastPaint >= 1000 / 24) {
          if (moving.current && last) time += Math.min(.06, (now - last) / 1000);
          last = now; lastPaint = now;
          sky.material.uniforms.uTime.value = time;
          material.uniforms.uTime.value = time;
          material.uniforms.uMotion.value = moving.current ? 1 : 0;
          renderer.render(scene, camera);
          host.dataset.ready = "true";
          host.dataset.time = time.toFixed(3);
          host.dataset.drawCalls = String(renderer.info.render.calls);
        }
        if (moving.current) frame = requestAnimationFrame(render);
      };
      const resume = () => { if (!frame && !lost && !disposed && !document.hidden) frame = requestAnimationFrame(render); };
      const resize = () => {
        const width = host.clientWidth, height = Math.max(1, host.clientHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, width < 640 ? .75 : 1));
        renderer.setSize(width, height, false);
        camera.aspect = width / height; camera.updateProjectionMatrix();
        sky.material.uniforms.uResolution.value.set(canvas.width, canvas.height);
        material.uniforms.uScale.value = canvas.height * .5;
        geometry.setDrawRange(0, width < 640 ? 420 : 800);
        resume();
      };
      const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; } else resume(); };
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; host.dataset.fallback = "true"; cancelAnimationFrame(frame); frame = 0; };
      wake.current = () => { last = 0; resume(); };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      document.addEventListener("visibilitychange", visibility);
      canvas.addEventListener("webglcontextlost", contextLost);
      resize();
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        canvas.removeEventListener("webglcontextlost", contextLost);
        sky.texture.dispose(); sky.volume.geometry.dispose(); sky.material.dispose(); geometry.dispose(); material.dispose();
        renderer.dispose(); renderer.forceContextLoss();
      };
    })().catch(() => { if (!disposed) host.dataset.fallback = "true"; });
    return () => { disposed = true; wake.current = () => {}; cleanup(); };
  }, []);
  return <div className="reading-sky" ref={hostRef} aria-hidden="true"><canvas /></div>;
}
