import { HouseholdMember, Expense } from "./types";

export function splitRent(
  totalRent: number,
  members: HouseholdMember[],
  mode: "fair" | "equal"
): { id: string; share: number; pct: number }[] {
  if (!members.length) return [];

  const weights = members.map((m) => {
    if (mode === "equal") return 1;
    const bonus =
      1 +
      0.15 * (m.attachedBath ? 1 : 0) +
      0.05 * (m.balcony ? 1 : 0) +
      0.05 * (m.ac ? 1 : 0);
    return m.areaSqft * bonus;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;
  const rawShares = weights.map((w) => (totalRent * w) / totalWeight);
  const bases = rawShares.map((r) => Math.floor(r));
  const sumBase = bases.reduce((acc, b) => acc + b, 0);
  let leftover = Math.round(totalRent - sumBase);

  const remainders = rawShares.map((r, i) => ({
    index: i,
    rem: r - bases[i],
  }));

  remainders.sort((a, b) => b.rem - a.rem);

  const finalShares = [...bases];
  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    finalShares[remainders[i].index] += 1;
    leftover -= 1;
  }

  return members.map((m, i) => ({
    id: m.id,
    share: finalShares[i],
    pct: totalRent > 0 ? Math.round((finalShares[i] / totalRent) * 100) : 0,
  }));
}

export function computeBalances(
  members: HouseholdMember[],
  expenses: Expense[]
): Record<string, number> {
  const net: Record<string, number> = {};
  for (const m of members) {
    net[m.id] = 0;
  }

  for (const exp of expenses) {
    const validSplit = exp.splitBetween.filter((id) => id in net);
    if (!validSplit.length || exp.amount <= 0) continue;
    const share = exp.amount / validSplit.length;
    if (exp.paidBy in net) {
      net[exp.paidBy] += exp.amount;
    }
    for (const id of validSplit) {
      net[id] -= share;
    }
  }

  for (const id of Object.keys(net)) {
    net[id] = Math.round(net[id] * 100) / 100;
  }

  return net;
}

export function settleUp(
  balances: Record<string, number>
): { from: string; to: string; amount: number }[] {
  const creditors: { id: string; net: number }[] = [];
  const debtors: { id: string; net: number }[] = [];

  for (const [id, val] of Object.entries(balances)) {
    if (val > 0.005) creditors.push({ id, net: val });
    else if (val < -0.005) debtors.push({ id, net: val });
  }

  const transfers: { from: string; to: string; amount: number }[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => a.net - b.net); // most negative first

    const c = creditors[0];
    const d = debtors[0];

    const amount = Math.min(c.net, -d.net);
    const rounded = Math.round(amount);

    if (rounded > 0) {
      transfers.push({
        from: d.id,
        to: c.id,
        amount: rounded,
      });
    }

    c.net -= amount;
    d.net += amount;

    if (c.net <= 0.005) creditors.shift();
    if (d.net >= -0.005) debtors.shift();
  }

  return transfers;
}
