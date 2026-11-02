"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  Check,
  RefreshCw,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { seedListings } from "@/lib/seed";
import { publishUserListing, subscribeUserListings } from "@/lib/store";
import {
  Listing,
  RoomType,
  FoodRule,
  Noise,
  SuitableFor,
} from "@/lib/types";
import { ListingWriterOutput } from "@/lib/ai/fallbacks";
import { formatINR, median, round100 } from "@/lib/format";
import GradientCover from "@/components/ui/GradientCover";
import LoadingLine from "@/components/ui/LoadingLine";

const CITIES = ["Rajpura", "Zirakpur", "Mohali", "Chandigarh", "Panchkula"];

async function resizeImageFile(
  file: File,
  maxSide: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSide) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else if (height >= width && height > maxSide) {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ListRoomPage() {
  const router = useRouter();
  const { user, profile, signInGuest } = useAuth();
  const [userListings, setUserListings] = useState<Listing[]>([]);

  const [city, setCity] = useState("Rajpura");
  const [area, setArea] = useState("Near Chitkara University");
  const [roomType, setRoomType] = useState<RoomType>("private_room");
  const [bhk, setBhk] = useState(2);
  const [furnished, setFurnished] = useState(true);
  const [foodRule, setFoodRule] = useState<FoodRule>("veg_only");
  const [vibe, setVibe] = useState<Noise>("quiet");
  const [suitableFor, setSuitableFor] = useState<SuitableFor>("any");
  const [askingRentInput, setAskingRentInput] = useState<string>("");
  const [notes, setNotes] = useState(
    "Corner room with morning sunlight, 5 min walk to campus, study desk and fast Wi-Fi included."
  );

  const [aiBase64, setAiBase64] = useState<string | null>(null);
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<ListingWriterOutput | null>(null);
  const [source, setSource] = useState<"gemini" | "fallback">("fallback");

  // Editable generated fields
  const [editTitle, setEditTitle] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [selectedRent, setSelectedRent] = useState<number>(8000);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeUserListings((items) => setUserListings(items));
    return () => unsub();
  }, []);

  const benchmark = useMemo(() => {
    const all = [...userListings, ...seedListings];
    const matching = all
      .filter(
        (l) =>
          l.city.toLowerCase() === city.toLowerCase() && l.roomType === roomType
      )
      .map((l) => l.askingRent);
    return {
      median: median(matching),
      count: matching.length,
    };
  }, [userListings, city, roomType]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const aiUrl = await resizeImageFile(file, 1024, 0.8);
      const smallCover = await resizeImageFile(file, 640, 0.68);
      setAiBase64(aiUrl.replace(/^data:image\/jpeg;base64,/, ""));
      setCoverDataUrl(smallCover);
    } catch {
      // ignore invalid image
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setPublishedId(null);

    const parsedRent = askingRentInput
      ? parseInt(askingRentInput, 10)
      : null;

    try {
      const res = await fetch("/api/ai/listing-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          area,
          roomType,
          bhk,
          furnished,
          foodRule,
          vibe,
          suitableFor,
          askingRent: parsedRent,
          notes,
          benchmark,
          imageBase64: aiBase64,
          imageMime: "image/jpeg",
        }),
      });
      const json = await res.json();
      if (json?.data) {
        const out: ListingWriterOutput = json.data;
        setGenerated(out);
        setEditTitle(out.title);
        setEditTagline(out.tagline);
        setEditDesc(out.description);
        setSelectedRent(
          parsedRent && !Number.isNaN(parsedRent)
            ? parsedRent
            : out.suggestedRent.recommended
        );
        setSource(json.source === "gemini" ? "gemini" : "fallback");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    let activeUid = user?.uid || profile?.uid;
    if (!activeUid) {
      const guestProf = await signInGuest(true);
      activeUid = guestProf?.uid || "guest-demo-user";
    }

    const ownerName = profile?.displayName || "Aurelia Host";

    const created = await publishUserListing({
      ownerId: activeUid,
      ownerName,
      title: editTitle.trim() || generated?.title || "Sunlit Private Room",
      tagline: editTagline.trim() || generated?.tagline || "Calm shared home.",
      description: editDesc.trim() || generated?.description || notes,
      city,
      area,
      nearbyTags: [area.toLowerCase(), city.toLowerCase(), "campus"],
      roomType,
      bhk,
      furnished,
      askingRent: round100(selectedRent),
      foodRule,
      vibe,
      suitableFor,
      amenities: generated?.amenities?.length
        ? generated.amenities
        : furnished
        ? ["Furnished", "Wi-Fi", "Geyser"]
        : ["Geyser"],
      tags: generated?.tags?.length
        ? generated.tags
        : [vibe, city.toLowerCase()],
      residentIds: [],
      coverImage: coverDataUrl,
      gradientSeed: ((city.length + bhk) % 10) + 1,
      source: "user",
      createdAt: Date.now(),
    });

    setPublishedId(created.id);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold-soft)]">
          AI LISTING WRITER
        </p>
        <h1 className="font-serif-display mt-2 text-4xl md:text-5xl text-[var(--cream)]">
          Turn two rough lines into an honest, benchmarked listing.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Anyone on Aurelia can list a spare room. Gemini writes warm, factual
          copy from your notes and optional photo, while code anchors rent to
          local tricity medians.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-6 space-y-6 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          {/* City */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-2">City</label>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`rounded-[12px] border px-3.5 py-2 text-xs font-medium transition-colors ${
                    city === c
                      ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--cream)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Area & BHK */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="list-area"
                className="block text-xs text-[var(--muted)] mb-2"
              >
                Area / Landmark
              </label>
              <input
                id="list-area"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Flat Size (BHK)
              </label>
              <div className="flex items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setBhk((b) => Math.max(1, b - 1))}
                  className="px-2 text-sm text-[var(--muted)] hover:text-[var(--cream)]"
                >
                  −
                </button>
                <span className="font-mono text-sm text-[var(--cream)]">
                  {bhk} BHK
                </span>
                <button
                  type="button"
                  onClick={() => setBhk((b) => Math.min(5, b + 1))}
                  className="px-2 text-sm text-[var(--muted)] hover:text-[var(--cream)]"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Room Type & Furnished */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Room Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "private_room" as const, label: "Private" },
                  { id: "shared_room" as const, label: "Shared" },
                  { id: "entire_flat" as const, label: "Whole Flat" },
                ].map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setRoomType(rt.id)}
                    className={`rounded-[10px] border px-2.5 py-2 text-xs font-medium ${
                      roomType === rt.id
                        ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Furnishing &amp; Kitchen
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFurnished((f) => !f)}
                  className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-medium ${
                    furnished
                      ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {furnished ? "✓ Furnished" : "Unfurnished"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFoodRule((r) => (r === "veg_only" ? "any" : "veg_only"))
                  }
                  className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-medium ${
                    foodRule === "veg_only"
                      ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {foodRule === "veg_only" ? "Veg-Only" : "Any Food"}
                </button>
              </div>
            </div>
          </div>

          {/* Vibe & Suitable For */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Household Vibe
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["quiet", "balanced", "lively"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVibe(v)}
                    className={`rounded-[10px] border px-2.5 py-2 text-xs font-medium capitalize ${
                      vibe === v
                        ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Suitable For
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "any" as const, label: "Anyone" },
                  { id: "women_only" as const, label: "Women" },
                  { id: "men_only" as const, label: "Men" },
                ].map((sf) => (
                  <button
                    key={sf.id}
                    type="button"
                    onClick={() => setSuitableFor(sf.id)}
                    className={`rounded-[10px] border px-2.5 py-2 text-xs font-medium ${
                      suitableFor === sf.id
                        ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-soft)]"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="list-notes"
              className="block text-xs text-[var(--muted)] mb-2"
            >
              Describe the room in your own words
            </label>
            <textarea
              id="list-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Corner room, big window, 5 min walk to campus, wifi included..."
              className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 text-sm text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          {/* Optional Rent + Optional Photo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="list-rent"
                className="block text-xs text-[var(--muted)] mb-2"
              >
                Your asking rent (optional, ₹/mo)
              </label>
              <input
                id="list-rent"
                type="number"
                value={askingRentInput}
                onChange={(e) => setAskingRentInput(e.target.value)}
                placeholder={
                  benchmark.median
                    ? `Local median: ₹${benchmark.median}`
                    : "Leave blank for AI estimate"
                }
                className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-2">
                Room Photo (optional, resized in browser)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--gold)]/50 hover:text-[var(--cream)]">
                <Upload className="h-4 w-4 text-[var(--gold)]" />
                <span>{coverDataUrl ? "Photo attached ✓" : "Upload room photo"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[var(--gold)] px-6 py-4 text-sm font-medium text-[#0A0A0B] transition-all hover:bg-[var(--gold-soft)] disabled:opacity-60"
            style={{
              boxShadow: "0 0 32px rgba(201, 169, 110, 0.25)",
            }}
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {generating ? "Crafting your listing…" : "Generate Listing with AI"}
            </span>
          </button>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & GENERATED STUDIO */}
        <div className="lg:col-span-6">
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
            <GradientCover
              seed={((city.length + bhk) % 10) + 1}
              coverImage={coverDataUrl}
              alt={editTitle || "Room Preview"}
              className="h-52"
            />

            <div className="p-6 md:p-8">
              {generating ? (
                <div className="py-16">
                  <LoadingLine
                    messages={
                      coverDataUrl
                        ? [
                            "Reading your photo…",
                            "Finding the right words…",
                            "Pricing it fairly…",
                          ]
                        : ["Finding the right words…", "Pricing it fairly…"]
                    }
                  />
                </div>
              ) : generated ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                      GENERATED LISTING (EDITABLE INLINE)
                    </span>
                    <span className="text-[var(--gold)]">
                      {source === "gemini" ? "✦ Gemini 3.8 Flash" : "Smart Template"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      Headline Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="font-serif-display w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-2xl text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 text-xs leading-relaxed text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none"
                    />
                  </div>

                  {generated.photoInsights.length > 0 && (
                    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--gold-soft)]">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>What I noticed in your photo:</span>
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {generated.photoInsights.join(" · ")}
                      </p>
                    </div>
                  )}

                  {/* Rent Benchmark Card */}
                  <div className="rounded-[16px] border border-[var(--gold)]/35 bg-[var(--surface-2)] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">
                        Suggested Monthly Rent
                      </span>
                      <span className="font-serif-display tabular-nums text-3xl text-[var(--gold-soft)]">
                        {formatINR(selectedRent)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={generated.suggestedRent.low}
                      max={generated.suggestedRent.high}
                      step={100}
                      value={selectedRent}
                      onChange={(e) => setSelectedRent(Number(e.target.value))}
                      className="mt-4 w-full accent-[var(--gold)]"
                    />

                    <div className="mt-1 flex justify-between font-mono text-[11px] text-[var(--muted)]">
                      <span>Low: {formatINR(generated.suggestedRent.low)}</span>
                      <span>
                        Rec: {formatINR(generated.suggestedRent.recommended)}
                      </span>
                      <span>High: {formatINR(generated.suggestedRent.high)}</span>
                    </div>

                    <p className="mt-3 text-xs text-[var(--muted)]">
                      {generated.rentRationale}
                    </p>
                  </div>

                  {publishedId ? (
                    <div className="rounded-[16px] border border-[var(--good)]/50 bg-[var(--good)]/10 p-5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs text-[var(--good)]">
                        <Check className="h-4 w-4" />
                        <span>Listing published live to Explore!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/explore")}
                        className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--gold)] px-4 py-2 text-xs font-medium text-[#0A0A0B]"
                      >
                        <span>View in Explore</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5 text-xs font-medium text-[var(--cream)] hover:border-[var(--gold)]/50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePublish}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--gold)] px-6 py-3.5 text-xs font-medium text-[#0A0A0B] hover:bg-[var(--gold-soft)]"
                      >
                        <Check className="h-4 w-4" />
                        <span>Publish Listing to Explore</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs tracking-[0.18em] uppercase text-[var(--muted)]">
                    LIVE DRAFT PREVIEW
                  </p>
                  <h2 className="font-serif-display text-3xl text-[var(--cream)]">
                    {roomType === "private_room"
                      ? "Private room"
                      : roomType === "shared_room"
                      ? "Shared room"
                      : "Entire flat"}{" "}
                    in {area || city}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    {bhk}BHK · {furnished ? "Furnished" : "Unfurnished"} ·{" "}
                    {foodRule === "veg_only" ? "Veg-only" : "Any food"} ·{" "}
                    <span className="capitalize">{vibe} vibe</span>
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--cream)]/85">
                    {notes || "Your description will appear here."}
                  </p>
                  <div className="pt-4 border-t border-[var(--line)] text-xs text-[var(--gold-soft)]">
                    {benchmark.median
                      ? `Local benchmark for ${city}: ${formatINR(
                          benchmark.median
                        )}/month (${benchmark.count} similar homes)`
                      : "Click Generate Listing with AI to craft copy and price range."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
