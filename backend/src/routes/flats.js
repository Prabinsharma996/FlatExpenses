const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember, isFlatAdmin } = require("../utils/access");
const { computeNetBalances, computeSettlementTransactions, fromCents } = require("../utils/settlement");

const router = express.Router();
router.use(requireAuth);

// Create a new flat. Creator becomes admin and first member.
router.post("/", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      groupType: z.enum(["FLAT", "TRIP", "PARTY", "OFFICE"]).default("FLAT"),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const inviteCode = nanoid(8);
  const flat = await prisma.flat.create({
    data: {
      name: parsed.data.name,
      groupType: parsed.data.groupType,
      inviteCode,
      adminId: req.userId,
      members: { create: { userId: req.userId } },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, isGuest: true } } } } },
  });

  res.status(201).json(flat);
});

// Join a flat via invite code.
router.post("/join", async (req, res) => {
  const parsed = z.object({ inviteCode: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const flat = await prisma.flat.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (!flat) return res.status(404).json({ error: "Invalid invite code" });

  const alreadyMember = await isFlatMember(flat.id, req.userId);
  if (alreadyMember) return res.status(409).json({ error: "Already a member of this flat" });

  await prisma.flatMember.create({ data: { flatId: flat.id, userId: req.userId } });
  res.status(200).json({ flatId: flat.id, name: flat.name });
});

// List flats the current user belongs to.
router.get("/", async (req, res) => {
  const memberships = await prisma.flatMember.findMany({
    where: { userId: req.userId },
    include: {
      flat: { include: { members: { include: { user: { select: { id: true, name: true, email: true, isGuest: true } } } } } },
    },
  });
  res.json(memberships.map((m) => m.flat));
});

// Get flat detail (must be a member).
router.get("/:id", async (req, res) => {
  const flatId = Number(req.params.id);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const flat = await prisma.flat.findUnique({
    where: { id: flatId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, isGuest: true } } } },
      books: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!flat) return res.status(404).json({ error: "Flat not found" });
  res.json(flat);
});

// Spending report: totals by category and by member across all books in the flat.
router.get("/:id/report", async (req, res) => {
  const flatId = Number(req.params.id);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const expenses = await prisma.expense.findMany({
    where: { book: { flatId } },
    include: { paidBy: { select: { id: true, name: true } } },
  });

  const byCategory = new Map();
  const byMember = new Map();
  let total = 0;

  for (const e of expenses) {
    const amount = Number(e.amount);
    total += amount;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    const key = e.paidBy.id;
    const prevMember = byMember.get(key);
    byMember.set(key, { name: e.paidBy.name, amount: (prevMember?.amount ?? 0) + amount });
  }

  res.json({
    total,
    expenseCount: expenses.length,
    byCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    byMember: Array.from(byMember.entries())
      .map(([userId, v]) => ({ userId, name: v.name, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount),
  });
});

// All expenses across every book in the flat, newest first — powers the flat-wide Expenses tab.
router.get("/:id/expenses", async (req, res) => {
  const flatId = Number(req.params.id);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const expenses = await prisma.expense.findMany({
    where: { book: { flatId } },
    orderBy: { createdAt: "desc" },
    include: {
      paidBy: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
      book: { select: { id: true, name: true, status: true } },
    },
  });
  res.json(expenses);
});

// Live balances aggregated across every currently-open book in the flat.
// Closed books already have their own locked-in settlements, so they're excluded here —
// this reflects what's still outstanding right now.
router.get("/:id/balances", async (req, res) => {
  const flatId = Number(req.params.id);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const [members, expenses] = await Promise.all([
    prisma.flatMember.findMany({ where: { flatId }, include: { user: { select: { id: true, name: true } } } }),
    prisma.expense.findMany({
      where: { book: { flatId, status: "OPEN" } },
      include: { splits: true },
    }),
  ]);
  const nameById = new Map(members.map((m) => [m.userId, m.user.name]));

  const net = computeNetBalances(expenses);
  const transactions = computeSettlementTransactions(expenses).map((t) => ({
    ...t,
    fromUser: { id: t.fromUserId, name: nameById.get(t.fromUserId) },
    toUser: { id: t.toUserId, name: nameById.get(t.toUserId) },
  }));

  res.json({
    netByUser: Array.from(net.entries()).map(([userId, cents]) => ({
      userId,
      name: nameById.get(userId),
      net: fromCents(cents),
    })),
    transactions,
  });
});

// Add a temporary guest: a virtual member with no login, usable anywhere a real
// member can be (paid by, split participant, settlement party) since it's backed
// by a normal User row under the hood.
router.post("/:id/guests", async (req, res) => {
  const flatId = Number(req.params.id);
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const passwordHash = await bcrypt.hash(nanoid(24), 10);
  const member = await prisma.$transaction(async (tx) => {
    const guest = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: `guest-${nanoid(12)}@flatsplit.local`,
        passwordHash,
        isGuest: true,
      },
    });
    return tx.flatMember.create({
      data: { flatId, userId: guest.id },
      include: { user: { select: { id: true, name: true, email: true, isGuest: true } } },
    });
  });

  res.status(201).json(member);
});

// Remove a member (admin only, cannot remove self as admin).
router.delete("/:id/members/:userId", async (req, res) => {
  const flatId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);

  if (!(await isFlatAdmin(flatId, req.userId))) {
    return res.status(403).json({ error: "Only the flat admin can remove members" });
  }
  if (targetUserId === req.userId) {
    return res.status(400).json({ error: "Admin cannot remove themselves" });
  }

  await prisma.flatMember.delete({
    where: { flatId_userId: { flatId, userId: targetUserId } },
  }).catch(() => null);

  res.status(204).send();
});

module.exports = router;
