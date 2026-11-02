"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Users, Compass } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  QUIZ_QUESTIONS,
  DEFAULT_QUIZ_ANSWERS,
  answersToNumericTraits,
  getOptionDisplayLabel,
  DIMENSION_LABELS,
} from "@/lib/quiz";
import { QuizAnswers, Profile } from "@/lib/types";
import { personaFallback } from "@/lib/ai/fallbacks";
import LoadingLine from "@/components/ui/LoadingLine";

const BUDGET_PRESETS = [
  { label: "Under ₹5k", min: 0, max: 5000 },
  { label: "₹5k – ₹8k", min: 5000, max: 8000 },
  { label: "₹8k – ₹12k", min: 8000, max: 12000 },
  { label: "₹12k – ₹18k", min: 12000, max: 18000 },
  { label: "₹18k+", min: 18000, max: 40000 },
];

const CITIES = ["Rajpura", "Zirakpur", "Mohali", "Chandigarh", "Panchkula"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, saveProfile, signInGuest } = useAuth();

  // Steps: 0 = Name & Intent, 1..7 = Quiz Questions, 8 = Budget & City, 9 = Loading, 10 = Summary
  const [step, setStep] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string>(
    profile?.displayName || user?.displayName || ""
  );
  const [occupation, setOccupation] = useState<string>(
    profile?.occupation || "B.Tech student"
  );
  const [intent, setIntent] = useState<"find" | "host" | "both">(
    profile?.intent || "both"
  );
  const [answers, setAnswers] = useState<QuizAnswers>(
    profile?.answers || { ...DEFAULT_QUIZ_ANSWERS }
  );
  const [budgetPresetIdx, setBudgetPresetIdx] = useState<number>(3); // 12k-18k default
  const [city, setCity] = useState<string>(profile?.city || "Rajpura");
  const [persona, setPersona] = useState<{ name: string; tagline: string } | null>(
    profile?.persona || null
  );
  const [personaSource, setPersonaSource] = useState<"gemini" | "fallback">("fallback");

  const totalInteractiveSteps = 9; // 0..8
  const progressPct = Math.min(100, Math.round(((step + 1) / totalInteractiveSteps) * 100));

  const handleSelectQuizOption = <K extends keyof QuizAnswers>(
    key: K,
    val: QuizAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
    setTimeout(() => {
      setStep((s) => Math.min(8, s + 1));
    }, 320);
  };

  const handleFinishQuiz = async () => {
    setStep(9);
    const startTime = Date.now();

    let activeUid = user?.uid;
    if (!activeUid) {
      const guestProf = await signInGuest(false);
      activeUid = guestProf?.uid || "guest-demo-user";
    }

    let generatedPersona = personaFallback(answers);
    let source: "gemini" | "fallback" = "fallback";

    try {
      const res = await fetch("/api/ai/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.name) {
          generatedPersona = json.data;
          source = json.source === "gemini" ? "gemini" : "fallback";
        }
      }
    } catch {
      // use fallback
    }

    const elapsed = Date.now() - startTime;
    if (elapsed < 1600) {
      await new Promise((r) => setTimeout(r, 1600 - elapsed));
    }

    const chosenBudget = BUDGET_PRESETS[budgetPresetIdx] || BUDGET_PRESETS[3];
    const finalName = displayName.trim() || "Aarav";

    const newProfile: Profile = {
      uid: activeUid || "guest-demo-user",
      displayName: finalName,
      occupation: occupation.trim() || "Student",
      city,
      budgetMin: chosenBudget.min,
      budgetMax: chosenBudget.max,
      intent,
      answers,
      numericTraits: answersToNumericTraits(answers, chosenBudget.max, "hybrid"),
      persona: generatedPersona,
      createdAt: Date.now(),
    };

    await saveProfile(newProfile);
    setPersona(generatedPersona);
    setPersonaSource(source);
    setStep(10);
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between px-6 py-10">
      {/* Top thin gold progress bar */}
      {step <= 8 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
          <motion.div
            className="h-full bg-[var(--gold)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Top Navigation Row */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        {step > 0 && step <= 8 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--cream)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--cream)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
        )}

        {step <= 8 && (
          <span className="font-mono tabular-nums text-xs text-[var(--muted)]">
            0{step + 1} / 0{totalInteractiveSteps}
          </span>
        )}
      </div>

      {/* Center Stage */}
      <div className="mx-auto my-auto w-full max-w-2xl py-12">
        <AnimatePresence mode="wait">
          {/* STEP 0: NAME & INTENT */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
                  LIFESTYLE ONBOARDING
                </p>
                <h1 className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]">
                  What should we call you?
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Every user on Aurelia has one profile—whether you are looking
                  for a room, hosting one, or both.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="onboard-name"
                    className="block text-xs text-[var(--muted)] mb-2"
                  >
                    Your first name
                  </label>
                  <input
                    id="onboard-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Aman, Priya, Rahul"
                    className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5 text-base text-[var(--cream)] placeholder:text-[var(--muted)]/50 focus:border-[var(--gold)] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="onboard-occ"
                    className="block text-xs text-[var(--muted)] mb-2"
                  >
                    What do you do?
                  </label>
                  <input
                    id="onboard-occ"
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. B.Tech student, Designer"
                    className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5 text-base text-[var(--cream)] placeholder:text-[var(--muted)]/50 focus:border-[var(--gold)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-3">
                  What brings you to Aurelia today?
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { value: "find" as const, label: "Looking for a room" },
                    { value: "host" as const, label: "I have a room" },
                    { value: "both" as const, label: "Both" },
                  ].map((item) => {
                    const active = intent === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setIntent(item.value)}
                        className={`flex items-center justify-between rounded-[14px] border px-4 py-3.5 text-left text-sm font-medium transition-all ${
                          active
                            ? "border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--cream)]"
                            : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-white/20 hover:text-[var(--cream)]"
                        }`}
                      >
                        <span>{item.label}</span>
                        {active && <Check className="h-4 w-4 text-[var(--gold)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-7 py-4 text-sm font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)]"
                >
                  <span>Start 7-Question Lifestyle Quiz</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEPS 1..7: THE 7 LIFESTYLE QUIZ QUESTIONS */}
          {step >= 1 && step <= 7 && (() => {
            const q = QUIZ_QUESTIONS[step - 1];
            const currentVal = answers[q.key];
            return (
              <motion.div
                key={`quiz-${q.key}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
                    QUESTION 0{step} OF 07 · {q.dimensionLabel}
                  </p>
                  <h2
                    className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]"
                    style={{ textWrap: "balance" }}
                  >
                    {q.question}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{q.subtitle}</p>
                </div>

                <div className="space-y-3.5">
                  {q.options.map((opt) => {
                    const selected = currentVal === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectQuizOption(q.key, opt.value)}
                        className={`group flex min-h-[76px] w-full items-center justify-between rounded-[16px] border px-6 py-4 text-left transition-all duration-200 ${
                          selected
                            ? "border-[var(--gold)] bg-[var(--gold)]/12"
                            : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--gold)]/45 hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <div>
                          <p className="text-base font-medium text-[var(--cream)]">
                            {opt.label}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {opt.helper}
                          </p>
                        </div>
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            selected
                              ? "border-[var(--gold)] bg-[var(--gold)] text-[#0A0A0B]"
                              : "border-white/20 group-hover:border-[var(--gold)]/60"
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}

          {/* STEP 8: BUDGET & CITY */}
          {step === 8 && (
            <motion.div
              key="step-8"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
                  FINAL STEP · BUDGET &amp; LOCATION
                </p>
                <h2 className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]">
                  Your monthly budget and preferred city.
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Used as smart defaults when you ask the AI Concierge for homes.
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-3">
                  Monthly rent per person (INR)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {BUDGET_PRESETS.map((preset, idx) => {
                    const active = budgetPresetIdx === idx;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setBudgetPresetIdx(idx)}
                        className={`rounded-[14px] border px-3.5 py-3 text-xs font-medium transition-all whitespace-nowrap ${
                          active
                            ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                            : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--cream)]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-3">Preferred city</p>
                <div className="flex flex-wrap gap-3">
                  {CITIES.map((c) => {
                    const active = city === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCity(c)}
                        className={`rounded-[14px] border px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                          active
                            ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                            : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--cream)]"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  className="inline-flex items-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-8 py-4 text-sm font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)]"
                  style={{
                    boxShadow: "0 0 36px rgba(201, 169, 110, 0.25)",
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Calculate My Living Persona &amp; Matches</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 9: THEMED LOADING SCREEN */}
          {step === 9 && (
            <motion.div
              key="step-9"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <LoadingLine
                messages={[
                  "Reading your vibe…",
                  "Mapping your circadian and acoustic preferences…",
                  "Finding people who match your rhythm…",
                ]}
              />
            </motion.div>
          )}

          {/* STEP 10: SUMMARY + LIVING PERSONA */}
          {step === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[20px] border border-[var(--gold)]/40 bg-[var(--surface)] p-8 md:p-10"
              style={{
                boxShadow: "0 0 40px rgba(201, 169, 110, 0.16)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
                  YOUR LIVING PERSONA
                </span>
                {personaSource === "gemini" && (
                  <span className="text-xs text-[var(--gold)]">✦ AI Crafted</span>
                )}
              </div>

              <h2 className="font-serif-display mt-3 text-4xl md:text-5xl text-[var(--cream)]">
                {persona?.name || "The Quiet Curator"}
              </h2>
              <p className="mt-2 text-base text-[var(--muted)]">
                {persona?.tagline ||
                  "You like a home that matches your natural daily rhythm."}
              </p>

              <div className="mt-8 border-t border-[var(--line)] pt-6">
                <p className="text-xs text-[var(--muted)] mb-3">
                  Your 7 Lifestyle Dimensions
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(Object.keys(answers) as (keyof QuizAnswers)[]).map((k) => (
                    <div
                      key={k}
                      className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5"
                    >
                      <p className="text-[11px] text-[var(--muted)]">
                        {DIMENSION_LABELS[k]}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-[var(--cream)]">
                        {getOptionDisplayLabel(k, answers[k])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/people")}
                  className="inline-flex items-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-7 py-4 text-sm font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)]"
                >
                  <Users className="h-4 w-4" />
                  <span>See Roommate Matches</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/explore")}
                  className="inline-flex items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] px-6 py-4 text-sm font-medium text-[var(--cream)] transition-colors hover:border-[var(--gold)]/50"
                >
                  <Compass className="h-4 w-4 text-[var(--gold)]" />
                  <span>Explore Homes</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div />
    </div>
  );
}
