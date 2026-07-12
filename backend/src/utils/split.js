const { toCents, fromCents } = require("./settlement");

// Distributes `totalCents` across `n` shares as evenly as possible,
// handing the leftover paise to the first few participants so the sum is exact.
function splitEvenCents(totalCents, n) {
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// participants: [{ userId, value }]
// splitType: "EQUAL" | "EXACT" | "PERCENTAGE"
// Returns [{ userId, shareAmount }] with shareAmount as a number (rupees/dollars), summing exactly to `amount`.
function computeSplits(amount, splitType, participants) {
  const totalCents = toCents(amount);

  if (splitType === "EQUAL") {
    const parts = splitEvenCents(totalCents, participants.length);
    return participants.map((p, i) => ({ userId: p.userId, shareAmount: fromCents(parts[i]) }));
  }

  if (splitType === "EXACT") {
    const sumCents = participants.reduce((s, p) => s + toCents(p.value), 0);
    if (sumCents !== totalCents) {
      throw new Error(`Exact split amounts (${fromCents(sumCents)}) must add up to the total (${amount})`);
    }
    return participants.map((p) => ({ userId: p.userId, shareAmount: Number(p.value) }));
  }

  if (splitType === "PERCENTAGE") {
    const sumPct = participants.reduce((s, p) => s + Number(p.value), 0);
    if (Math.abs(sumPct - 100) > 0.01) {
      throw new Error(`Percentages must add up to 100 (got ${sumPct})`);
    }
    const rawCents = participants.map((p) => (totalCents * Number(p.value)) / 100);
    const flooredCents = rawCents.map(Math.floor);
    let leftover = totalCents - flooredCents.reduce((s, c) => s + c, 0);
    // hand out remaining paise to the participants with the largest fractional remainder
    const order = rawCents
      .map((c, i) => ({ i, frac: c - flooredCents[i] }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < leftover; k++) flooredCents[order[k % order.length].i] += 1;
    return participants.map((p, i) => ({ userId: p.userId, shareAmount: fromCents(flooredCents[i]) }));
  }

  throw new Error(`Unknown splitType: ${splitType}`);
}

module.exports = { computeSplits, splitEvenCents };
