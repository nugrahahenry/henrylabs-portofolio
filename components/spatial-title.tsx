"use client";

import { useEffect } from "react";
import { motion, useSpring } from "motion/react";
import { titleTilt } from "./spatial-type";

export function SpatialTitle({ children, active }: { children: string; active: boolean }) {
  const rotateX = useSpring(0, { stiffness: 120, damping: 24, mass: .7 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 24, mass: .7 });
  useEffect(() => {
    const reset = () => { rotateX.jump(0); rotateY.jump(0); };
    if (!active) reset();
    document.addEventListener("visibilitychange", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, [active, rotateX, rotateY]);

  return <h1 id="hero-title" className="spatial-title" data-depth={active ? "active" : "still"}
    onPointerMove={event => {
      if (!active || event.pointerType !== "mouse" || event.buttons || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const tilt = titleTilt((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
      rotateX.set(tilt.x); rotateY.set(tilt.y);
    }}
    onPointerLeave={() => { rotateX.set(0); rotateY.set(0); }}>
    <motion.span className="spatial-title-face" style={active ? { rotateX, rotateY, transformPerspective: 1000 } : { transform: "none" }}>{children}</motion.span>
  </h1>;
}
