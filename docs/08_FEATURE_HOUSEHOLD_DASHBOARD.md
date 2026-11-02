# 08 — Feature: Household Dashboard (Smart Rent Split, Bills, Chores)

Shows life **after** moving in. All math is in code (`src/lib/household.ts`), pure functions, no AI required. AI (P1) only writes one friendly sentence explaining the split.

## 1. Creating a household ("Move in (demo)")
Button on the listing detail page `/explore/[id]`.
- Create a `Household` doc in Firestore `households`:
  - `ownerUid = user.uid`, `listingId = listing.id`, `name = listing.title`, `totalRent = <see below>`.
  - `members`: **you** + up to 2 housemates. Housemates = the listing's residents (seed users) if any; otherwise the 2 highest-compat seed users for you (excluding anyone already added). Each member: `id` (uid or seed id), `name`, `hue` (seed hue, or 40 for you), `areaSqft`, `attachedBath`, `balcony`, `ac`.
  - Default member details (so the demo looks interesting): you = 150 sqft, attachedBath true; 2nd = 120 sqft; 3rd = 100 sqft; balcony and ac false.
  - `totalRent`: for `entire_flat` = `askingRent`; for room listings = `askingRent × number of members`.
  - `expenses`: `[]`. `chores`: 4 starter chores assigned round-robin: "Take out the trash" (daily), "Clean the kitchen" (weekly), "Buy groceries" (weekly), "Clean the bathroom" (weekly).
- Then navigate to `/home`.
`/home` loads the user's **latest** household (`where("ownerUid","==",uid)`, then pick the newest `createdAt` client-side to avoid needing a composite index). If none exists, show an elegant empty state with a button to `/explore`.
Real-time with `onSnapshot` on that document.

## 2. Rent split engine (`household.ts`)

### 2.1 Weighted fair split
`weight_i = areaSqft_i × (1 + 0.15 × attachedBath_i + 0.05 × balcony_i + 0.05 × ac_i)` (booleans count as 1 or 0).
`rawShare_i = totalRent × weight_i ÷ Σ weight`.

### 2.2 Rounding to whole rupees that still sum exactly to `totalRent` (largest remainder)
1. `base_i = Math.floor(rawShare_i)`.
2. `leftover = totalRent − Σ base_i`.
3. Sort members by `rawShare_i − base_i` descending; add 1 rupee to the first `leftover` members.

### 2.3 Modes
- **Fair (default):** the formula above.
- **Equal:** every `weight_i = 1`.
The UI has a segmented toggle **Fair / Equal**. Switching animates the ring chart smoothly. The mode is a view setting (not stored).

**Must pass test vector `03` §6.3** (A 10548, B 7337, C 6115 for total 24000).

### 2.4 Exports
```ts
export function splitRent(totalRent: number, members: HouseholdMember[], mode: "fair" | "equal"): { id: string; share: number; pct: number }[];
export function computeBalances(members: HouseholdMember[], expenses: Expense[]): Record<string, number>; // + means is owed, − means owes
export function settleUp(balances: Record<string, number>): { from: string; to: string; amount: number }[];
```

## 3. Bills and "who owes whom"
### 3.1 Add expense
Form: title, amount (₹), paid by (select member), split between (checkboxes, default all). Equal split among the checked members.

### 3.2 Balances (`computeBalances`)
For each expense: `share = amount ÷ splitBetween.length`.
`net[paidBy] += amount`; for each id in `splitBetween`: `net[id] −= share`.
Round every final balance to 2 decimals. (Expenses affect only the bills ledger; the monthly rent split is separate.)

### 3.3 Settle up (`settleUp`) — greedy, fewest transfers
1. Split into creditors (`net > 0.005`) and debtors (`net < −0.005`).
2. Repeat: take the largest creditor `c` and largest debtor `d`; `amount = min(c.net, −d.net)`; record `{ from: d, to: c, amount }`; reduce both; drop anyone who reaches ~0.
3. Round transfer amounts to whole rupees for display.

**Must pass test vector `03` §6.4** (B pays A ₹1000, C pays A ₹1000).

## 4. Chores
List with checkbox, title, assignee avatar, frequency chip. Toggling `done` writes to Firestore. A **Rotate** button shifts every assignment to the next member (round-robin) and resets `done` to false. Add-chore: small inline form (title, assignee, frequency).

## 5. Layout (`/home`)
- Header: household name, member avatar stack, **Total rent** in large serif.
- Left (wide): **Rent ring chart** (hand-built SVG): one coloured arc per member (member hue), animated stroke-dasharray transitions, centre shows total rent; below it, a row per member: name, area, share in ₹, % of total. Fair/Equal toggle on top.
- Right: **Bills** card (list newest first + Add bill) and **Settle up** card (list of "X pays Y ₹N" with a soft arrow animation; "All settled" empty state).
- Bottom: **Chores** card.
- Optional P1: **"Why this split?"** button → `POST /api/ai/split-explain`.

### 5.1 P1: split explanation
Request: `{ totalRent, mode, shares: [{ name, areaSqft, attachedBath, balcony, ac, share }] }`.
Schema: `{ "type":"object","properties":{"explanation":{"type":"string"}},"required":["explanation"] }`.
Prompt text: `"In 2 short sentences, plain English, explain why these housemates pay these amounts. Use ONLY the numbers given. Do not change any number. Mode: <fair or equal>. Data: <JSON>"`.
Validation: ≤ 300 chars. Fallback: `"Each person pays in proportion to their room size, with a small adjustment for an attached bathroom, balcony or AC."` (fair) / `"Everyone pays the same share."` (equal).

## 6. Acceptance checklist
- [ ] Test vectors `03` §6.3 and §6.4 pass.
- [ ] Shares always sum exactly to total rent in both modes.
- [ ] Adding a bill updates "Settle up" immediately (and for a second browser tab via `onSnapshot`).
- [ ] The ring chart animates when switching Fair/Equal.
- [ ] Refresh keeps all data.
