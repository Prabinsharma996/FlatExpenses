const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember } = require("../utils/access");

const router = express.Router();
router.use(requireAuth);

const createShoppingSchema = z.object({
  title: z.string().min(1),
  quantity: z.string().optional(),
});

// ── GET /flats/:flatId/shopping ──
router.get("/flats/:flatId/shopping", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const items = await prisma.shoppingItem.findMany({
    where: { flatId },
    include: {
      addedBy: { select: { id: true, name: true } },
      boughtBy: { select: { id: true, name: true } },
    },
    orderBy: [{ isBought: "asc" }, { createdAt: "desc" }],
  });

  res.json(items);
});

// ── POST /flats/:flatId/shopping ──
router.post("/flats/:flatId/shopping", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const parsed = createShoppingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const item = await prisma.shoppingItem.create({
    data: {
      flatId,
      title: parsed.data.title,
      quantity: parsed.data.quantity ?? null,
      addedById: req.userId,
    },
    include: {
      addedBy: { select: { id: true, name: true } },
      boughtBy: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(item);
});

// ── PATCH /shopping/:id/toggle ──
router.patch("/shopping/:id/toggle", async (req, res) => {
  const itemId = Number(req.params.id);
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) return res.status(404).json({ error: "Shopping item not found" });

  if (!(await isFlatMember(item.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const isBought = !item.isBought;

  const updated = await prisma.shoppingItem.update({
    where: { id: itemId },
    data: {
      isBought,
      boughtById: isBought ? req.userId : null,
    },
    include: {
      addedBy: { select: { id: true, name: true } },
      boughtBy: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
});

// ── DELETE /shopping/:id ──
router.delete("/shopping/:id", async (req, res) => {
  const itemId = Number(req.params.id);
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) return res.status(404).json({ error: "Shopping item not found" });

  if (!(await isFlatMember(item.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  await prisma.shoppingItem.delete({ where: { id: itemId } });
  res.json({ success: true });
});

module.exports = router;
