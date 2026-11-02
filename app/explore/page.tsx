"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, RotateCcw, ArrowUpRight, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedListings, seedUsers } from "@/lib/seed";
import { subscribeUserListings } from "@/lib/store";
import { Listing } from "@/lib/types";
import {
  EMPTY_FILTERS,
  Filters,
  rankListings,
} from "@/lib/search";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import { formatINR } from "@/lib/format";
import TiltCard from "@/components/ui/TiltCard";
import FitBadge from "@/components/ui/FitBadge";
import GradientCover from "@/components/ui/GradientCover";

const EXAMPLE_QUERIES = [
  "Quiet 2BHK near campus under 18k with vegetarian roommates",
  "Private furnished room in Mohali under 13k",
  "Women-only room in Chandigarh under 6k",
];

function formatActiveFilterLabels(f: Filters): string[] {
  const labels: string[] = [];
  if (f.bhk != null) labels.push(`${f.bhk}BHK`);
  if (f.nearLandmark) labels.push(`Near ${f.nearLandmark}`);
  for (const area of f.areaKeywords) {
    labels.push(area.charAt(0).toUpperCase() + area.slice(1));
  }
  if (f.maxRent != null) labels.push(`Under ${formatINR(f.maxRent)}`);
  if (f.vibe !== "unspecified") {
    labels.push(f.vibe.charAt(0).toUpperCase() + f.vibe.slice(1));
  }
  if (f.foodRule === "veg_only") labels.push("Veg-only");
  if (f.roomType !== "unspecified") {
    labels.push(
      f.roomType === "private_room"
        ? "Private room"
        : f.roomType === "shared_room"
        ? "Shared room"
        : "Entire flat"
    );
  }
  if (f.furnished != null) {
    labels.push(f.furnished ? "Furnished" : "Unfurnished");
  }
  if (f.suitableFor === "women_only") labels.push("Women only");
  if (f.suitableFor === "men_only") labels.push("Men only");
  return labels;
}

