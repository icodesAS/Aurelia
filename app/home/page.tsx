"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  RotateCw,
  Check,
  Sparkles,
  ArrowRight,
  Compass,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedListings, seedUsers } from "@/lib/seed";
import {
  subscribeLatestHousehold,
  updateHouseholdDoc,
  createHouseholdDoc,
} from "@/lib/store";
import {
  splitRent,
  computeBalances,
  settleUp,
} from "@/lib/household";
import { Household, Expense, Chore } from "@/lib/types";
import { formatINR } from "@/lib/format";

export default function HouseholdPage() {
  const { user, profile } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [splitMode, setSplitMode] = useState<"fair" | "equal">("fair");

  // Expense form
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");

  // Chore form
  const [choreTitle, setChoreTitle] = useState("");
  const [choreFreq, setChoreFreq] = useState<"daily" | "weekly">("weekly");

  // AI Split explanation
  const [splitExplanation, setSplitExplanation] = useState<string | null>(null);
  const [explainingSplit, setExplainingSplit] = useState(false);

  const activeUid = user?.uid || profile?.uid || "guest-demo-user";

  useEffect(() => {
    const unsub = subscribeLatestHousehold(activeUid, (hh) => {
      setHousehold(hh);
      if (hh && hh.members.length > 0 && !paidBy) {
        setPaidBy(hh.members[0].id);
      }
    });
    return () => unsub();
  }, [activeUid, paidBy]);

  const handleCreateDefaultHousehold = async () => {
    const sampleListing = seedListings[0];
    const members = [
      {
        id: activeUid,
        name: profile?.displayName || "Aarav (You)",
        hue: 40,
        areaSqft: 150,
        attachedBath: true,
        balcony: false,
        ac: false,
      },
      {
        id: seedUsers[2].id,
        name: seedUsers[2].displayName,
        hue: seedUsers[2].hue,
        areaSqft: 120,
        attachedBath: false,
        balcony: false,
        ac: false,
      },
      {
        id: seedUsers[0].id,
        name: seedUsers[0].displayName,
        hue: seedUsers[0].hue,
        areaSqft: 100,
        attachedBath: false,
        balcony: false,
        ac: false,
      },
    ];

    const created = await createHouseholdDoc({
      ownerUid: activeUid,
      listingId: sampleListing.id,
      name: "Sunlit 3-Member Shared Residence",
      totalRent: 24000,
      members,
      expenses: [
        {
          id: "exp_seed_1",
          title: "Monthly Wi-Fi & Electricity Bill",
          amount: 3000,
          paidBy: members[0].id,
          splitBetween: members.map((m) => m.id),
          createdAt: Date.now(),
        },
      ],
      chores: [
        {
          id: "c1",
          title: "Take out the trash",
          assignedTo: members[0].id,
          frequency: "daily",
          done: false,
        },
        {
          id: "c2",
          title: "Clean the kitchen",
          assignedTo: members[1].id,
          frequency: "weekly",
          done: false,
        },
        {
          id: "c3",
          title: "Buy shared groceries",
          assignedTo: members[2].id,
          frequency: "weekly",
          done: false,
        },
        {
          id: "c4",
          title: "Clean the bathroom",
          assignedTo: members[0].id,
          frequency: "weekly",
          done: true,
        },
      ],
      createdAt: Date.now(),
    });
    setHousehold(created);
    setPaidBy(created.members[0].id);
  };

  const rentShares = useMemo(() => {
    if (!household) return [];
    return splitRent(household.totalRent, household.members, splitMode);
  }, [household, splitMode]);

  const balances = useMemo(() => {
    if (!household) return {};
    return computeBalances(household.members, household.expenses);
  }, [household]);

  const transfers = useMemo(() => {
    return settleUp(balances);
  }, [balances]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household) return;
    const amt = parseFloat(billAmount);
    if (!billTitle.trim() || Number.isNaN(amt) || amt <= 0) return;

    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      title: billTitle.trim(),
      amount: Math.round(amt),
      paidBy: paidBy || household.members[0].id,
      splitBetween: household.members.map((m) => m.id),
      createdAt: Date.now(),
    };

    const updated: Household = {
      ...household,
      expenses: [newExp, ...household.expenses],
    };
    setHousehold(updated);
    setBillTitle("");
    setBillAmount("");
    await updateHouseholdDoc(updated);
  };

  const handleToggleChore = async (choreId: string) => {
    if (!household) return;
    const updated: Household = {
      ...household,
      chores: household.chores.map((c) =>
        c.id === choreId ? { ...c, done: !c.done } : c
      ),
    };
    setHousehold(updated);
    await updateHouseholdDoc(updated);
  };

  const handleRotateChores = async () => {
    if (!household || household.members.length === 0) return;
    const ids = household.members.map((m) => m.id);
    const updated: Household = {
      ...household,
      chores: household.chores.map((c) => {
        const idx = ids.indexOf(c.assignedTo);
        const nextId = ids[(idx + 1) % ids.length];
        return { ...c, assignedTo: nextId, done: false };
      }),
    };
    setHousehold(updated);
    await updateHouseholdDoc(updated);
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !choreTitle.trim()) return;
    const newChore: Chore = {
      id: `ch_${Date.now()}`,
      title: choreTitle.trim(),
      assignedTo: household.members[0].id,
      frequency: choreFreq,
      done: false,
    };
    const updated: Household = {
      ...household,
      chores: [...household.chores, newChore],
    };
    setHousehold(updated);
    setChoreTitle("");
    await updateHouseholdDoc(updated);
  };

  const handleExplainSplit = async () => {
    if (!household) return;
    setExplainingSplit(true);
    try {
      const sharesPayload = household.members.map((m) => {
        const s = rentShares.find((r) => r.id === m.id);
        return {
          name: m.name,
          areaSqft: m.areaSqft,
          attachedBath: m.attachedBath,
          balcony: m.balcony,
          ac: m.ac,
          share: s?.share ?? 0,
        };
      });
      const res = await fetch("/api/ai/split-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalRent: household.totalRent,
          mode: splitMode,
          shares: sharesPayload,
        }),
      });
      const json = await res.json();
      if (json?.data?.explanation) {
        setSplitExplanation(json.data.explanation);
      }
    } finally {
      setExplainingSplit(false);
    }
  };

  if (!household) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
          HOUSEHOLD DASHBOARD
        </p>
        <h1 className="font-serif-display mt-3 text-4xl text-[var(--cream)]">
          No active household yet.
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Move into any listing from Explore—or launch our pre-configured
          ₹24,000 3-member demo household right now.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleCreateDefaultHousehold}
            className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--gold)] px-6 py-3.5 text-xs font-medium text-[#0A0A0B] hover:bg-[var(--gold-soft)]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch ₹24,000 Demo Household</span>
          </button>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-5 py-3.5 text-xs font-medium text-[var(--cream)]"
          >
            <Compass className="h-4 w-4 text-[var(--gold)]" />
            <span>Browse Homes in Explore</span>
          </Link>
        </div>
      </div>
    );
  }

  // Hand-crafted SVG Ring Chart geometry
  const size = 230;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeFraction = 0;

  const memberNameMap = new Map(household.members.map((m) => [m.id, m.name]));

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
            SHARED LIVING OPERATING SYSTEM
          </p>
          <h1 className="font-serif-display mt-2 text-4xl md:text-5xl text-[var(--cream)]">
            {household.name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-2">
              {household.members.map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0A0A0B] text-xs font-semibold text-[#0A0A0B]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${m.hue} 70% 62%), hsl(${
                      (m.hue + 40) % 360
                    } 70% 45%))`,
                  }}
                >
                  {m.name[0]}
                </span>
              ))}
            </div>
            <span className="text-xs text-[var(--muted)]">
              {household.members.map((m) => m.name.split(" ")[0]).join(" · ")}
            </span>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-xs text-[var(--muted)]">Total Monthly Rent</p>
          <p className="font-serif-display tabular-nums text-4xl md:text-5xl text-[var(--gold-soft)]">
            {formatINR(household.totalRent)}
          </p>
        </div>
      </div>

      {/* Main Grid: Rent Split Ring (Left) + Bills & Settle Up (Right) */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT: SMART RENT SPLIT RING CHART */}
        <div className="lg:col-span-7 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif-display text-3xl text-[var(--cream)]">
                  Smart Rent Split
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Weighted by room square footage &amp; private amenities
                  (largest-remainder rupee rounding)
                </p>
              </div>

              {/* Segmented Toggle: Fair / Equal */}
              <div className="flex items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1">
                {(["fair", "equal"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSplitMode(m);
                      setSplitExplanation(null);
                    }}
                    className={`rounded-[8px] px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                      splitMode === m
                        ? "bg-[var(--gold)] text-[#0A0A0B]"
                        : "text-[var(--muted)] hover:text-[var(--cream)]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Donut Ring + Member Share Rows */}
            <div className="mt-8 grid grid-cols-1 items-center gap-8 md:grid-cols-12">
              <div className="md:col-span-5 flex justify-center">
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
                    {household.members.map((member) => {
                      const shareObj = rentShares.find((r) => r.id === member.id);
                      const share = shareObj?.share ?? 0;
                      const fraction =
                        household.totalRent > 0
                          ? share / household.totalRent
                          : 0;
                      const arcLength = fraction * circumference;
                      const dashArray = `${Math.max(
                        0,
                        arcLength - 4
                      )} ${circumference}`;
                      const dashOffset = -cumulativeFraction * circumference;
                      cumulativeFraction += fraction;

                      return (
                        <circle
                          key={member.id}
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke={`hsl(${member.hue} 70% 60%)`}
                          strokeWidth={strokeWidth}
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-700 ease-out"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      {splitMode} split
                    </span>
                    <span className="font-serif-display tabular-nums text-2xl text-[var(--cream)]">
                      {formatINR(household.totalRent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                {household.members.map((member) => {
                  const shareObj = rentShares.find((r) => r.id === member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{
                            background: `hsl(${member.hue} 70% 60%)`,
                          }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--cream)]">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">
                            {member.areaSqft} sq ft
                            {member.attachedBath ? " · Attached bath" : ""}
                            {member.balcony ? " · Balcony" : ""}
                            {member.ac ? " · AC" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-serif-display tabular-nums text-xl text-[var(--gold-soft)]">
                          {formatINR(shareObj?.share ?? 0)}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-[var(--muted)]">
                          {shareObj?.pct ?? 0}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* P1: AI Split Explanation */}
          <div className="mt-8 border-t border-[var(--line)] pt-5">
            {splitExplanation ? (
              <p className="text-xs leading-relaxed text-[var(--gold-soft)]">
                ✦ {splitExplanation}
              </p>
            ) : (
              <button
                type="button"
                disabled={explainingSplit}
                onClick={handleExplainSplit}
                className="inline-flex items-center gap-2 text-xs text-[var(--gold)] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {explainingSplit
                    ? "Asking Gemini to explain this split…"
                    : "Why this split? (AI explanation)"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: SHARED BILLS + SETTLE UP */}
        <div className="lg:col-span-5 space-y-6">
          {/* Settle Up Card */}
          <div className="rounded-[20px] border border-[var(--gold)]/35 bg-[var(--surface)] p-6">
            <h2 className="font-serif-display text-2xl text-[var(--cream)]">
              Who Owes Whom
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Minimum transfers to settle all shared household bills
            </p>

            {transfers.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {transfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2 text-[var(--cream)]">
                      <span className="font-medium">
                        {memberNameMap.get(t.from)?.split(" ")[0] || t.from}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--gold)]" />
                      <span className="font-medium">
                        {memberNameMap.get(t.to)?.split(" ")[0] || t.to}
                      </span>
                    </div>
                    <span className="font-serif-display tabular-nums text-lg text-[var(--gold-soft)]">
                      {formatINR(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[var(--good)]">
                ✓ All settled up. Nobody owes anything right now.
              </p>
            )}
          </div>

          {/* Shared Bills Card */}
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="font-serif-display text-2xl text-[var(--cream)]">
              Shared Bills
            </h2>

            <form onSubmit={handleAddExpense} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="e.g. Groceries, Wi-Fi"
                  className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                />
                <input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="Amount (₹)"
                  className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  aria-label="Paid by member"
                  className="flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                >
                  {household.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      Paid by {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--gold)] px-4 py-2 text-xs font-medium text-[#0A0A0B] hover:bg-[var(--gold-soft)] whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Bill</span>
                </button>
              </div>
            </form>

            <div className="mt-5 max-h-48 space-y-2 overflow-y-auto pr-1">
              {household.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)]/60 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-medium text-[var(--cream)]">
                      {exp.title}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      Paid by{" "}
                      {memberNameMap.get(exp.paidBy)?.split(" ")[0] ||
                        exp.paidBy}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs text-[var(--gold-soft)]">
                    {formatINR(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: CHORES ROTA */}
      <div className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-3xl text-[var(--cream)]">
              House Chores Rota
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Round-robin assignments keep the kitchen and common areas effortless
            </p>
          </div>

          <button
            type="button"
            onClick={handleRotateChores}
            className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-medium text-[var(--gold-soft)] transition-colors hover:border-[var(--gold)]/50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Rotate All Assignments</span>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {household.chores.map((chore) => {
            const assignee = household.members.find(
              (m) => m.id === chore.assignedTo
            );
            return (
              <button
                key={chore.id}
                type="button"
                onClick={() => handleToggleChore(chore.id)}
                className={`flex flex-col justify-between rounded-[14px] border p-4 text-left transition-all ${
                  chore.done
                    ? "border-[var(--good)]/40 bg-[var(--good)]/5 opacity-75"
                    : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--gold)]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      chore.done
                        ? "line-through text-[var(--muted)]"
                        : "text-[var(--cream)]"
                    }`}
                  >
                    {chore.title}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      chore.done
                        ? "border-[var(--good)] bg-[var(--good)] text-[#0A0A0B]"
                        : "border-white/20"
                    }`}
                  >
                    {chore.done && <Check className="h-3 w-3" />}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>{assignee?.name.split(" ")[0] || "Member"}</span>
                  <span className="capitalize">{chore.frequency}</span>
                </div>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleAddChore}
          className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[var(--line)] pt-5"
        >
          <input
            type="text"
            value={choreTitle}
            onChange={(e) => setChoreTitle(e.target.value)}
            placeholder="Add a house chore…"
            className="flex-1 min-w-[200px] rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
          />
          <select
            value={choreFreq}
            onChange={(e) =>
              setChoreFreq(e.target.value as "daily" | "weekly")
            }
            aria-label="Chore frequency"
            className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--cream)]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-4 py-2 text-xs font-medium text-[var(--gold-soft)] hover:bg-[var(--gold)]/25"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Chore</span>
          </button>
        </form>
      </div>
    </div>
  );
}
