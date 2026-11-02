"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Compass, Users, Sparkles, Home, ShieldCheck } from "lucide-react";
import TiltCard from "@/components/ui/TiltCard";
import FitBadge from "@/components/ui/FitBadge";
import { useAuth } from "@/components/AuthProvider";
import { seedUsers } from "@/lib/seed";
import { scoreMatch } from "@/lib/match";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
});

const TAGLINE_WORDS = ["Find", "your", "people.", "Find", "your", "place."];

export default function LandingPage() {
  const router = useRouter();
  const { user, profile, signInGuest } = useAuth();

  const previewProfiles = seedUsers.slice(0, 4).map((u) => {
    const match = scoreMatch(profile?.answers ?? DEFAULT_QUIZ_ANSWERS, u.answers);
    return { user: u, match };
  });

  const handleInstantDemo = async () => {
    if (!user && !profile) {
      await signInGuest(true);
    }
    router.push("/people");
  };

  return (
    <div className="relative min-h-screen">
      {/* HERO SECTION WITH ACTIVE THEORY THREE.JS CANVAS */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <HeroScene />

        {/* Subtle radial contrast scrim so typography remains razor-sharp */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(10,10,11,0.55)_0%,rgba(10,10,11,0.88)_100%)]"
        />

        <div className="relative z-10 mx-auto max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs tracking-[0.28em] uppercase text-[var(--gold-soft)]"
          >
            AURELIA · SHARED LIVING INTELLIGENCE
          </motion.p>

          <h1
            className="font-serif-display mt-5 text-[clamp(3rem,7.2vw,6.25rem)] font-normal text-[var(--cream)]"
            style={{ textWrap: "balance" }}
          >
            {TAGLINE_WORDS.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.65,
                  delay: 0.12 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`inline-block mr-[0.24em] ${
                  word === "people." || word === "place."
                    ? "italic text-[var(--gold-soft)]"
                    : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-xl text-base md:text-lg leading-relaxed text-[var(--muted)]"
          >
            Finding a room is easy. Finding people you can live with is hard.
            Aurelia pairs deterministic lifestyle compatibility with honest AI
            explanations—from search to shared household life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href={user && profile ? "/people" : "/login"}
              className="group inline-flex items-center gap-3 rounded-[14px] bg-[var(--gold)] px-7 py-4 text-sm font-medium text-[#0A0A0B] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--gold-soft)] active:scale-[0.97] whitespace-nowrap"
              style={{
                boxShadow: "0 0 40px rgba(201, 169, 110, 0.28)",
              }}
            >
              <span>Begin Experience</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <button
              type="button"
              onClick={handleInstantDemo}
              className="inline-flex items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface)]/90 px-6 py-4 text-sm font-medium text-[var(--cream)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]/50 active:scale-[0.97] whitespace-nowrap"
            >
              <Users className="h-4 w-4 text-[var(--gold)]" />
              <span>Preview Roommate Matches</span>
            </button>
          </motion.div>

          {/* Editorial metadata line (no pills) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--muted)]"
          >
            <span>7-Dimension Compatibility Math</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Flash Match Explainer</span>
            <span aria-hidden="true">·</span>
            <span>One Profile for Seekers &amp; Hosts</span>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: FOUR STAGES IN ONE STORY (BENTO ARCHITECTURE) */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[var(--muted)]">
              01. Architecture of Shared Living
            </p>
            <h2
              className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]"
              style={{ textWrap: "balance" }}
            >
              Four stages in one continuous story.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
            In shared living, everyone is both a seeker and a host. Aurelia uses
            one unified profile across matching, natural-language search,
            listing creation, and household rent splits.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Roommate Match (Spans 2 columns on desktop) */}
          <TiltCard
            glowGold
            onClick={() => router.push("/people")}
            className="md:col-span-2 p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--gold-soft)]">
                  01 · Roommate Compatibility Engine
                </span>
                <Users className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="font-serif-display mt-4 text-3xl text-[var(--cream)]">
                Match with the humans inside the home before you tour the walls.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                Our deterministic 7-dimension engine scores sleep rhythm,
                cleanliness, food habits, guest frequency, and acoustics—then
                Gemini explains why you click and one honest watch-out.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-[var(--line)]">
              {previewProfiles.map(({ user: u, match }) => (
                <Link
                  key={u.id}
                  href={`/people/${u.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)]/70 p-3 transition-colors hover:border-[var(--gold)]/50"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs font-medium text-[var(--cream)] group-hover:text-[var(--gold-soft)]">
                      {u.displayName.split(" ")[0]}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {u.city}
                    </p>
                  </div>
                  <span className="font-serif-display tabular-nums text-lg font-semibold text-[var(--gold-soft)]">
                    {match.score}%
                  </span>
                </Link>
              ))}
            </div>
          </TiltCard>

          {/* Card 2: AI Concierge Search */}
          <TiltCard
            onClick={() => router.push("/explore")}
            className="p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--muted)]">
                  02 · AI Concierge
                </span>
                <Compass className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="font-serif-display mt-4 text-3xl text-[var(--cream)]">
                Ask in plain words.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Type &ldquo;Quiet 2BHK near campus under 18k with vegetarian
                roommates&rdquo; and watch parsed filters and Aurelia Fit scores
                rank every home transparently.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--gold-soft)]">
              <span>Explore ranked homes</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </TiltCard>

          {/* Card 3: AI Listing Writer */}
          <TiltCard
            onClick={() => router.push("/list")}
            className="p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--muted)]">
                  03 · AI Listing Writer
                </span>
                <Sparkles className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="font-serif-display mt-4 text-3xl text-[var(--cream)]">
                List a spare room in 30 seconds.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Jot down two lines and an optional photo. Gemini writes warm,
                honest copy and anchors suggested rent to local tricity
                benchmarks.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--gold-soft)]">
              <span>Try the listing studio</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </TiltCard>

          {/* Card 4: Household Dashboard (Spans 2 columns on desktop) */}
          <TiltCard
            onClick={() => router.push("/home")}
            className="md:col-span-2 p-8 flex flex-col justify-between"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)]">
                    04 · Life After Moving In
                  </span>
                </div>
                <h3 className="font-serif-display mt-4 text-3xl text-[var(--cream)]">
                  Fair rent splits, shared bills, and chore harmony.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  Weighted rent splits account for room square footage, attached
                  baths, balconies, and AC using largest-remainder rupee
                  rounding—plus a one-click &ldquo;who owes whom&rdquo; ledger.
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <FitBadge score={93} size={68} label="Rare match" />
                <div className="rounded-[16px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-left">
                  <p className="text-[11px] text-[var(--muted)]">Sample Fair Split</p>
                  <p className="font-serif-display tabular-nums text-xl text-[var(--cream)]">
                    ₹10,548 · ₹7,337 · ₹6,115
                  </p>
                  <p className="text-[11px] text-[var(--gold-soft)]">
                    Exact ₹24,000 total
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--gold-soft)]">
              <span className="inline-flex items-center gap-2">
                <Home className="h-4 w-4" />
                Open Household Dashboard
              </span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </TiltCard>
        </div>
      </section>

      {/* QUIET FOOTER */}
      <footer className="border-t border-[var(--line)] py-12">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 sm:flex-row text-xs text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span className="font-serif-display text-lg tracking-[0.14em] text-[var(--cream)]">
              AURELIA
            </span>
            <span aria-hidden="true">·</span>
            <span>Find your people. Find your place.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" />
              Transparent Compatibility Math + Gemini 3.8 Flash
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
