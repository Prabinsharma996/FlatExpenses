// Given a book's expenses (with splits), computes each member's net balance
// and reduces it to the minimum number of "who pays whom" transactions.
// Internally works in integer paise/cents to avoid floating point drift.

function toCents(decimalLike) {
  return Math.round(Number(decimalLike) * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

// expenses: [{ amount, paidById, splits: [{ userId, shareAmount }] }]
// returns: Map<userId, netCents>  (positive = should receive, negative = owes)
function computeNetBalances(expenses) {
  const net = new Map();

  const add = (userId, deltaCents) => {
    net.set(userId, (net.get(userId) || 0) + deltaCents);
  };

  for (const expense of expenses) {
    add(expense.paidById, toCents(expense.amount));
    for (const split of expense.splits) {
      add(split.userId, -toCents(split.shareAmount));
    }
  }

  return net;
}

// Greedy min-cash-flow: repeatedly settle the largest creditor against the
// largest debtor. Produces at most N-1 transactions for N members.
function simplifyDebts(netCentsByUser) {
  const creditors = [];
  const debtors = [];

  for (const [userId, cents] of netCentsByUser.entries()) {
    if (cents > 0) creditors.push({ userId, amount: cents });
    else if (cents < 0) debtors.push({ userId, amount: -cents });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);

    if (settled > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: fromCents(settled),
      });
    }

    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transactions;
}

function computeSettlementTransactions(expenses) {
  const net = computeNetBalances(expenses);
  return simplifyDebts(net);
}

module.exports = { computeNetBalances, simplifyDebts, computeSettlementTransactions, toCents, fromCents };
