"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedUsers } from "@/lib/seed";
import { scoreMatch } from "@/lib/match";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import TiltCard from "@/components/ui/TiltCard";
import FitBadge from "@/components/ui/FitBadge";

export default function PeoplePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const activeAnswers = profile?.answers ?? DEFAULT_QUIZ_ANSWERS;

  const rankedPeople = useMemo(() => {
    return seedUsers
      .map((person) => {
        const result = scoreMatch(activeAnswers, person.answers);
        return { person, result };
      })
      .filter(({ person }) =>
        selectedCity === "all"
          ? true
          : person.city.toLowerCase() === selectedCity.toLowerCase()
      )
      .sort((a, b) => b.result.score - a.result.score);
  }, [activeAnswers, selectedCity]);

  const cities = ["all", "Rajpura", "Chandigarh", "Mohali", "Zirakpur"];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-10 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
            DETERMINISTIC COMPATIBILITY ENGINE
          </p>
          <h1
            className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]"
            style={{ textWrap: "balance" }}
          >
            People who share your daily rhythm.
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Every compatibility score below is calculated transparently from your
            7 lifestyle dimensions. Click any person to experience the cinematic
            Match Reveal and Gemini&apos;s honest breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--cream)] transition-colors hover:border-[var(--gold)]/50 whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--gold)]" />
            <span>Adjust My Quiz Answers</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar (Functional segmented buttons) */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-1.5">
          {cities.map((c) => {
            const active = selectedCity === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCity(c)}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[var(--gold)] text-[#0A0A0B]"
                    : "text-[var(--muted)] hover:text-[var(--cream)]"
                }`}
              >
                {c === "all" ? "All Cities" : c}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[var(--muted)]">
          <span>Matching for </span>
          <span className="text-[var(--cream)] font-medium">
            {profile?.displayName || "Guest Profile"}
          </span>
          {profile?.persona && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-[var(--gold-soft)]">{profile.persona.name}</span>
            </>
          )}
        </div>
      </div>

      {/* People Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rankedPeople.map(({ person, result }, index) => {
          const isTopMatch = index === 0;
          const initials = person.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2);

          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <TiltCard
                glowGold={isTopMatch}
                onClick={() => router.push(`/people/${person.id}`)}
                className="h-full p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Avatar + Name + FitBadge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[#0A0A0B] shadow-md"
                        style={{
                          background: `linear-gradient(135deg, hsl(${person.hue} 70% 62%), hsl(${
                            (person.hue + 40) % 360
                          } 70% 45%))`,
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        {isTopMatch && (
                          <p className="text-[11px] font-medium text-[var(--gold)]">
                            Top Match
                          </p>
                        )}
                        <h2 className="font-serif-display truncate text-2xl text-[var(--cream)]">
                          {person.displayName}
                        </h2>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <span>{person.age}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{person.occupation}</span>
                          <span aria-hidden="true">·</span>
                          <span>{person.city}</span>
                        </div>
                      </div>
                    </div>

                    <FitBadge
                      score={result.score}
                      size={56}
                      label={result.label}
                    />
                  </div>

                  {/* Bio */}
                  <p className="mt-4 text-sm leading-relaxed text-[var(--cream)]/90">
                    &ldquo;{person.bio}&rdquo;
                  </p>
                </div>

                {/* Aligned dimensions summary (clean unboxed metadata + action) */}
                <div className="mt-6 border-t border-[var(--line)] pt-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                    <div className="truncate">
                      <span className="text-[var(--gold-soft)]">Aligned: </span>
                      <span>
                        {result.aligned.length > 0
                          ? result.aligned
                              .slice(0, 2)
                              .map((d) => d.label)
                              .join(" · ")
                          : "Complementary routines"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[var(--gold)] font-medium shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Reveal</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
