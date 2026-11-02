"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Users, PlusCircle, Home, LogOut, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "./AuthProvider";

const NAV_LINKS = [
  { href: "/people", label: "People", icon: Users },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/list", label: "List a Room", icon: PlusCircle },
  { href: "/home", label: "My Home", icon: Home },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/login" || pathname === "/onboarding") {
    return null;
  }

  const displayName = profile?.displayName || user?.displayName || "Guest";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#0A0A0B]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <Link
            href="/"
            className="font-serif-display text-2xl font-medium tracking-[0.14em] text-[var(--cream)] whitespace-nowrap shrink-0 transition-colors hover:text-[var(--gold)]"
          >
            AURELIA
          </Link>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
            {NAV_LINKS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? "text-[var(--cream)] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:bg-[var(--gold)]"
                      : "hover:text-[var(--cream)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0" ref={menuRef}>
            {user || profile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--cream)] transition-colors hover:border-[var(--gold)]/50 whitespace-nowrap shrink-0"
                  aria-label="Account menu"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-[#0A0A0B]"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--gold), var(--rose))",
                    }}
                  >
                    {initial}
                  </span>
                  <span className="max-w-[110px] truncate">{displayName}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-[16px] border border-[var(--line)] bg-[var(--surface-2)] p-2 shadow-2xl">
                    {profile?.persona && (
                      <div className="mb-2 border-b border-[var(--line)] px-3 py-2">
                        <p className="text-[11px] tracking-wider uppercase text-[var(--muted)]">
                          Living Persona
                        </p>
                        <p className="mt-0.5 font-serif-display text-base text-[var(--gold-soft)]">
                          {profile.persona.name}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/onboarding");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--cream)] transition-colors hover:bg-white/5"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-[var(--gold)]" />
                      <span>Retake Lifestyle Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        router.push("/");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--bad)] transition-colors hover:bg-white/5"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--gold)] px-4 py-2 text-xs font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)] whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Begin Experience</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom bar (< 768px) */}
      {pathname !== "/" && (
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-[var(--line)] bg-[#0A0A0B]/95 px-2 py-2.5 backdrop-blur-md"
        >
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium whitespace-nowrap ${
                  active ? "text-[var(--gold)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
