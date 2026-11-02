"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export default function CursorGlow() {
  const [visible, setVisible] = useState(false);
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 22, mass: 0.4 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 22, mass: 0.4 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 210);
      mouseY.set(e.clientY - 210);
      if (!visible) setVisible(true);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY, visible]);

  if (!visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-30 hidden md:block h-[420px] w-[420px] rounded-full"
      style={{
        x: springX,
        y: springY,
        background:
          "radial-gradient(circle, rgba(201, 169, 110, 0.085) 0%, rgba(231, 183, 168, 0.03) 45%, transparent 70%)",
      }}
    />
  );
}
