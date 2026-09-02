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

// Verify flat membership helper
async function checkMember(flatId, userId) {
  const member = await prisma.flatMember.findUnique({
    where: { flatId_userId: { flatId: Number(flatId), userId: Number(userId) } },
  });
  return !!member;
}

// GET /api/flats/:flatId/budget
router.get("/:flatId/budget", requireAuth, async (req, res) => {
  try {
    const flatId = Number(req.params.flatId);
    if (!await checkMember(flatId, req.userId)) {
      return res.status(403).json({ error: "Access denied to this flat" });
    }

    // 1. Fetch saved budget limits
    let savedBudgets = await prisma.flatBudget.findMany({
      where: { flatId },
    });

    // If no budgets saved yet, populate default categories
    if (savedBudgets.length === 0) {
      await Promise.all(
        DEFAULT_CATEGORIES.map((cat) =>
          prisma.flatBudget.create({
            data: {
              flatId,
              category: cat.category,
              amountLimit: cat.defaultLimit,
            },
          })
        )
      );
      savedBudgets = await prisma.flatBudget.findMany({ where: { flatId } });
    }

    // 2. Fetch expenses for current month in OPEN books (or all open expenses)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await prisma.expense.findMany({
      where: {
        book: { flatId, status: "OPEN" },
        createdAt: { gte: startOfMonth },
      },
      select: {
        amount: true,
        category: true,
      },
    });

    // Aggregate spending per category
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
        alerts.push(`⚠️ ${b.category} spending is already ${percentUsed}% of the monthly budget.`);
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

    // Check for categories spent but not in defined budgets
    Object.keys(spentByCategory).forEach((cat) => {
      if (!savedBudgets.some((b) => b.category === cat)) {
        const spent = spentByCategory[cat];
        totalSpent += 0; // already added above
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
      flatId,
      totalLimit,
      totalSpent,
      totalPercentUsed,
      alerts,
      categories: categoryBudgets,
    });
  } catch (err) {
    console.error("Error fetching budget:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flats/:flatId/budget
router.post("/:flatId/budget", requireAuth, async (req, res) => {
  try {
    const flatId = Number(req.params.flatId);
    if (!await checkMember(flatId, req.userId)) {
      return res.status(403).json({ error: "Access denied to this flat" });
    }

    const { budgets } = req.body; // Array of { category, amountLimit }
    if (!Array.isArray(budgets)) {
      return res.status(400).json({ error: "Invalid budget payload, expected array" });
    }

    const upsertPromises = budgets.map((b) => {
      const category = String(b.category).trim();
      const amountLimit = Number(b.amountLimit) || 0;

      return prisma.flatBudget.upsert({
        where: { flatId_category: { flatId, category } },
        update: { amountLimit },
        create: { flatId, category, amountLimit },
      });
    });

    await Promise.all(upsertPromises);

    res.json({ message: "Monthly household budget updated successfully!" });
  } catch (err) {
    console.error("Error updating budget:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
