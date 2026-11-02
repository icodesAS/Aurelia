"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Shield,
  Compass,
  Home,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedUsers, seedListings } from "@/lib/seed";
import { scoreMatch } from "@/lib/match";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import { createHouseholdDoc } from "@/lib/store";
import { HouseholdMember, Chore } from "@/lib/types";
import { matchExplainFallback, MatchExplanation } from "@/lib/ai/fallbacks";
import Orb from "@/components/ui/Orb";
import LoadingLine from "@/components/ui/LoadingLine";

export default function MatchRevealPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { user, profile, signInGuest } = useAuth();
  const [formingHousehold, setFormingHousehold] = useState(false);

  const person = useMemo(
    () => seedUsers.find((u) => u.id === params.id) ?? seedUsers[0],
    [params.id]
  );

  const youAnswers = profile?.answers ?? DEFAULT_QUIZ_ANSWERS;
  const youName = profile?.displayName ?? "You";

  const matchResult = useMemo(
    () => scoreMatch(youAnswers, person.answers),
    [youAnswers, person.answers]
  );

  const [displayScore, setDisplayScore] = useState(
    prefersReducedMotion ? matchResult.score : 0
  );
  const [merged, setMerged] = useState(Boolean(prefersReducedMotion));
  const [explanation, setExplanation] = useState<MatchExplanation | null>(null);
  const [source, setSource] = useState<"gemini" | "fallback">("fallback");
  const [loadingAi, setLoadingAi] = useState(true);


  const handleFormHousehold = async () => {
    setFormingHousehold(true);
    let activeUid = user?.uid || profile?.uid;
    if (!activeUid) {
      const guestProf = await signInGuest(true);
      activeUid = guestProf?.uid || "guest-demo-user";
    }

    const youName = profile?.displayName || "You";

    const members: HouseholdMember[] = [
      {
        id: activeUid,
        name: youName,
        hue: 40,
        areaSqft: 150,
        attachedBath: true,
        balcony: false,
        ac: false,
      },
      {
        id: person.id,
        name: person.displayName,
        hue: person.hue,
        areaSqft: 135,
        attachedBath: false,
        balcony: true,
        ac: false,
      },
    ];

    const rentPerPerson = person.numericTraits?.budget || 12000;
    const totalRent = rentPerPerson * 2;

    const starterChores: Chore[] = [
      {
        id: "c1",
        title: "Kitchen wipe-down & dish rack",
        assignedTo: members[0].id,
        frequency: "daily",
        done: false,
      },
      {
        id: "c2",
        title: "Trash & recycling disposal",
        assignedTo: members[1].id,
        frequency: "daily",
        done: false,
      },
      {
        id: "c3",
        title: "Shared supplies & groceries run",
        assignedTo: members[0].id,
        frequency: "weekly",
        done: false,
      },
      {
        id: "c4",
        title: "Common area vacuuming",
        assignedTo: members[1].id,
        frequency: "weekly",
        done: false,
      },
    ];

    await createHouseholdDoc({
      ownerUid: activeUid,
      listingId: personListing?.id,
      name: `${youName} & ${person.displayName.split(" ")[0]}'s Home`,
      totalRent,
      members,
      expenses: [
        {
          id: `exp_${Date.now()}_1`,
          title: "High-Speed Wi-Fi Setup",
          amount: 2400,
          paidBy: members[0].id,
          splitBetween: members.map((m) => m.id),
          createdAt: Date.now(),
        },
      ],
      chores: starterChores,
      createdAt: Date.now(),
    });

    router.push("/home");
  };

  const personListing = useMemo(
    () => seedListings.find((l) => l.residentIds.includes(person.id)) ?? null,
    [person.id]
  );

  // Orbs merge + score count up sequence
  useEffect(() => {
    if (prefersReducedMotion) {
      setMerged(true);
      setDisplayScore(matchResult.score);
      return;
    }

    const mergeTimer = setTimeout(() => {
      setMerged(true);
    }, 1450);

    const scoreControls = animate(0, matchResult.score, {
      duration: 2.2,
      delay: 1.0,
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });

    return () => {
      clearTimeout(mergeTimer);
      scoreControls.stop();
    };
  }, [matchResult.score, prefersReducedMotion]);

  // Parallel Gemini Match Explanation request
  useEffect(() => {
    let cancelled = false;
    setLoadingAi(true);

    const otherFirstName = person.displayName.split(" ")[0] || "them";
    const localFallback = matchExplainFallback(matchResult, otherFirstName);

    fetch("/api/ai/match-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youName,
        otherName: person.displayName,
        you: youAnswers,
        other: person.answers,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.data?.explanation) {
          setExplanation(json.data.explanation);
          setSource(json.source === "gemini" ? "gemini" : "fallback");
        } else {
          setExplanation(localFallback);
          setSource("fallback");
        }
        setLoadingAi(false);
      })
      .catch(() => {
        if (cancelled) return;
        setExplanation(localFallback);
        setSource("fallback");
        setLoadingAi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [youName, person.displayName, youAnswers, person.answers, matchResult]);

  const activeExplanation =
    explanation ??
    matchExplainFallback(
      matchResult,
      person.displayName.split(" ")[0] || "them"
    );

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--cream)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to people</span>
        </Link>

        {personListing && (
          <button
            type="button"
            onClick={() => router.push(`/explore/${personListing.id}`)}
            className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--gold-soft)] transition-colors hover:border-[var(--gold)]/50"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Lives at: {personListing.title}</span>
          </button>
        )}
      </div>

      {/* STAGE 1: THE TWO ORBS MERGE + PULSE RING + COUNT-UP SCORE */}
      <div className="relative mt-6 flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)]/70 px-6 py-14 text-center">
        {/* Left Orb (You - Gold) */}
        <motion.div
          initial={prefersReducedMotion ? { x: 0, opacity: 0.7 } : { x: -220, opacity: 0.85 }}
          animate={{ x: 0, scale: merged ? 1.25 : 1, opacity: 0.75 }}
          transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute"
        >
          <Orb color="#C9A96E" size={220} />
        </motion.div>

        {/* Right Orb (Roommate - Hue) */}
        <motion.div
          initial={prefersReducedMotion ? { x: 0, opacity: 0.7 } : { x: 220, opacity: 0.85 }}
          animate={{ x: 0, scale: merged ? 1.25 : 1, opacity: 0.75 }}
          transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute"
        >
          <Orb hue={person.hue} size={220} />
        </motion.div>

        {/* Expanding Pulse Ring on Merge */}
        {merged && !prefersReducedMotion && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0.85 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="pointer-events-none absolute h-40 w-40 rounded-full border border-[var(--gold)]"
          />
        )}

        {/* Names */}
        <div className="relative z-10 flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-[var(--muted)]">
          <span className="text-[var(--gold-soft)]">{youName}</span>
          <span aria-hidden="true">×</span>
          <span className="text-[var(--cream)]">{person.displayName}</span>
        </div>

        {/* Big Tabular Serif Percentage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: prefersReducedMotion ? 0 : 0.9 }}
          className="relative z-10 mt-4"
        >
          <div className="font-serif-display tabular-nums text-7xl md:text-8xl font-normal text-[var(--cream)]">
            {displayScore}%
          </div>
          <p className="mt-2 font-serif-display text-2xl italic text-[var(--gold-soft)]">
            {matchResult.label}
          </p>
        </motion.div>

        {/* Sub-info about person */}
        <p className="relative z-10 mt-4 max-w-md text-xs text-[var(--muted)]">
          {person.age} · {person.occupation} · {person.city} — &ldquo;{person.bio}&rdquo;
        </p>

        {loadingAi && !merged && (
          <div className="relative z-10 mt-6">
            <LoadingLine
              messages={[
                "Reading the vibe…",
                "Comparing routines…",
                "Finding common ground…",
              ]}
            />
          </div>
        )}
      </div>

      {/* STAGE 2: AI EXPLANATION CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.65,
          delay: prefersReducedMotion ? 0.1 : 1.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mt-10 space-y-6"
      >
        {/* Headline Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-[var(--gold)]/35 bg-[var(--surface)] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[var(--muted)]">
              MATCH SYNTHESIS
            </p>
            <h2 className="font-serif-display mt-1 text-3xl text-[var(--cream)]">
              &ldquo;{activeExplanation.headline}&rdquo;
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--gold-soft)] shrink-0">
            <Sparkles className="h-4 w-4 text-[var(--gold)]" />
            <span>
              {source === "gemini"
                ? "✦ AI Explained by Gemini 3.8 Flash"
                : "Deterministic Lifestyle Synthesis"}
            </span>
          </div>
        </div>

        {/* Two-column: Why You Click + Watch Out For */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Why you click */}
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-[var(--good)]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Why you click</span>
            </div>
            <ul className="mt-4 space-y-3">
              {activeExplanation.whyYouClick.map((bullet, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed text-[var(--cream)]/90 flex items-start gap-2.5"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--good)] shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* One honest watch-out */}
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-[var(--rose)]">
              <AlertTriangle className="h-4 w-4" />
              <span>One watch-out</span>
            </div>
            <ul className="mt-4 space-y-3">
              {activeExplanation.watchOuts.map((bullet, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed text-[var(--cream)]/90 flex items-start gap-2.5"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--rose)] shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Two-column: Conversation Starters + House Rule */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-[var(--gold-soft)]">
              <MessageCircle className="h-4 w-4 text-[var(--gold)]" />
              <span>Conversation starters</span>
            </div>
            <ul className="mt-4 space-y-3">
              {activeExplanation.conversationStarters.map((q, i) => (
                <li
                  key={i}
                  className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-[var(--cream)]"
                >
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-[var(--gold-soft)]">
                <Shield className="h-4 w-4 text-[var(--gold)]" />
                <span>A house rule to agree on early</span>
              </div>
              <p className="font-serif-display mt-4 text-2xl text-[var(--cream)]">
                &ldquo;{activeExplanation.houseRule}&rdquo;
              </p>
            </div>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Setting one simple boundary on day one prevents 90% of shared-living friction.
            </p>
          </div>
        </div>

        {/* STAGE 3: 7-DIMENSION SPECTRUM COMPARISON */}
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className="font-serif-display text-2xl text-[var(--cream)]">
              Dimension-by-Dimension Breakdown
            </h3>
            <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
                <span>You</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `hsl(${person.hue} 70% 60%)` }}
                />
                <span>{person.displayName.split(" ")[0]}</span>
              </span>
            </div>
          </div>

          <div className="mt-6 divide-y divide-[var(--line)]">
            {matchResult.dimensions.map((dim) => {
              const simPct = Math.round(dim.similarity * 100);
              return (
                <div
                  key={dim.key}
                  className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-3">
                    <p className="text-sm font-medium text-[var(--cream)]">
                      {dim.label}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Weight {Math.round(dim.weight * 100)}%
                    </p>
                  </div>

                  {/* 3-Step Track with dots */}
                  <div className="sm:col-span-6">
                    <div className="relative flex items-center justify-between px-3 py-2">
                      <div className="absolute left-3 right-3 h-[2px] bg-white/10" />
                      {[0, 1, 2].map((stepIdx) => {
                        const isYou = dim.aIndex === stepIdx;
                        const isThem = dim.bIndex === stepIdx;
                        return (
                          <div
                            key={stepIdx}
                            className="relative z-10 flex h-5 w-5 items-center justify-center"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                            {isYou && (
                              <span
                                title={`You: ${dim.aLabel}`}
                                className="absolute h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0B] bg-[var(--gold)]"
                                style={{
                                  transform: isThem ? "translateX(-4px)" : "none",
                                }}
                              />
                            )}
                            {isThem && (
                              <span
                                title={`${person.displayName}: ${dim.bLabel}`}
                                className="absolute h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0B]"
                                style={{
                                  background: `hsl(${person.hue} 70% 60%)`,
                                  transform: isYou ? "translateX(4px)" : "none",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--muted)] px-1">
                      <span>You: {dim.aLabel}</span>
                      <span>
                        {person.displayName.split(" ")[0]}: {dim.bLabel}
                      </span>
                    </div>
                  </div>

                  {/* Similarity bar */}
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${simPct}%`,
                          backgroundColor:
                            simPct >= 85
                              ? "var(--good)"
                              : simPct >= 50
                              ? "var(--gold)"
                              : "var(--rose)",
                        }}
                      />
                    </div>
                    <span className="font-mono tabular-nums text-xs text-[var(--cream)] w-9 text-right">
                      {simPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STAGE 4: ACTION CARD - FINALIZE ROOMMATE & LAUNCH HOUSEHOLD */}
        <div className="rounded-[24px] border border-[var(--gold)]/35 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--gold)]/10 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                MUTUAL LIVING CONSENSUS
              </p>
              <h3 className="font-serif-display mt-2 text-3xl text-[var(--cream)]">
                Ready to live with {person.displayName.split(" ")[0]}?
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                Finalizing will create your shared household in <span className="text-[var(--cream)] font-medium">My Home</span>, auto-split your rent mathematically using the Largest-Remainder method, and generate a day-one chore rotation based on your compatibility profile.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {personListing && (
                <Link
                  href={`/explore/${personListing.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-medium text-[var(--cream)] transition-all hover:bg-white/10"
                >
                  <Home className="h-4 w-4 text-[var(--gold-soft)]" />
                  <span>View {person.displayName.split(" ")[0]}&apos;s Flat</span>
                </Link>
              )}
              <button
                type="button"
                disabled={formingHousehold}
                onClick={handleFormHousehold}
                className="inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-6 py-3.5 text-xs font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)] active:scale-[0.98] disabled:opacity-60 shadow-[0_0_32px_rgba(201,169,110,0.3)]"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {formingHousehold
                    ? "Setting up your home…"
                    : `Finalize & Move In with ${person.displayName.split(" ")[0]}`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

