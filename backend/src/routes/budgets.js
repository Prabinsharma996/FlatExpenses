const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { category: "Groceries", defaultLimit: 8000 },
  { category: "Electricity", defaultLimit: 3000 },
  { category: "Internet", defaultLimit: 1500 },
  { category: "Cleaning", defaultLimit: 1000 },
  { category: "Other", defaultLimit: 2000 },
];

// Helper: Check membership via bookId
async function checkBookMember(bookId, userId) {
  const book = await prisma.book.findUnique({
    where: { id: Number(bookId) },
    select: { flatId: true },
  });
  if (!book) return null;

  const member = await prisma.flatMember.findUnique({
    where: { flatId_userId: { flatId: book.flatId, userId: Number(userId) } },
  });
  return member ? book.flatId : null;
}

// GET /api/books/:bookId/budget
router.get("/books/:bookId/budget", requireAuth, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const flatId = await checkBookMember(bookId, req.userId);
    if (!flatId) {
      return res.status(403).json({ error: "Access denied or book not found" });
    }

    // 1. Fetch saved budget limits for this book
    let savedBudgets = await prisma.bookBudget.findMany({
      where: { bookId },
    });

    // If no budgets saved yet, populate default categories
    if (savedBudgets.length === 0) {
      await Promise.all(
        DEFAULT_CATEGORIES.map((cat) =>
          prisma.bookBudget.create({
            data: {
              bookId,
              category: cat.category,
              amountLimit: cat.defaultLimit,
            },
          })
        )
      );
      savedBudgets = await prisma.bookBudget.findMany({ where: { bookId } });
    }

    // 2. Fetch all expenses in this specific book
    const expenses = await prisma.expense.findMany({
      where: { bookId },
      select: {
        amount: true,
        category: true,
      },
    });

    // Aggregate spending per category for this book
    const spentByCategory = {};
    let totalSpent = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount);
      const cat = e.category || "Other";
      spentByCategory[cat] = (spentByCategory[cat] || 0) + amt;
      totalSpent += amt;
    });

    // 3. Build category budget breakdown & alerts
    let totalLimit = 0;
    const alerts = [];

    const categoryBudgets = savedBudgets.map((b) => {
      const limit = Number(b.amountLimit);
      totalLimit += limit;
      const spent = spentByCategory[b.category] || 0;
      const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = "OK";
      if (percentUsed >= 100) {
        status = "OVER";
        alerts.push(`🚨 ${b.category} budget exceeded (${percentUsed}%)!`);
      } else if (percentUsed >= 80) {
        status = "WARNING";
        alerts.push(`⚠️ ${b.category} spending is already ${percentUsed}% of the book budget.`);
      }

      return {
        id: b.id,
        category: b.category,
        amountLimit: limit,
        spent,
        percentUsed,
        status,
      };
    });

    // Include categories spent in book but not in predefined budget limits
    Object.keys(spentByCategory).forEach((cat) => {
      if (!savedBudgets.some((b) => b.category === cat)) {
        const spent = spentByCategory[cat];
        categoryBudgets.push({
          id: 0,
          category: cat,
          amountLimit: 0,
          spent,
          percentUsed: 100,
          status: "OVER",
        });
      }
    });

    const totalPercentUsed = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

    res.json({
      bookId,
      totalLimit,
      totalSpent,
      totalPercentUsed,
      alerts,
      categories: categoryBudgets,
    });
  } catch (err) {
    console.error("Error fetching book budget:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/books/:bookId/budget
router.post("/books/:bookId/budget", requireAuth, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const flatId = await checkBookMember(bookId, req.userId);
    if (!flatId) {
      return res.status(403).json({ error: "Access denied or book not found" });
    }

    const { budgets } = req.body; // Array of { category, amountLimit }
    if (!Array.isArray(budgets)) {
      return res.status(400).json({ error: "Invalid budget payload, expected array" });
    }

    const upsertPromises = budgets.map((b) => {
      const category = String(b.category).trim();
      const amountLimit = Number(b.amountLimit) || 0;

      return prisma.bookBudget.upsert({
        where: { bookId_category: { bookId, category } },
        update: { amountLimit },
        create: { bookId, category, amountLimit },
      });
    });

    await Promise.all(upsertPromises);

    res.json({ message: "Book budget updated successfully!" });
  } catch (err) {
    console.error("Error updating book budget:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
