"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Chrome, UserCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Orb from "@/components/ui/Orb";

export default function LoginPage() {
  const router = useRouter();
  const { signInGuest, signInGoogle } = useAuth();
  const [busy, setBusy] = useState<"instant" | "google" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setBusy("google");
    setErrorMsg(null);
    try {
      const existingProfile = await signInGoogle();
      if (existingProfile) {
        router.push("/people");
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      setBusy(null);
      const errObj = err as { code?: string; message?: string };
      console.error("Google sign-in error:", err);
      if (errObj?.code === "auth/popup-closed-by-user") {
        setErrorMsg("Google sign-in popup was closed before completion. You can try again or use Instant Demo Mode.");
      } else if (errObj?.code === "auth/unauthorized-domain") {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "this domain";
        setErrorMsg(`Domain "${hostname}" is not authorized in Firebase Console. Add it in Firebase Console > Authentication > Settings > Authorized Domains, or click Instant Demo Mode below.`);
      } else {
        setErrorMsg("Google sign-in could not complete in this preview window. Use Instant Demo Mode for immediate access.");
      }
    }
  };

  const handleInstantJudgeDemo = async () => {
    setBusy("instant");
    setErrorMsg(null);
    try {
      await signInGuest(true);
      router.push("/people");
    } catch {
      router.push("/people");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient background orbs */}
      <Orb color="#C9A96E" size={340} className="fixed -left-24 top-1/4 opacity-35" />
      <Orb color="#E7B7A8" size={300} className="fixed -right-24 bottom-1/4 opacity-30" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--cream)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Aurelia</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-8 md:p-10"
          style={{
            boxShadow:
              "0 0 40px rgba(201, 169, 110, 0.14), 0 20px 60px rgba(0, 0, 0, 0.55)",
          }}
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[var(--gold-soft)] font-medium">
            AURELIA ACCESS
          </p>
          <h1 className="font-serif-display mt-3 text-4xl text-[var(--cream)]">
            Find your people.
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
            Sign in with Google to complete your 7-step lifestyle quiz, unlock your Living Persona, and save your matches.
          </p>

          <div className="mt-8 space-y-4">
            {/* Primary Google Sign-In -> Triggers Quiz for new users */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleGoogleSignIn}
              className="group flex w-full items-center justify-between rounded-[14px] bg-[var(--gold)] px-5 py-4 text-sm font-medium text-[#0A0A0B] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--gold-soft)] active:scale-[0.98] disabled:opacity-60"
              style={{
                boxShadow: "0 0 32px rgba(201, 169, 110, 0.25)",
              }}
            >
              <span className="inline-flex items-center gap-2.5">
                <Chrome className="h-4 w-4 text-[#0A0A0B]" />
                <span>
                  {busy === "google"
                    ? "Connecting to Google…"
                    : "Continue with Google"}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--line)]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                <span className="bg-[var(--surface)] px-3 text-[var(--muted)]">
                  or speed demo
                </span>
              </div>
            </div>

            {/* Instant Judge Demo with Preloaded Profile */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleInstantJudgeDemo}
              className="group flex w-full items-center justify-between rounded-[14px] border border-[var(--gold)]/35 bg-[var(--surface-2)] px-5 py-3.5 text-xs font-medium text-[var(--gold-soft)] transition-all duration-200 hover:border-[var(--gold)] hover:bg-white/[0.04] active:scale-[0.98] disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[var(--gold)]" />
                <span>
                  {busy === "instant"
                    ? "Loading judge demo…"
                    : "Instant Judge Demo Mode (Pre-filled Profile)"}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {errorMsg && (
            <p className="mt-4 rounded-xl border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3.5 py-2.5 text-xs text-[var(--bad)]">
              {errorMsg}
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
            Judges can jump straight into the full experience with Instant Demo Mode. Sign in with Google to take the live matching quiz.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
