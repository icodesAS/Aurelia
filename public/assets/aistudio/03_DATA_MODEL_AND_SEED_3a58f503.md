# 03 — Data Model, Firestore, Seed Data and Test Vectors

All people, places and numbers below are **fictional demo data**.

## 1. Types (`src/lib/types.ts`) — copy exactly

```ts
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
  persona?: { name: string; tagline: string }; // P1
  createdAt: number;           // Date.now()
}

export interface SeedUser {
  id: string;                  // "u1".."u10"
  displayName: string;
  age: number;
  occupation: string;
  city: string;
  bio: string;
  hue: number;                 // 0-360, used for avatar gradient
  answers: QuizAnswers;
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
  askingRent: number;          // INR/month the NEW tenant pays (per person for rooms, whole rent for entire_flat)
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
export interface ApiEnvelope<T> { ok: boolean; source: "gemini" | "fallback"; data: T }
```

## 2. Firestore collections
| Collection | Doc id | Contents | Written by |
|---|---|---|---|
| `users` | Firebase `uid` | `Profile` | The user, at end of onboarding |
| `listings` | auto id | `Listing` with `source: "user"` | The user, via Listing Writer "Publish" |
| `households` | auto id | `Household` | The user, via "Move in" |

Seed users and seed listings are **never** written to Firestore. The Explore page shows `[...seedListings, ...firestoreListings]`.

Real-time reads: use `onSnapshot` for `listings` (so a newly published listing appears instantly) and for the user's `households` doc.

Firestore does not accept `undefined` values. Before every write, strip undefined fields (e.g. `JSON.parse(JSON.stringify(obj))`).

## 3. Firestore security rules (paste in console → Firestore → Rules)
Hackathon-level rules. Good enough for a demo; mention "production rules would be stricter" if asked.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /listings/{id} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    match /households/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 4. Seed users (`src/lib/seed.ts` → `seedUsers: SeedUser[]`)
| id | Name | Age | Occupation | City | sleep | cleanliness | food | guests | noise | social | substances | hue | Bio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| u1 | Ananya Sharma | 21 | B.Tech student | Rajpura | early | spotless | veg | rarely | quiet | occasional | none | 35 | Early riser with colour-coded notes and a mean masala chai. |
| u2 | Rohan Mehta | 22 | MBA student | Rajpura | late | relaxed | nonveg | often | lively | family | occasional | 12 | Hosts game nights. Believes dishes can wait until morning. |
| u3 | Simran Kaur | 20 | B.Des student | Chandigarh | early | tidy | veg | sometimes | balanced | occasional | none | 330 | Sketchbook always open, soft lo-fi on low. |
| u4 | Kabir Malhotra | 23 | UX designer | Zirakpur | flexible | tidy | flexible | sometimes | balanced | occasional | occasional | 200 | Works from home on Tuesdays, cooks on Sundays. |
| u5 | Meera Iyer | 24 | Product intern | Rajpura | early | spotless | veg | rarely | quiet | space | none | 160 | Loves a silent evening and a very tidy kitchen. |
| u6 | Arjun Bedi | 22 | B.Tech student | Rajpura | late | relaxed | nonveg | often | lively | family | regular | 5 | Night owl, loud speaker, big heart. |
| u7 | Tanvi Gupta | 21 | B.Com student | Rajpura | flexible | tidy | flexible | sometimes | balanced | family | none | 280 | Plans the house group trips and the grocery list. |
| u8 | Harpreet Gill | 25 | Software engineer | Mohali | early | tidy | nonveg | rarely | quiet | occasional | occasional | 220 | Gym at 6 am, headphones on by 10 pm. |
| u9 | Dev Patel | 22 | M.Tech student | Rajpura | late | tidy | veg | sometimes | balanced | occasional | none | 100 | Codes late, cooks well, keeps the common room clean. |
| u10 | Ishita Verma | 23 | Content creator | Rajpura | flexible | relaxed | flexible | often | lively | family | occasional | 50 | Always filming something. Always has snacks. |

