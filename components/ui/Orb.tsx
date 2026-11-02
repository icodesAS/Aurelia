"use client";

import React from "react";

interface OrbProps {
  hue?: number;
  color?: string;
  size?: number;
  className?: string;
}

export default function Orb({
  hue,
  color,
  size = 200,
  className = "",
}: OrbProps) {
  const fill =
    color ??
    (hue !== undefined
      ? `hsl(${hue} 72% 60%)`
      : "var(--gold)");

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none rounded-full blur-2xl ${className}`}
      style={{
        width: size,
        height: size,
        mixBlendMode: "screen",
        background: `radial-gradient(circle at 38% 38%, ${fill} 0%, rgba(201,169,110,0.22) 52%, transparent 74%)`,
      }}
    />
  );
}
