import { QuizAnswers, NumericTraits } from "./types";
import { DIMENSION_LABELS, getOptionDisplayLabel } from "./quiz";

export interface DimensionResult {
  key: keyof QuizAnswers;
  label: string;        // "Sleep rhythm"
  aLabel: string;       // option label for person A, e.g. "Early bird"
  bLabel: string;
  aIndex: number;       // 0, 1, or 2
  bIndex: number;       // 0, 1, or 2
  similarity: number;   // 0..1
  weight: number;
}

export type MatchLabel = "Rare match" | "Strong match" | "Workable" | "Risky";

export interface MatchResult {
  score: number;
  label: MatchLabel;
  dimensions: DimensionResult[];      // all 7, in quiz order
  aligned: DimensionResult[];         // similarity >= 0.85, sorted by weight desc, max 3
  watch: DimensionResult[];           // similarity <= 0.5, sorted by weight*(1-similarity) desc, max 2;
                                      // if none qualify, the single lowest-similarity dimension
}

const QUIZ_ORDER: (keyof QuizAnswers)[] = [
  "sleep",
  "cleanliness",
  "food",
  "guests",
  "noise",
  "social",
  "substances",
];

const WEIGHTS: Record<keyof QuizAnswers, number> = {
  sleep: 0.18,
  cleanliness: 0.20,
  food: 0.12,
  guests: 0.14,
  noise: 0.14,
  social: 0.10,
  substances: 0.12,
};

const ORDINAL_MAPS: Record<Exclude<keyof QuizAnswers, "food">, string[]> = {
  sleep: ["early", "flexible", "late"],
  cleanliness: ["relaxed", "tidy", "spotless"],
  guests: ["rarely", "sometimes", "often"],
  noise: ["quiet", "balanced", "lively"],
  social: ["space", "occasional", "family"],
  substances: ["none", "occasional", "regular"],
};

const FOOD_INDEX: Record<QuizAnswers["food"], number> = {
  veg: 0,
  flexible: 1,
  nonveg: 2,
};

const FOOD_MATRIX: Record<QuizAnswers["food"], Record<QuizAnswers["food"], number>> = {
  veg: { veg: 1.0, nonveg: 0.3, flexible: 0.85 },
  nonveg: { veg: 0.3, nonveg: 1.0, flexible: 0.9 },
  flexible: { veg: 0.85, nonveg: 0.9, flexible: 1.0 },
};

export function getMatchLabel(score: number): MatchLabel {
  if (score >= 85) return "Rare match";
  if (score >= 70) return "Strong match";
  if (score >= 55) return "Workable";
  return "Risky";
}

export function scoreMatch(a: QuizAnswers, b: QuizAnswers): MatchResult {
  let weightedSum = 0;

  const dimensions: DimensionResult[] = QUIZ_ORDER.map((key) => {
    const weight = WEIGHTS[key];
    let similarity = 1;
    let aIndex = 0;
    let bIndex = 0;

    if (key === "food") {
      const fa = a.food;
      const fb = b.food;
      similarity = FOOD_MATRIX[fa]?.[fb] ?? 0.85;
      aIndex = FOOD_INDEX[fa] ?? 1;
      bIndex = FOOD_INDEX[fb] ?? 1;
    } else {
      const order = ORDINAL_MAPS[key];
      const ia = Math.max(0, order.indexOf(a[key]));
      const ib = Math.max(0, order.indexOf(b[key]));
      aIndex = ia;
      bIndex = ib;
      similarity = 1 - Math.abs(ia - ib) / 2;
    }

    weightedSum += weight * similarity;

    return {
      key,
      label: DIMENSION_LABELS[key],
      aLabel: getOptionDisplayLabel(key, a[key]),
      bLabel: getOptionDisplayLabel(key, b[key]),
      aIndex,
      bIndex,
      similarity,
      weight,
    };
  });

  const score = Math.round(100 * weightedSum);
  const label = getMatchLabel(score);

  const aligned = [...dimensions]
    .filter((d) => d.similarity >= 0.85)
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 3);

  let watch = [...dimensions]
    .filter((d) => d.similarity <= 0.5)
    .sort((x, y) => y.weight * (1 - y.similarity) - x.weight * (1 - x.similarity))
    .slice(0, 2);

  if (watch.length === 0) {
    const lowest = [...dimensions].sort(
      (x, y) => x.similarity - y.similarity || y.weight - x.weight
    )[0];
    if (lowest) watch = [lowest];
  }

  return {
    score,
    label,
    dimensions,
    aligned,
    watch,
  };
}

export function averageCompat(you: QuizAnswers, others: QuizAnswers[]): number | null {
  if (!others.length) return null;
  const total = others.reduce((acc, other) => acc + scoreMatch(you, other).score, 0);
  return Math.round(total / others.length);
}

/**
 * Deterministic 1-5 numerical trait compatibility formula:
 * Score = 100 - sum(|user[dim] - other[dim]| * weight)
 * Weights: cleanliness (6), sleep (5), noise (5), guests (4).
 * If food conflict, -10 penalty. Clamped between 35 and 99.
 */
export function scoreNumericMatch(user: NumericTraits, other: NumericTraits): number {
  const diffClean = Math.abs(user.cleanliness - other.cleanliness) * 6;
  const diffSleep = Math.abs(user.sleep - other.sleep) * 5;
  const diffNoise = Math.abs(user.noise - other.noise) * 5;
  const diffGuests = Math.abs(user.guests - other.guests) * 4;

  let penalty = diffClean + diffSleep + diffNoise + diffGuests;

  const isFoodConflict =
    (user.food === "veg" && other.food === "non-veg") ||
    (user.food === "non-veg" && other.food === "veg") ||
    (user.food === "vegan" && other.food === "non-veg") ||
    (user.food === "non-veg" && other.food === "vegan");

  if (isFoodConflict) {
    penalty += 10;
  }

  const raw = 100 - penalty;
  return Math.max(35, Math.min(99, Math.round(raw)));
}
