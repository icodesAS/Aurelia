"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, Users, Check, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedListings, seedUsers } from "@/lib/seed";
import { subscribeUserListings, createHouseholdDoc } from "@/lib/store";
import { Listing, HouseholdMember, Chore } from "@/lib/types";
import { scoreMatch } from "@/lib/match";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import { formatINR } from "@/lib/format";
import GradientCover from "@/components/ui/GradientCover";
import FitBadge from "@/components/ui/FitBadge";
import TiltCard from "@/components/ui/TiltCard";

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, signInGuest } = useAuth();
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [movingIn, setMovingIn] = useState(false);

  useEffect(() => {
    const unsub = subscribeUserListings((items) => setUserListings(items));
    return () => unsub();
  }, []);

  const listing = useMemo(() => {
    const all = [...userListings, ...seedListings];
    return all.find((l) => l.id === params.id) ?? seedListings[0];
  }, [userListings, params.id]);

  const youAnswers = profile?.answers ?? DEFAULT_QUIZ_ANSWERS;

  const residents = useMemo(() => {
    return listing.residentIds
      .map((id) => seedUsers.find((u) => u.id === id))
      .filter((u): u is (typeof seedUsers)[number] => Boolean(u))
      .map((u) => ({
        user: u,
        match: scoreMatch(youAnswers, u.answers),
      }));
  }, [listing.residentIds, youAnswers]);

  const handleMoveInDemo = async () => {
    setMovingIn(true);
    let activeUid = user?.uid || profile?.uid;
    if (!activeUid) {
      const guestProf = await signInGuest(true);
      activeUid = guestProf?.uid || "guest-demo-user";
    }

    const youName = profile?.displayName || "You";

    // Select up to 2 housemates: listing residents if present, otherwise top 2 compatible seed users
    let housemateSeeds = listing.residentIds
      .map((id) => seedUsers.find((u) => u.id === id))
      .filter((u): u is (typeof seedUsers)[number] => Boolean(u))
      .slice(0, 2);

    if (housemateSeeds.length === 0) {
      housemateSeeds = [...seedUsers]
        .sort(
          (a, b) =>
            scoreMatch(youAnswers, b.answers).score -
            scoreMatch(youAnswers, a.answers).score
        )
        .slice(0, 2);
    }

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
      ...housemateSeeds.map((hm, idx) => ({
        id: hm.id,
        name: hm.displayName,
        hue: hm.hue,
        areaSqft: idx === 0 ? 120 : 100,
        attachedBath: false,
        balcony: false,
        ac: false,
      })),
    ];

    const totalRent =
      listing.roomType === "entire_flat"
        ? listing.askingRent
        : listing.askingRent * members.length;

    const starterChores: Chore[] = [
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
        assignedTo: members[1 % members.length].id,
        frequency: "weekly",
        done: false,
      },
      {
        id: "c3",
        title: "Buy shared groceries",
        assignedTo: members[2 % members.length].id,
        frequency: "weekly",
        done: false,
      },
      {
        id: "c4",
        title: "Clean the bathroom",
        assignedTo: members[0].id,
        frequency: "weekly",
        done: false,
      },
    ];

    await createHouseholdDoc({
      ownerUid: activeUid,
      listingId: listing.id,
      name: listing.title,
      totalRent,
      members,
      expenses: [
        {
          id: "exp_demo_1",
          title: "High-speed Fiber Wi-Fi & Router",
          amount: 3000,
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

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12">
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--cream)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Explore</span>
      </Link>

      {/* Cover + Header */}
      <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)]">
        <GradientCover
          seed={listing.gradientSeed}
          coverImage={listing.coverImage}
          alt={listing.title}
          className="h-64 md:h-80"
        />

        <div className="p-8 md:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--gold-soft)]">
                <span>{listing.area}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.city}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.bhk}BHK</span>
                <span aria-hidden="true">·</span>
                <span>
                  {listing.roomType === "private_room"
                    ? "Private Room"
                    : listing.roomType === "shared_room"
                    ? "Shared Room"
                    : "Entire Flat"}
                </span>
              </div>

              <h1 className="font-serif-display mt-2 text-4xl md:text-5xl text-[var(--cream)]">
                {listing.title}
              </h1>
              <p className="mt-2 text-base text-[var(--muted)]">
                {listing.tagline}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end shrink-0">
              <div className="font-serif-display tabular-nums text-4xl text-[var(--gold-soft)]">
                {formatINR(listing.askingRent)}
                <span className="text-sm font-sans text-[var(--muted)]">
                  {" "}
                  / month
                </span>
              </div>
              <button
                type="button"
                disabled={movingIn}
                onClick={handleMoveInDemo}
                className="mt-4 inline-flex items-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-6 py-3.5 text-xs font-medium text-[#0A0A0B] transition-all hover:-translate-y-0.5 hover:bg-[var(--gold-soft)] disabled:opacity-60"
                style={{
                  boxShadow: "0 0 32px rgba(201, 169, 110, 0.25)",
                }}
              >
                <Home className="h-4 w-4" />
                <span>
                  {movingIn
                    ? "Setting up your household…"
                    : "Move in (Launch Household Demo)"}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--line)] pt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <h2 className="font-serif-display text-2xl text-[var(--cream)]">
                About this home
              </h2>
              <p className="text-sm leading-relaxed text-[var(--cream)]/90 whitespace-pre-line">
                {listing.description}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span>House rules &amp; vibe:</span>
                <span className="text-[var(--cream)]">
                  {listing.foodRule === "veg_only"
                    ? "Vegetarian kitchen"
                    : "All food welcome"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--cream)] capitalize">
                  {listing.vibe} household
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--cream)]">
                  {listing.furnished ? "Furnished" : "Unfurnished"}
                </span>
              </div>
            </div>

            <div>
              <h2 className="font-serif-display text-2xl text-[var(--cream)]">
                Amenities
              </h2>
              <ul className="mt-3 space-y-2">
                {listing.amenities.map((am) => (
                  <li
                    key={am}
                    className="flex items-center gap-2 text-xs text-[var(--cream)]/90"
                  >
                    <Check className="h-3.5 w-3.5 text-[var(--gold)]" />
                    <span>{am}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* YOUR FUTURE HOUSEMATES */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[var(--gold-soft)]">
              THE HUMANS IN THE HOME
            </p>
            <h2 className="font-serif-display mt-1 text-3xl text-[var(--cream)]">
              Your future housemates
            </h2>
          </div>
        </div>

        {residents.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {residents.map(({ user: resUser, match }) => (
              <TiltCard
                key={resUser.id}
                onClick={() => router.push(`/people/${resUser.id}`)}
                className="p-6 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[#0A0A0B]"
                    style={{
                      background: `linear-gradient(135deg, hsl(${resUser.hue} 70% 62%), hsl(${
                        (resUser.hue + 40) % 360
                      } 70% 45%))`,
                    }}
                  >
                    {resUser.displayName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif-display truncate text-2xl text-[var(--cream)]">
                      {resUser.displayName}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {resUser.age} · {resUser.occupation}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--gold-soft)] inline-flex items-center gap-1">
                      <span>Open Match Reveal</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </p>
                  </div>
                </div>

                <FitBadge score={match.score} size={56} label={match.label} />
              </TiltCard>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <Users className="h-5 w-5 text-[var(--gold)]" />
              <span>
                This listing has no current residents. Click &ldquo;Move in&rdquo;
                above to pair it with your top 2 roommate matches!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
