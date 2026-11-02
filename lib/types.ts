// ---------- Quiz ----------
export type Sleep = "early" | "flexible" | "late";
export type Cleanliness = "relaxed" | "tidy" | "spotless";
export type Food = "veg" | "nonveg" | "flexible";
export type Guests = "rarely" | "sometimes" | "often";
export type Noise = "quiet" | "balanced" | "lively";
export type Social = "space" | "occasional" | "family";
export type Substances = "none" | "occasional" | "regular";

export interface QuizAnswers {
  sleep: Sleep;
  cleanliness: Cleanliness;
  food: Food;
  guests: Guests;
  noise: Noise;
  social: Social;
  substances: Substances;
}

export interface NumericTraits {
  sleep: number;       // 1 (early bird 10pm) to 5 (night owl 3am)
  cleanliness: number; // 1 (relaxed) to 5 (hotel spotless)
  guests: number;      // 1 (sanctuary/rarely) to 5 (open house/daily)
  noise: number;       // 1 (library quiet) to 5 (music & lively)
  budget: number;      // numerical rent budget in ₹ (e.g. 15000)
  food: "veg" | "non-veg" | "vegan" | "any";
  work: "wfh" | "office" | "hybrid";
}

// ---------- People ----------
export interface Profile {
  uid: string;
  displayName: string;
  occupation: string;          // e.g. "B.Tech student"
  city: string;                // e.g. "Rajpura"
  budgetMin: number;           // INR per month
  budgetMax: number;
  intent: "find" | "host" | "both";
  answers: QuizAnswers;
  numericTraits?: NumericTraits;
  persona?: { name: string; tagline: string };
  createdAt: number;           // Date.now()
}

export interface SeedUser {
  id: string;                  // "u1".."u12"
  displayName: string;
  age: number;
  occupation: string;
  city: string;
  bio: string;
  hue: number;                 // 0-360, used for avatar gradient
  answers: QuizAnswers;
  numericTraits: NumericTraits;
}

// ---------- Places ----------
export type RoomType = "private_room" | "shared_room" | "entire_flat";
export type FoodRule = "veg_only" | "any";
export type SuitableFor = "any" | "women_only" | "men_only";

export interface Listing {
  id: string;
  ownerId: string;             // Firebase uid, or a seed user id, or "seed"
  ownerName: string;
  title: string;
  tagline: string;
  description: string;
  city: string;
  area: string;
  nearbyTags: string[];        // lowercase, e.g. "chitkara university campus"
  roomType: RoomType;
  bhk: number;                 // bedrooms in the whole property
  furnished: boolean;
  askingRent: number;          // INR/month the NEW tenant pays
  foodRule: FoodRule;
  vibe: Noise;                 // reuse quiet | balanced | lively
  suitableFor: SuitableFor;
  amenities: string[];
  tags: string[];
  residentIds: string[];       // seed user ids of current residents (may be empty)
  coverImage?: string;         // small JPEG data URL (<= ~150 KB) for user-created listings only
  gradientSeed: number;        // 1..10, picks the generated cover gradient when no image
  source: "seed" | "user";
  createdAt: number;
}

// ---------- Household ----------
export interface HouseholdMember {
  id: string;                  // uid, seed user id, or generated id
  name: string;
  hue: number;
  areaSqft: number;
  attachedBath: boolean;
  balcony: boolean;
  ac: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;              // INR
  paidBy: string;              // member id
  splitBetween: string[];      // member ids (equal split among these)
  createdAt: number;
}

export interface Chore {
  id: string;
  title: string;
  assignedTo: string;          // member id
  frequency: "daily" | "weekly";
  done: boolean;
}

export interface Household {
  id: string;
  ownerUid: string;
  listingId?: string;
  name: string;
  totalRent: number;
  members: HouseholdMember[];
  expenses: Expense[];
  chores: Chore[];
  createdAt: number;
}

// ---------- API envelope ----------
export interface ApiEnvelope<T> {
  ok: boolean;
  source: "gemini" | "fallback";
  data: T;
}
