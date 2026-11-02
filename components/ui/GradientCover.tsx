"use client";

import React from "react";

const GRADIENT_PAIRS: Record<number, [string, string]> = {
  1: ["#3b2a1e", "#c9a96e"],
  2: ["#1e2a3b", "#6ea3c9"],
  3: ["#2a1e3b", "#a96ec9"],
  4: ["#3b1e2a", "#c96e8a"],
  5: ["#1e3b2f", "#6ec9a3"],
  6: ["#3b361e", "#c9c06e"],
  7: ["#2f1e3b", "#8a6ec9"],
  8: ["#1e3b3b", "#6ec9c9"],
  9: ["#3b2a2a", "#c98a6e"],
  10: ["#26261e", "#b9b97a"],
};

interface GradientCoverProps {
  seed?: number;
  coverImage?: string;
  alt: string;
  className?: string;
}

export default function GradientCover({
  seed = 1,
  coverImage,
  alt,
  className = "h-48",
}: GradientCoverProps) {
  const normalizedSeed = ((Math.abs(Math.round(seed)) - 1) % 10) + 1;
  const [start, end] = GRADIENT_PAIRS[normalizedSeed] || GRADIENT_PAIRS[1];

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
      }}
    >
      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          {/* Architectural SVG grid overlay at 6% opacity */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full opacity-[0.08]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={`arch-grid-${normalizedSeed}`}
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 36 0 L 0 0 0 36"
                  fill="none"
                  stroke="#F4EFE6"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill={`url(#arch-grid-${normalizedSeed})`}
            />
            <circle
              cx="75%"
              cy="30%"
              r="72"
              fill="none"
              stroke="#F4EFE6"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="80%"
              x2="100%"
              y2="25%"
              stroke="#F4EFE6"
              strokeWidth="0.75"
            />
          </svg>
          {/* Soft highlight orb */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-40 blur-2xl"
            style={{
              background: `radial-gradient(circle, ${end} 0%, transparent 70%)`,
            }}
          />
        </>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0B]/80 via-[#0A0A0B]/20 to-transparent"
      />
    </div>
  );
}
