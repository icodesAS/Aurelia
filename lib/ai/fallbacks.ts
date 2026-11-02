import { MatchResult } from "../match";
import { Filters } from "../search";
import { QuizAnswers, RoomType, FoodRule, Noise, SuitableFor } from "../types";
import { round100 } from "../format";

export interface MatchExplanation {
  headline: string;
  whyYouClick: string[];
  watchOuts: string[];
  conversationStarters: string[];
  houseRule: string;
  // Aliases matching prompt spec
  why_it_works: string[];
  watch_out: string;
}

export function matchExplainFallback(
  result: MatchResult,
  otherFirstName: string
): MatchExplanation {
  const headlineMap: Record<MatchResult["label"], string> = {
    "Rare match": "A natural rhythm and effortless fit",
    "Strong match": "Likely to get along with ease",
    Workable: "Works well with a few clear agreements",
    Risky: "Talk through daily routines before deciding",
  };

  const whyYouClick =
    result.aligned.length > 0
      ? result.aligned.slice(0, 3).map((d) => {
          if (d.aLabel === d.bLabel) {
            return `You are both ${d.aLabel.toLowerCase()} on ${d.label.toLowerCase()}.`;
          }
          return `${d.label}: you are ${d.aLabel.toLowerCase()}, ${otherFirstName} is ${d.bLabel.toLowerCase()}. Close enough to work smoothly.`;
        })
      : [
          "You share complementary daily habits that balance out a shared home.",
          `Both you and ${otherFirstName} appreciate clear expectations in shared spaces.`,
        ];

  while (whyYouClick.length < 2) {
    whyYouClick.push(
      `Your routine and ${otherFirstName}'s schedule leave comfortable breathing room at home.`
    );
  }

  const watchOuts =
    result.watch.length > 0
      ? result.watch.slice(0, 2).map((d) => {
          if (d.aLabel === d.bLabel) {
            return `Even though you match on ${d.label.toLowerCase()}, check in on exam or crunch weeks.`;
          }
          return `${d.label}: you are ${d.aLabel.toLowerCase()}, ${otherFirstName} is ${d.bLabel.toLowerCase()}. Agree on a simple boundary early.`;
        })
      : [
          `Clarify weekend guest and kitchen cleanup expectations with ${otherFirstName} in week one.`,
        ];

  const firstWatchKey = result.watch[0]?.key;
  const houseRuleMap: Record<keyof QuizAnswers, string> = {
    sleep: "Quiet hours after 11 pm on weeknights.",
    cleanliness: "A 10-minute shared reset of the kitchen and living room every Sunday.",
    food: "Separate cooking tools and dedicated shelves for veg and non-veg items.",
    guests: "Give the house a quick heads-up a day before overnight guests visit.",
    noise: "Headphones after 10 pm on weeknights.",
    social: "One shared house dinner a week; the rest is personal recharge time.",
    substances: "No smoking indoors; social drinks only if everyone is comfortable.",
  };

  const houseRule = firstWatchKey
    ? houseRuleMap[firstWatchKey]
    : "A short 10-minute house check-in over chai once a month.";

  return {
    headline: headlineMap[result.label],
    whyYouClick,
    watchOuts,
    conversationStarters: [
      "What does an ideal Sunday at home look like for you?",
      "How should we handle shared groceries, Wi-Fi, and electricity bills?",
    ],
    houseRule,
    why_it_works: whyYouClick,
    watch_out: watchOuts[0],
  };
}

export function parseQueryFallback(query: string): {
  assistantMessage: string;
  filters: Filters;
} {
  const q = query.toLowerCase();

  // maxRent
  let maxRent: number | null = null;
  const rentMatch = q.match(
    /(?:under|below|upto|up to|max|within|less than)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?/
  );
  if (rentMatch) {
    const val = parseFloat(rentMatch[1]);
    maxRent = Math.round(rentMatch[2] ? val * 1000 : val);
  } else {
    const standaloneK = q.match(/\b(\d+(?:\.\d+)?)\s*k\b/);
    if (standaloneK) {
      maxRent = Math.round(parseFloat(standaloneK[1]) * 1000);
    }
  }

  // bhk
  let bhk: number | null = null;
  const bhkMatch = q.match(/(\d)\s*-?\s*bhk/);
  if (bhkMatch) {
    bhk = parseInt(bhkMatch[1], 10);
  }

  // nearLandmark
  const nearLandmark = /\b(campus|college|university|chitkara)\b/.test(q)
    ? "campus"
    : null;

  // foodRule
  let foodRule: "veg_only" | "any" | "unspecified" = "unspecified";
  if (/\b(veg|vegetarian|pure veg)\b/.test(q) && !/non[- ]?veg/.test(q)) {
    foodRule = "veg_only";
  }

  // vibe
  let vibe: Noise | "unspecified" = "unspecified";
  if (/\b(quiet|peaceful|calm|study)\b/.test(q)) vibe = "quiet";
  else if (/\b(lively|social|party|fun)\b/.test(q)) vibe = "lively";
  else if (/\b(balanced|relaxed)\b/.test(q)) vibe = "balanced";

  // suitableFor
  let suitableFor: SuitableFor | "unspecified" = "unspecified";
  if (/\b(girls?|women|ladies|female)\b/.test(q)) suitableFor = "women_only";
  else if (/\b(boys?|men|gents|male)\b/.test(q)) suitableFor = "men_only";

  // roomType
  let roomType: RoomType | "unspecified" = "unspecified";
  if (/whole flat|entire flat|full flat/.test(q)) roomType = "entire_flat";
  else if (/private room|own room|single room/.test(q)) roomType = "private_room";
  else if (/shared|sharing/.test(q)) roomType = "shared_room";

  // furnished
  let furnished: boolean | null = null;
  if (/\bfurnished\b/.test(q) && !/\bunfurnished\b/.test(q)) furnished = true;
  else if (/\bunfurnished\b/.test(q)) furnished = false;

  // areaKeywords
  const knownCities = ["rajpura", "zirakpur", "mohali", "chandigarh", "panchkula"];
  const areaKeywords = knownCities.filter((c) => q.includes(c));

  return {
    assistantMessage: "Here is what I found for your search preferences.",
    filters: {
      areaKeywords,
      nearLandmark,
      maxRent,
      bhk,
      roomType,
      furnished,
      foodRule,
      vibe,
      suitableFor,
    },
  };
}

