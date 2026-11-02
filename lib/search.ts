import {
  Listing,
  QuizAnswers,
  RoomType,
  Noise,
  SuitableFor,
  SeedUser,
} from "./types";
import { averageCompat } from "./match";
import { formatINR } from "./format";

export interface Filters {
  areaKeywords: string[];
  nearLandmark: string | null;
  maxRent: number | null;
  bhk: number | null;
  roomType: RoomType | "unspecified";
  furnished: boolean | null;
  foodRule: "veg_only" | "any" | "unspecified";
  vibe: Noise | "unspecified";
  suitableFor: SuitableFor | "unspecified";
}

export const EMPTY_FILTERS: Filters = {
  areaKeywords: [],
  nearLandmark: null,
  maxRent: null,
  bhk: null,
  roomType: "unspecified",
  furnished: null,
  foodRule: "unspecified",
  vibe: "unspecified",
  suitableFor: "unspecified",
};

export interface RankedListing {
  listing: Listing;
  constraintScore: number;       // 0..1
  residentCompat: number | null; // rounded mean compat with residents, or null
  fit: number;                   // 0..100 "Aurelia Fit"
  reasons: string[];             // what matched (max 3 shown)
  misses: string[];              // what did not (max 2 shown)
}

export function rankListings(
  listings: Listing[],
  f: Filters,
  you: QuizAnswers | null,
  seedUsers: SeedUser[]
): RankedListing[] {
  // 2.1 Hard exclusion
  const eligible = listings.filter((listing) => {
    if (f.suitableFor === "women_only" || f.suitableFor === "men_only") {
      return listing.suitableFor === f.suitableFor || listing.suitableFor === "any";
    }
    return true;
  });

  const userMap = new Map<string, SeedUser>(seedUsers.map((u) => [u.id, u]));

  const ranked = eligible.map((listing): RankedListing => {
    let activeWeightSum = 0;
    let earnedWeightSum = 0;
    const reasons: string[] = [];
    const misses: string[] = [];

    const residents = listing.residentIds
      .map((id) => userMap.get(id))
      .filter((u): u is SeedUser => Boolean(u));

    // 1. Location (0.25)
    const hasLandmark = Boolean(f.nearLandmark && f.nearLandmark.trim().length > 0);
    const hasAreas = f.areaKeywords && f.areaKeywords.length > 0;
    if (hasLandmark || hasAreas) {
      const weight = 0.25;
      activeWeightSum += weight;
      let totalChecks = 0;
      let passedChecks = 0;

      const nearbyText = `${listing.nearbyTags.join(" ")} ${listing.area} ${listing.title}`.toLowerCase();
      const fullLocText = `${listing.city} ${listing.area} ${listing.title} ${listing.nearbyTags.join(" ")}`.toLowerCase();

      if (hasLandmark && f.nearLandmark) {
        totalChecks += 1;
        const words = f.nearLandmark
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 4);
        const searchWords = words.length > 0 ? words : [f.nearLandmark.toLowerCase().trim()];
        if (searchWords.some((w) => nearbyText.includes(w))) {
          passedChecks += 1;
          reasons.push(`Near ${f.nearLandmark}`);
        } else {
          misses.push(`Not near ${f.nearLandmark}`);
        }
      }

      if (hasAreas) {
        for (const kw of f.areaKeywords) {
          totalChecks += 1;
          if (fullLocText.includes(kw.toLowerCase())) {
            passedChecks += 1;
            reasons.push(`In ${listing.city}`);
          } else {
            misses.push(`Outside ${kw}`);
          }
        }
      }

      const credit = totalChecks > 0 ? passedChecks / totalChecks : 1;
      earnedWeightSum += weight * credit;
    }

    // 2. Rent (0.25)
    if (f.maxRent != null) {
      const weight = 0.25;
      activeWeightSum += weight;
      let credit = 0;
      if (listing.askingRent <= f.maxRent) {
        credit = 1;
        reasons.push(`${formatINR(listing.askingRent)}/mo, within budget`);
      } else if (listing.askingRent <= f.maxRent * 1.1) {
        credit = 0.5;
        reasons.push(`Slightly above budget (${formatINR(listing.askingRent)})`);
      } else {
        credit = 0;
        misses.push(`Above your budget (${formatINR(listing.askingRent)})`);
      }
      earnedWeightSum += weight * credit;
    }

    // 3. BHK (0.15)
    if (f.bhk != null) {
      const weight = 0.15;
      activeWeightSum += weight;
      if (listing.bhk === f.bhk) {
        earnedWeightSum += weight;
        reasons.push(`${listing.bhk}BHK home`);
      } else {
        misses.push(`${listing.bhk}BHK (asked for ${f.bhk}BHK)`);
      }
    }

    // 4. Room type (0.10)
    if (f.roomType !== "unspecified") {
      const weight = 0.10;
      activeWeightSum += weight;
      const roomLabel =
        listing.roomType === "private_room"
          ? "Private room"
          : listing.roomType === "shared_room"
          ? "Shared room"
          : "Entire flat";
      if (listing.roomType === f.roomType) {
        earnedWeightSum += weight;
        reasons.push(roomLabel);
      } else {
        misses.push(roomLabel);
      }
    }

    // 5. Food (0.10)
    if (f.foodRule === "veg_only") {
      const weight = 0.10;
      activeWeightSum += weight;
      if (listing.foodRule === "veg_only") {
        earnedWeightSum += weight * 1;
        reasons.push("Veg-only home");
      } else if (residents.length >= 1 && residents.every((r) => r.answers.food === "veg")) {
        earnedWeightSum += weight * 0.7;
        reasons.push("Housemates all eat vegetarian");
      } else {
        misses.push("Not a veg-only home");
      }
    }

    // 6. Vibe (0.10)
    if (f.vibe !== "unspecified") {
      const weight = 0.10;
      activeWeightSum += weight;
      const vibeLabel =
        listing.vibe === "quiet"
          ? "Quiet household"
          : listing.vibe === "balanced"
          ? "Balanced household"
          : "Lively household";
      if (listing.vibe === f.vibe) {
        earnedWeightSum += weight;
        reasons.push(vibeLabel);
      } else {
        misses.push(`${vibeLabel} (you asked for ${f.vibe})`);
      }
    }

    // 7. Furnished (0.05)
    if (f.furnished != null) {
      const weight = 0.05;
      activeWeightSum += weight;
      if (listing.furnished === f.furnished) {
        earnedWeightSum += weight;
        reasons.push(listing.furnished ? "Furnished" : "Unfurnished");
      } else {
        misses.push(listing.furnished ? "Furnished" : "Unfurnished");
      }
    }

    const constraintScore = activeWeightSum > 0 ? earnedWeightSum / activeWeightSum : 1;

    const residentCompat =
      you && residents.length > 0
        ? averageCompat(
            you,
            residents.map((r) => r.answers)
          )
        : null;

    if (residentCompat != null && residentCompat >= 70) {
      reasons.push("Lives with people you'd likely click with");
    }

    if (reasons.length === 0) {
      reasons.push(`${listing.bhk}BHK in ${listing.city}`);
      if (listing.furnished) reasons.push("Furnished");
    }

    const fit =
      residentCompat != null
        ? Math.round(0.6 * constraintScore * 100 + 0.4 * residentCompat)
        : Math.round(constraintScore * 100);

    return {
      listing,
      constraintScore,
      residentCompat,
      fit,
      reasons: reasons.slice(0, 3),
      misses: misses.slice(0, 2),
    };
  });

  ranked.sort((a, b) => {
    if (b.fit !== a.fit) return b.fit - a.fit;
    return a.listing.askingRent - b.listing.askingRent;
  });

  return ranked.slice(0, 6);
}
