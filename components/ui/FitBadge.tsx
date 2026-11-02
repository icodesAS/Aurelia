"use client";

import React, { useEffect, useState } from "react";
import { animate } from "motion/react";

interface FitBadgeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animateCount?: boolean;
  label?: string;
}

export default function FitBadge({
  score,
  size = 58,
  strokeWidth = 3.5,
  animateCount = true,
  label,
}: FitBadgeProps) {
  const [displayScore, setDisplayScore] = useState(animateCount ? 0 : score);

  useEffect(() => {
    if (!animateCount) {
      setDisplayScore(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (val) => setDisplayScore(Math.round(val)),
    });
    return () => controls.stop();
  }, [score, animateCount]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, displayScore));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    score >= 85
      ? "var(--gold)"
      : score >= 70
      ? "var(--gold-soft)"
      : score >= 55
      ? "var(--rose)"
      : "var(--bad)";

  return (
    <div className="inline-flex flex-col items-center gap-1 shrink-0">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif-display tabular-nums text-base font-semibold text-[var(--gold-soft)]">
            {displayScore}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}
