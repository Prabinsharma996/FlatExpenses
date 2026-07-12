const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember, isFlatAdmin } = require("../utils/access");
const { computeSplits } = require("../utils/split");

const router = express.Router();
router.use(requireAuth);

const participantSchema = z.object({
  userId: z.number().int(),
  value: z.number().optional(), // required for EXACT/PERCENTAGE, ignored for EQUAL
});

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  remarks: z.string().optional(),
  paidById: z.number().int().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE"]).default("EQUAL"),
  participants: z.array(participantSchema).min(1),
});

async function assertBookOpenAndMember(bookId, userId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return { error: 404, message: "Book not found" };
  if (!(await isFlatMember(book.flatId, userId))) {
    return { error: 403, message: "Not a member of this flat" };
  }
  if (book.status === "CLOSED") {
    return { error: 409, message: "Book is closed" };
  }
  return { book };
}

router.post("/books/:bookId/expenses", async (req, res) => {
  const bookId = Number(req.params.bookId);
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { error, message, book } = await assertBookOpenAndMember(bookId, req.userId);
  if (error) return res.status(error).json({ error: message });

  const { amount, category, remarks, splitType, participants } = parsed.data;
  const paidById = parsed.data.paidById ?? req.userId;

  const memberIds = new Set(
    (await prisma.flatMember.findMany({ where: { flatId: book.flatId }, select: { userId: true } })).map(
      (m) => m.userId
    )
  );
  if (!memberIds.has(paidById)) return res.status(400).json({ error: "paidById is not a member of this flat" });
  for (const p of participants) {
    if (!memberIds.has(p.userId)) {
      return res.status(400).json({ error: `Participant ${p.userId} is not a member of this flat` });
    }
  }
  if (splitType !== "EQUAL" && participants.some((p) => p.value === undefined)) {
    return res.status(400).json({ error: "Each participant needs a value for EXACT/PERCENTAGE splits" });
  }

  let splits;
  try {
    splits = computeSplits(amount, splitType, participants);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const expense = await prisma.expense.create({
    data: {
      bookId,
      paidById,
      addedById: req.userId,
      amount,
      category,
      remarks,
      splits: { create: splits.map((s) => ({ userId: s.userId, shareAmount: s.shareAmount })) },
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  res.status(201).json(expense);
});

router.get("/books/:bookId/expenses", async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (!(await isFlatMember(book.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const expenses = await prisma.expense.findMany({
    where: { bookId },
    orderBy: { createdAt: "desc" },
    include: {
      paidBy: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  res.json(expenses);
});

router.delete("/expenses/:id", async (req, res) => {
  const expenseId = Number(req.params.id);
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) return res.status(404).json({ error: "Expense not found" });

  const { error, message } = await assertBookOpenAndMember(expense.bookId, req.userId);
  if (error) return res.status(error).json({ error: message });

  const book = await prisma.book.findUnique({ where: { id: expense.bookId } });
  const isOwner = expense.paidById === req.userId;
  const isAdmin = await isFlatAdmin(book.flatId, req.userId);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Only the person who added this expense or the flat admin can delete it" });
  }

  await prisma.expense.delete({ where: { id: expenseId } });
  res.status(204).send();
});

module.exports = router;