export default function ExplorePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [queryText, setQueryText] = useState("");
  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [source, setSource] = useState<"gemini" | "fallback">("fallback");
  const [thinkingStep, setThinkingStep] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const unsub = subscribeUserListings((items) => {
      setUserListings(items);
    });
    return () => unsub();
  }, []);

  const allListings = useMemo(
    () => [...userListings, ...seedListings],
    [userListings]
  );

  const userAnswers = profile?.answers ?? DEFAULT_QUIZ_ANSWERS;

  const rankedConcierge = useMemo(() => {
    if (!activeFilters) return [];
    return rankListings(allListings, activeFilters, userAnswers, seedUsers);
  }, [allListings, activeFilters, userAnswers]);

  const allRankedDefault = useMemo(() => {
    return rankListings(allListings, EMPTY_FILTERS, userAnswers, seedUsers);
  }, [allListings, userAnswers]);

  const runConciergeSearch = async (qStr: string) => {
    const trimmed = qStr.trim();
    if (!trimmed) return;
    setQueryText(trimmed);
    setThinkingStep(1);

    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = await res.json();
      let filters: Filters = json?.data?.filters ?? { ...EMPTY_FILTERS };

      // Apply profile defaults if every filter is empty
      const hasAny =
        filters.areaKeywords.length > 0 ||
        filters.nearLandmark != null ||
        filters.maxRent != null ||
        filters.bhk != null ||
        filters.roomType !== "unspecified" ||
        filters.furnished != null ||
        filters.foodRule !== "unspecified" ||
        filters.vibe !== "unspecified" ||
        filters.suitableFor !== "unspecified";

      if (!hasAny && profile) {
        filters = {
          ...filters,
          maxRent: profile.budgetMax,
          areaKeywords: [profile.city.toLowerCase()],
        };
      }

      setActiveFilters(filters);
      setAssistantMessage(
        json?.data?.assistantMessage || "Here is what I found for you."
      );
      setSource(json?.source === "gemini" ? "gemini" : "fallback");

      setThinkingStep(2);
      setTimeout(() => {
        setThinkingStep(3);
      }, 450);
    } catch {
      setThinkingStep(3);
    }
  };

  const handleReset = () => {
    setQueryText("");
    setActiveFilters(null);
    setAssistantMessage(null);
    setThinkingStep(0);
  };

  const filterChips = activeFilters ? formatActiveFilterLabels(activeFilters) : [];
  const seedUserMap = useMemo(
    () => new Map(seedUsers.map((u) => [u.id, u])),
    []
  );

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      {/* CONCIERGE HERO BOX */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
          AI CONCIERGE SEARCH
        </p>
        <h1
          className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]"
          style={{ textWrap: "balance" }}
        >
          Describe your ideal home in your own words.
        </h1>
        <p className="mt-2.5 text-sm text-[var(--muted)]">
          Gemini translates your sentence into transparent criteria; Aurelia
          ranks every home by constraint fit + housemate compatibility.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runConciergeSearch(queryText);
          }}
          className="mt-8"
        >
          <div
            className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-2)] p-2 pl-5 transition-colors focus-within:border-[var(--gold)]"
            style={{
              boxShadow: "0 0 40px rgba(201, 169, 110, 0.12)",
            }}
          >
            <Search className="h-5 w-5 shrink-0 text-[var(--gold)]" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. Quiet 2BHK near campus under 18k with vegetarian roommates"
              className="w-full bg-transparent py-2.5 text-sm md:text-base text-[var(--cream)] placeholder:text-[var(--muted)]/60 focus:outline-none"
            />
            {activeFilters && (
              <button
                type="button"
                onClick={handleReset}
                title="Clear search"
                className="rounded-[12px] p-2.5 text-[var(--muted)] hover:text-[var(--cream)]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--gold)] px-5 py-3 text-xs font-medium text-[#0A0A0B] transition-all hover:bg-[var(--gold-soft)] whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Find Homes</span>
            </button>
          </div>
        </form>

        {/* Example suggestion buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => runConciergeSearch(example)}
              className="rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--muted)] transition-colors hover:border-[var(--gold)]/50 hover:text-[var(--cream)]"
            >
              &ldquo;{example}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* CONCIERGE THINKING SEQUENCE & PARSED FILTERS */}
      <AnimatePresence>
        {thinkingStep > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto mt-10 max-w-3xl rounded-[20px] border border-[var(--gold)]/30 bg-[var(--surface)] p-6"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                  {thinkingStep === 1
                    ? "Understanding your request…"
                    : "Matching homes with people like you…"}
                </span>
                {thinkingStep >= 2 && (
                  <span className="text-[var(--gold-soft)]">
                    {source === "gemini" ? "✦ AI Parsed" : "Smart Parser"}
                  </span>
                )}
              </div>

              {assistantMessage && thinkingStep >= 2 && (
                <p className="font-serif-display text-2xl text-[var(--cream)]">
                  {assistantMessage}
                </p>
              )}

              {filterChips.length > 0 && thinkingStep >= 2 && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--gold-soft)]">
                  <span className="text-[var(--muted)]">Active criteria:</span>
                  {filterChips.map((chip, idx) => (
                    <motion.span
                      key={chip}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08 }}
                      className="rounded-lg border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-2.5 py-1 text-xs text-[var(--gold-soft)]"
                    >
                      {chip}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RANKED RESULTS GRID */}
      <div className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif-display text-3xl text-[var(--cream)]">
            {activeFilters ? "Top Concierge Matches" : "Recommended Homes for You"}
          </h2>
          <span className="text-xs text-[var(--muted)]">
            Ranked by 60% property criteria + 40% roommate compatibility
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(activeFilters ? rankedConcierge : allRankedDefault).map(
            (item, idx) => {
              const { listing, fit, reasons, misses, residentCompat } = item;
              const residents = listing.residentIds
                .map((id) => seedUserMap.get(id))
                .filter(Boolean);

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: idx * 0.07 }}
                >
                  <TiltCard
                    glowGold={idx === 0 && Boolean(activeFilters)}
                    onClick={() => router.push(`/explore/${listing.id}`)}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative">
                        <GradientCover
                          seed={listing.gradientSeed}
                          coverImage={listing.coverImage}
                          alt={listing.title}
                          className="h-44"
                        />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                          <div>
                            <p className="text-xs text-[var(--gold-soft)]">
                              {listing.area} · {listing.city}
                            </p>
                            <p className="font-serif-display tabular-nums text-2xl text-[var(--cream)]">
                              {formatINR(listing.askingRent)}
                              <span className="text-xs font-sans text-[var(--muted)]">
                                {" "}
                                / month
                              </span>
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[#0A0A0B]/85 p-1.5 backdrop-blur-sm">
                            <FitBadge
                              score={fit}
                              size={50}
                              label="Aurelia Fit"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <h3 className="font-serif-display text-2xl text-[var(--cream)]">
                          {listing.title}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                          {listing.tagline}
                        </p>

                        {/* Matched Reasons */}
                        <div className="mt-4 space-y-1.5 text-xs">
                          {reasons.map((r, i) => (
                            <p key={i} className="text-[var(--good)]">
                              ✓ {r}
                            </p>
                          ))}
                          {misses.slice(0, 1).map((m, i) => (
                            <p key={i} className="text-[var(--muted)]">
                              · Note: {m}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Residents */}
                    <div className="border-t border-[var(--line)] px-6 py-4 flex items-center justify-between text-xs">
                      {residents.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {residents.map((res) => (
                              <span
                                key={res!.id}
                                title={res!.displayName}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0A0A0B] text-[10px] font-semibold text-[#0A0A0B]"
                                style={{
                                  background: `linear-gradient(135deg, hsl(${
                                    res!.hue
                                  } 70% 62%), hsl(${
                                    (res!.hue + 40) % 360
                                  } 70% 45%))`,
                                }}
                              >
                                {res!.displayName[0]}
                              </span>
                            ))}
                          </div>
                          <span className="text-[var(--muted)]">
                            {residentCompat}% roommate match
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                          <Users className="h-3.5 w-3.5" />
                          <span>Whole flat / Ready to move</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[var(--gold)] font-medium">
                        <span>View</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </TiltCard>
                </motion.div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
