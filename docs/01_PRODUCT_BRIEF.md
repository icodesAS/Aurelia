# 01 — Product Brief

## 1. One-line pitch
Aurelia is an AI platform for rental and shared living that matches **people**, not just properties.

## 2. The problem (Rental and Shared Living)
- Finding a room is easy. Finding people you can live with is hard.
- Most listing sites show price and photos only. They say nothing about the humans in the home.
- After moving in, shared homes struggle with rent splits, bills and chores.

## 3. Our answer
Four stages in one story: **Find → Match → Move in → Live together.**

## 4. One account type (important design decision)
There is **no role-based auth**. Every user has one profile and can both **find a room** and **list a room**.
Reason: in shared living the same person is a seeker today and a host tomorrow.
Say this on a slide: *"In shared living, everyone is both a seeker and a host. Aurelia uses one profile for everyone."*

## 5. Features

### P0 — must work live (build in this order)
| # | Feature | One-line behaviour | Spec file |
|---|---|---|---|
| 1 | Quiz-as-onboarding + Roommate Match | 7-question lifestyle quiz at sign-up, then compatibility % against other people | 04, 05 |
| 2 | Match Explainer | Gemini explains the score: why you click, what may clash, conversation starters, one house rule | 05 |
| 3 | AI Concierge Search | Type a sentence, get ranked rooms with "Aurelia Fit %" | 06 |
| 4 | AI Listing Writer | Describe a room (and optionally add a photo), get title, description, tags, rent range; publish instantly | 07 |
| 5 | Household Dashboard | Fair rent split, shared bills, "who owes whom", chore rota | 08 |

### P1 — only if P0 is finished and deployed
- "Living Persona" card after onboarding (Gemini names your living style, e.g. "The Quiet Architect"). Spec in `04`.
- Rent-split AI explanation (one paragraph). Spec in `08`.

### P2 — do not build
Payments, chat, maps, push notifications, real photo upload to cloud storage, admin panel, verification/KYC, role-based auth.

## 6. Users (for slides)
- **Priya, 1st-year student** — new to the city, wants a safe, veg-friendly flat near campus.
- **Rahul, working professional** — has a spare room, wants a roommate who respects quiet hours.
- **A 3-person flat** — tired of arguing about rent and who paid for Wi-Fi.

## 7. Demo story (3 minutes, exact order)
1. **Landing (15 s):** Cinematic hero, say the tagline. Click "Begin".
2. **Sign in as Guest + quiz (40 s):** Answer the 7 questions quickly. Persona/summary appears.
3. **Concierge (30 s):** Type: `Quiet 2BHK near campus under 18k with vegetarian roommates`. Results animate in with Aurelia Fit %.
4. **Match reveal (45 s):** Open a roommate. Two orbs merge, % counts up. Read one "why you click" and one "watch out".
5. **Listing Writer (30 s):** Type 2 lines about a room, click Generate, click Publish, show it appear in Explore.
6. **Household (20 s):** "Move in" → ring chart of rent split, add a bill, show "who owes whom".

## 8. What judges will remember
- It feels like a real product, not a student site (design).
- Match score is **explainable and honest** (shows a clash, not just a number).
- Every AI feature is live and visible.
- One consistent story from search to living together.

## 9. Honest limits (say them before judges ask)
- Listings and people are **mock data** for the demo.
- Compatibility is computed by a transparent formula; the AI explains it.
- Rent suggestions are estimates anchored to local mock benchmarks.
