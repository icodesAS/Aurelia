import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(201, 169, 110, 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)] font-medium">
          404 · Uncharted Space
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[var(--cream)] font-normal tracking-tight">
          This place hasn&apos;t been found yet.
        </h1>
        <p className="text-[var(--muted)] text-sm leading-relaxed">
          The sanctuary or room you are looking for might have moved, or the link may be out of date.
        </p>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-[var(--gold)] text-[var(--ink)] hover:brightness-110 transition-all shadow-[0_0_24px_rgba(201,169,110,0.2)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-[var(--line)] text-[var(--cream)] hover:border-[var(--gold)]/40 hover:bg-white/[0.02] transition-all"
          >
            Explore Homes
          </Link>
        </div>
      </div>
    </main>
  );
}
