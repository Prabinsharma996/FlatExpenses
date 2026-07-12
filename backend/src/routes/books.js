const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember } = require("../utils/access");
const { computeSettlementTransactions, computeNetBalances, fromCents } = require("../utils/settlement");

const router = express.Router();
router.use(requireAuth);

async function loadBookForMember(bookId, userId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return { error: 404, message: "Book not found" };
  if (!(await isFlatMember(book.flatId, userId))) {
    return { error: 403, message: "Not a member of this flat" };
  }
  return { book };
}

// Create a book within a flat.
router.post("/flats/:flatId/books", async (req, res) => {
  const flatId = Number(req.params.flatId);
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const book = await prisma.book.create({
    data: { flatId, name: parsed.data.name, createdBy: req.userId },
  });
  res.status(201).json(book);
});

// List books within a flat.
router.get("/flats/:flatId/books", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }
  const books = await prisma.book.findMany({ where: { flatId }, orderBy: { createdAt: "desc" } });
  res.json(books);
});

// Book detail: expenses, splits, and live (or final) balances.
router.get("/books/:id", async (req, res) => {
  const bookId = Number(req.params.id);
  const { error, message, book } = await loadBookForMember(bookId, req.userId);
  if (error) return res.status(error).json({ error: message });

  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
      include: {
        paidBy: { select: { id: true, name: true } },
        addedBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.settlement.findMany({
      where: { bookId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    }),
  ]);

  let balances;
  if (book.status === "CLOSED") {
    balances = settlements;
  } else {
    const members = await prisma.flatMember.findMany({
      where: { flatId: book.flatId },
      include: { user: { select: { id: true, name: true } } },
    });
    const nameById = new Map(members.map((m) => [m.userId, m.user.name]));

    const net = computeNetBalances(expenses);
    const transactions = computeSettlementTransactions(expenses).map((t) => ({
      ...t,
      fromUser: { id: t.fromUserId, name: nameById.get(t.fromUserId) },
      toUser: { id: t.toUserId, name: nameById.get(t.toUserId) },
    }));
    balances = {
      transactions,
      netByUser: Array.from(net.entries()).map(([userId, cents]) => ({
        userId,
        name: nameById.get(userId),
        net: fromCents(cents),
      })),
    };
  }

  res.json({ book, expenses, balances });
});

// Close a book: compute final settlement transactions and persist them.
router.post("/books/:id/close", async (req, res) => {
  const bookId = Number(req.params.id);
  const { error, message, book } = await loadBookForMember(bookId, req.userId);
  if (error) return res.status(error).json({ error: message });
  if (book.status === "CLOSED") return res.status(409).json({ error: "Book already closed" });

  const expenses = await prisma.expense.findMany({
    where: { bookId },
    include: { splits: true },
  });
  const transactions = computeSettlementTransactions(expenses);

  const [, , closedBook] = await prisma.$transaction([
    prisma.settlement.deleteMany({ where: { bookId } }),
    prisma.settlement.createMany({
      data: transactions.map((t) => ({
        bookId,
        fromUserId: t.fromUserId,
        toUserId: t.toUserId,
        amount: t.amount,
      })),
    }),
    prisma.book.update({ where: { id: bookId }, data: { status: "CLOSED", closedAt: new Date() } }),
  ]);

  const settlements = await prisma.settlement.findMany({
    where: { bookId },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  res.json({ book: closedBook, settlements });
});

// Mark a settlement transaction as paid.
router.patch("/settlements/:id/pay", async (req, res) => {
  const settlementId = Number(req.params.id);
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) return res.status(404).json({ error: "Settlement not found" });

  const book = await prisma.book.findUnique({ where: { id: settlement.bookId } });
  if (!(await isFlatMember(book.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }
  // Only the payer or the recipient can mark it as paid.
  if (req.userId !== settlement.fromUserId && req.userId !== settlement.toUserId) {
    return res.status(403).json({ error: "Only the payer or recipient can confirm this settlement" });
  }

  const updated = await prisma.settlement.update({
    where: { id: settlementId },
    data: { status: "PAID", paidAt: new Date() },
  });
  res.json(updated);
});

module.exports = router;
