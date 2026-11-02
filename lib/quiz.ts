import { QuizAnswers, NumericTraits } from "./types";

export interface QuizOption<V extends string = string> {
  value: V;
  label: string;
  displayLabel: string;
  helper: string;
  numericValue?: number;
}

export interface QuizQuestion<K extends keyof QuizAnswers = keyof QuizAnswers> {
  key: K;
  dimensionLabel: string;
  question: string;
  subtitle: string;
  options: QuizOption<QuizAnswers[K]>[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "sleep",
    dimensionLabel: "Sleep rhythm",
    question: "When does your day usually start and end?",
    subtitle: "Circadian harmony is the foundation of a peaceful shared home.",
    options: [
      {
        value: "early",
        label: "Early bird",
        displayLabel: "Early bird",
        helper: "Up by 7 am, asleep by 11 pm",
        numericValue: 1,
      },
      {
        value: "flexible",
        label: "Flexible",
        displayLabel: "Flexible",
        helper: "It depends on the day and schedule",
        numericValue: 3,
      },
      {
        value: "late",
        label: "Night owl",
        displayLabel: "Night owl",
        helper: "Up late, asleep after 1 am",
        numericValue: 5,
      },
    ],
  },
  {
    key: "cleanliness",
    dimensionLabel: "Cleanliness",
    question: "How do you feel about a clean home?",
    subtitle: "Shared kitchens and living rooms work best when standards align.",
    options: [
      {
        value: "relaxed",
        label: "Relaxed",
        displayLabel: "Relaxed",
        helper: "Tidy up when it gets messy",
        numericValue: 1,
      },
      {
        value: "tidy",
        label: "Tidy",
        displayLabel: "Tidy",
        helper: "A little bit of upkeep every day",
        numericValue: 3,
      },
      {
        value: "spotless",
        label: "Spotless",
        displayLabel: "Spotless",
        helper: "Hotel spotless — everything in its place",
        numericValue: 5,
      },
    ],
  },
  {
    key: "food",
    dimensionLabel: "Food habits",
    question: "What do you eat at home?",
    subtitle: "Kitchen routines and cookware preferences matter in daily living.",
    options: [
      {
        value: "veg",
        label: "Vegetarian",
        displayLabel: "Vegetarian",
        helper: "Pure vegetarian kitchen preference",
      },
      {
        value: "nonveg",
        label: "Non-vegetarian",
        displayLabel: "Non-vegetarian",
        helper: "Cooks or orders meat, fish, and eggs at home",
      },
      {
        value: "flexible",
        label: "Flexible",
        displayLabel: "Flexible",
        helper: "Comfortable with any kitchen setup",
      },
    ],
  },
  {
    key: "guests",
    dimensionLabel: "Guests",
    question: "How often do you have friends over?",
    subtitle: "Balancing personal sanctuary with social energy.",
    options: [
      {
        value: "rarely",
        label: "Rarely",
        displayLabel: "Rarely",
        helper: "Home is a private sanctuary",
        numericValue: 1,
      },
      {
        value: "sometimes",
        label: "Sometimes",
        displayLabel: "Sometimes",
        helper: "A few times a month on weekends",
        numericValue: 3,
      },
      {
        value: "often",
        label: "Often",
        displayLabel: "Often",
        helper: "Open house — friends drop by most weeks",
        numericValue: 5,
      },
    ],
  },
  {
    key: "noise",
    dimensionLabel: "Noise level",
    question: "What should home sound like?",
    subtitle: "Acoustics shape focus, rest, and evening downtime.",
    options: [
      {
        value: "quiet",
        label: "Quiet",
        displayLabel: "Quiet home",
        helper: "Library quiet — good for deep study and sleep",
        numericValue: 1,
      },
      {
        value: "balanced",
        label: "Balanced",
        displayLabel: "Balanced",
        helper: "Calm on weekdays, relaxed on weekends",
        numericValue: 3,
      },
      {
        value: "lively",
        label: "Lively",
        displayLabel: "Lively",
        helper: "Music, conversation, and active energy",
        numericValue: 5,
      },
    ],
  },
  {
    key: "social",
    dimensionLabel: "Togetherness",
    question: "How much do you want to hang out with roommates?",
    subtitle: "Whether you want independent routines or shared dinners.",
    options: [
      {
        value: "space",
        label: "My own space",
        displayLabel: "Own space",
        helper: "Friendly hello, mostly independent lives",
        numericValue: 1,
      },
      {
        value: "occasional",
        label: "Occasional hangouts",
        displayLabel: "Occasional hangouts",
        helper: "Chai or dinner together once in a while",
        numericValue: 3,
      },
      {
        value: "family",
        label: "Like a family",
        displayLabel: "Like a family",
        helper: "Cook together, weekend plans, close bond",
        numericValue: 5,
      },
    ],
  },
  {
    key: "substances",
    dimensionLabel: "Smoking and drinking",
    question: "Smoking or drinking at home?",
    subtitle: "Clear house boundaries avoid awkward conversations later.",
    options: [
      {
        value: "none",
        label: "Neither, please",
        displayLabel: "Neither",
        helper: "Smoke-free and alcohol-free home",
        numericValue: 1,
      },
      {
        value: "occasional",
        label: "Okay occasionally",
        displayLabel: "Okay occasionally",
        helper: "Social drinks on weekends or balcony only",
        numericValue: 3,
      },
      {
        value: "regular",
        label: "Fine regularly",
        displayLabel: "Fine regularly",
        helper: "Relaxed rules as long as spaces stay clean",
        numericValue: 5,
      },
    ],
  },
];

export const DIMENSION_LABELS: Record<keyof QuizAnswers, string> = {
  sleep: "Sleep rhythm",
  cleanliness: "Cleanliness",
  food: "Food habits",
  guests: "Guests",
  noise: "Noise level",
  social: "Togetherness",
  substances: "Smoking and drinking",
};

export function getOptionDisplayLabel<K extends keyof QuizAnswers>(
  key: K,
  value: QuizAnswers[K]
): string {
  const q = QUIZ_QUESTIONS.find((item) => item.key === key);
  const opt = q?.options.find((o) => o.value === value);
  return opt ? opt.displayLabel : String(value);
}

export function answersToNumericTraits(
  answers: QuizAnswers,
  budgetMax = 15000,
  work: "wfh" | "office" | "hybrid" = "hybrid"
): NumericTraits {
  const map3 = <T extends string>(val: T, order: [T, T, T]): number => {
    const idx = order.indexOf(val);
    return idx === 0 ? 1 : idx === 1 ? 3 : 5;
  };
  return {
    sleep: map3(answers.sleep, ["early", "flexible", "late"]),
    cleanliness: map3(answers.cleanliness, ["relaxed", "tidy", "spotless"]),
    guests: map3(answers.guests, ["rarely", "sometimes", "often"]),
    noise: map3(answers.noise, ["quiet", "balanced", "lively"]),
    budget: budgetMax,
    food: answers.food === "veg" ? "veg" : answers.food === "nonveg" ? "non-veg" : "any",
    work,
  };
}

export const DEFAULT_QUIZ_ANSWERS: QuizAnswers = {
  sleep: "early",
  cleanliness: "tidy",
  food: "veg",
  guests: "sometimes",
  noise: "quiet",
  social: "occasional",
  substances: "none",
};
