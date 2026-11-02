"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface LoadingLineProps {
  messages?: string[];
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Reading the vibe…",
  "Comparing routines…",
  "Finding common ground…",
];

export default function LoadingLine({
  messages = DEFAULT_MESSAGES,
  className = "",
}: LoadingLineProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 1400);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative h-[1px] w-40 overflow-hidden bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="h-6 overflow-hidden text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messages[index]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-serif-display text-lg italic text-[var(--gold-soft)]"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