export interface ListingWriterInput {
  city: string;
  area: string;
  roomType: RoomType;
  bhk: number;
  furnished: boolean;
  foodRule: FoodRule;
  vibe: Noise;
  suitableFor: SuitableFor;
  askingRent: number | null;
  notes: string;
}

export interface ListingWriterOutput {
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  amenities: string[];
  idealRoommate: string;
  photoInsights: string[];
  suggestedRent: {
    low: number;
    recommended: number;
    high: number;
  };
  rentRationale: string;
}

export function listingWriterFallback(
  input: ListingWriterInput,
  benchmark: { median: number | null; count: number }
): ListingWriterOutput {
  const roomTypeLabel =
    input.roomType === "private_room"
      ? "Private room"
      : input.roomType === "shared_room"
      ? "Shared room"
      : "Entire flat";

  const cleanArea = input.area.trim() || input.city;
  const titleArea = /^near\b/i.test(cleanArea)
    ? cleanArea.replace(/^near/i, "near")
    : `in ${cleanArea}`;

  const title = `${roomTypeLabel} ${titleArea}`.slice(0, 70);
  const foodPhrase = input.foodRule === "veg_only" ? "veg-only" : "easy-going";
  const tagline = `A ${input.vibe} ${foodPhrase} home you can settle into.`;

  const furnishedWord = input.furnished ? "furnished" : "unfurnished";
  const foodSentence =
    input.foodRule === "veg_only"
      ? "The kitchen follows a strict vegetarian routine."
      : "All food habits are welcome in the kitchen.";
  const notesSentence = input.notes.trim()
    ? `${input.notes.trim().replace(/\.$/, "")}.`
    : "Thoughtfully maintained shared spaces with reliable daily utilities.";

  const description = `${roomTypeLabel} in a ${input.bhk}BHK ${furnishedWord} home in ${cleanArea}, ${input.city}. ${notesSentence} ${foodSentence} The household vibe is ${input.vibe}, making it comfortable for day-to-day living.`;

  const rawTags = [
    input.vibe,
    input.foodRule === "veg_only" ? "veg-only" : "flexible-kitchen",
    roomTypeLabel.toLowerCase(),
    input.furnished ? "furnished" : "unfurnished",
    input.city.toLowerCase(),
    `${input.bhk}bhk`,
  ];
  const tags = Array.from(new Set(rawTags)).slice(0, 6);

  const amenities: string[] = input.furnished ? ["Furnished", "Wi-Fi", "Geyser"] : ["Geyser"];
  const idealRoommate = `Someone who appreciates a ${input.vibe} home and respects shared spaces.`;

  const rec = benchmark.median ?? input.askingRent ?? 8000;
  const low = round100(rec * 0.9);
  const high = round100(rec * 1.1);

  return {
    title,
    tagline,
    description,
    tags,
    amenities,
    idealRoommate,
    photoInsights: [],
    suggestedRent: {
      low,
      recommended: round100(rec),
      high,
    },
    rentRationale: "Estimated from similar shared homes in the neighbourhood.",
  };
}

export function personaFallback(answers: QuizAnswers): {
  name: string;
  tagline: string;
} {
  const sleepMap: Record<QuizAnswers["sleep"], string> = {
    early: "Early",
    flexible: "Easygoing",
    late: "Midnight",
  };
  const cleanMap: Record<QuizAnswers["cleanliness"], string> = {
    relaxed: "Free Spirit",
    tidy: "Planner",
    spotless: "Curator",
  };

  return {
    name: `The ${sleepMap[answers.sleep]} ${cleanMap[answers.cleanliness]}`,
    tagline: "You like a home that matches your natural daily rhythm.",
  };
}

export function splitExplainFallback(mode: "fair" | "equal"): {
  explanation: string;
} {
  if (mode === "equal") {
    return {
      explanation:
        "Everyone pays an identical share of the monthly rent for simplicity.",
    };
  }
  return {
    explanation:
      "Each housemate pays in proportion to their bedroom floor area, with a fair adjustment for an attached bathroom, balcony, or AC.",
  };
}