## 5. Seed listings (`seedListings: Listing[]`, all `source: "seed"`, `createdAt` any past timestamp)
| id | Title | City | Area | nearbyTags | roomType | bhk | furnished | askingRent | foodRule | vibe | suitableFor | residentIds | gradientSeed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| l1 | Sunlit Room in a Calm 2BHK | Rajpura | Near Chitkara University | chitkara university campus, market, bus stand | private_room | 2 | true | 7500 | veg_only | quiet | any | u5 | 1 |
| l2 | Quiet Study Nest | Rajpura | Near Chitkara University | chitkara university campus, market | private_room | 2 | true | 8500 | veg_only | quiet | any | u9 | 2 |
| l3 | Garden-Facing 2BHK (Whole Flat) | Rajpura | Near Chitkara University | chitkara university campus, park | entire_flat | 2 | false | 17500 | any | balanced | any | (none) | 3 |
| l4 | Corner Room in a Lively 3BHK | Rajpura | Near Chitkara University | chitkara university campus, market | private_room | 3 | true | 6500 | any | lively | any | u2, u6, u10 | 4 |
| l5 | Zirakpur Social Flat | Zirakpur | Highway Side | highway, mall, bus stand | private_room | 3 | true | 9000 | any | balanced | any | u4 | 5 |
| l6 | Professionals' 2BHK in Mohali | Mohali | Phase 7 | it park, market, hospital | private_room | 2 | true | 12000 | any | quiet | any | u8 | 6 |
| l7 | Women-Only Shared Room | Chandigarh | Sector 22 | market, bus stand, coaching centres | shared_room | 2 | true | 5500 | veg_only | balanced | women_only | u1, u3 | 7 |
| l8 | Calm 2BHK in Panchkula (Whole Flat) | Panchkula | Sector 20 | park, market | entire_flat | 2 | true | 21000 | any | quiet | any | (none) | 8 |
| l9 | Budget Shared Room Near Campus | Rajpura | Near Chitkara University | chitkara university campus, bus stand | shared_room | 2 | false | 3500 | any | balanced | men_only | (none) | 9 |
| l10 | Family-Style Veg Home | Rajpura | Near Chitkara University | chitkara university campus, park, market | private_room | 2 | true | 8000 | veg_only | balanced | any | u7 | 10 |

Fill the remaining fields yourself for each seed listing (not stored anywhere else):
- `ownerId`: first resident's id, or `"seed"` if none. `ownerName`: that person's name, or `"Aurelia Host"`.
- `tagline`: one short line. `description`: 2 sentences, warm, plain English, mention only facts in the table.
- `amenities`: 3–4 plain items such as "Wi-Fi", "Study desk", "Geyser", "Washing machine", "AC", "Balcony", "Parking".
- `tags`: 3–4 lowercase tags derived from the table (e.g. "quiet", "veg-only", "near campus", "study-friendly").

## 6. Test vectors (the AI builder must make these pass)

### 6.1 Compatibility (`match.ts`) — formula in doc 05
Test user **T**: `sleep: early, cleanliness: tidy, food: veg, guests: sometimes, noise: quiet, social: occasional, substances: none`

| T vs | Expected score | Label |
|---|---|---|
| u3 Simran | **93** | Rare match |
| u1 Ananya | **83** | Strong match |
| u8 Harpreet | **79** | Strong match |
| u5 Meera | **78** | Strong match |
| u2 Rohan | **32** | Risky |
| u6 Arjun | **26** | Risky |

### 6.2 Concierge (`search.ts`) — formula in doc 06
Filters: `{ bhk: 2, nearLandmark: "campus", maxRent: 18000, vibe: "quiet", foodRule: "veg_only" }` with user T.
Expected order: **l1 (Aurelia Fit 91)**, **l2 (90)**, **l10 (84)**, then **l9 (76)** and **l3 (76)** tied (tie-break = lower askingRent first, so l9 before l3), then **l7 (70)**, then l6 (67), l4 (49), l5 (48), l8 (29). The top 6 returned are l1, l2, l10, l9, l3, l7.
These numbers were verified with a script (all six compatibility scores, the ranking, and the rent split).
Rounded roommate scores used for the averages: T vs u5 = 78, T vs u9 = 75, T vs u7 = 77, T vs u8 = 79.

### 6.3 Rent split (`household.ts`) — formula in doc 08
Total rent 24000. Members: A 150 sqft + attached bath; B 120 sqft; C 100 sqft (no extras).
Expected shares: **A 10548, B 7337, C 6115** (sum 24000, largest-remainder rounding).

### 6.4 Settle up (`household.ts`)
Expense: ₹3000, paid by A, split equally between A, B, C.
Expected transfers: **B pays A ₹1000, C pays A ₹1000**.
