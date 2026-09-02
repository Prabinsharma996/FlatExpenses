const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember, isFlatAdmin } = require("../utils/access");

const router = express.Router();
router.use(requireAuth);

const userSelect = { id: true, name: true, email: true };

// List all chores in a flat
router.get("/flats/:flatId/chores", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const chores = await prisma.chore.findMany({
    where: { flatId },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
    include: {
      assignedUser: { select: userSelect },
      creator: { select: userSelect },
    },
  });

  res.json(chores);
});

// Create a new chore
router.post("/flats/:flatId/chores", async (req, res) => {
  const flatId = Number(req.params.flatId);
  const parsed = z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
      assignedUserId: z.number().int().optional().nullable(),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const chore = await prisma.chore.create({
    data: {
      flatId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      frequency: parsed.data.frequency || "WEEKLY",
      assignedUserId: parsed.data.assignedUserId || req.userId,
      createdBy: req.userId,
    },
    include: {
      assignedUser: { select: userSelect },
      creator: { select: userSelect },
    },
  });

  res.status(201).json(chore);
});

// Toggle completion status of a chore
router.patch("/chores/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  const chore = await prisma.chore.findUnique({ where: { id } });
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  if (!(await isFlatMember(chore.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const updated = await prisma.chore.update({
    where: { id },
    data: { isCompleted: !chore.isCompleted },
    include: {
      assignedUser: { select: userSelect },
      creator: { select: userSelect },
    },
  });

  res.json(updated);
});

// Rotate assignment to the next flatmate in sequence
router.post("/chores/:id/rotate", async (req, res) => {
  const id = Number(req.params.id);
  const chore = await prisma.chore.findUnique({
    where: { id },
    include: { flat: { include: { members: { orderBy: { id: "asc" } } } } },
  });

  if (!chore) return res.status(404).json({ error: "Chore not found" });
  if (!(await isFlatMember(chore.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const memberUserIds = chore.flat.members.map((m) => m.userId);
  if (memberUserIds.length === 0) {
    return res.status(400).json({ error: "No members in flat to rotate to" });
  }

  const currentIndex = chore.assignedUserId ? memberUserIds.indexOf(chore.assignedUserId) : -1;
  const nextIndex = (currentIndex + 1) % memberUserIds.length;
  const nextUserId = memberUserIds[nextIndex];

  const updated = await prisma.chore.update({
    where: { id },
    data: {
      assignedUserId: nextUserId,
      isCompleted: false, // Reset completion status when rotated to next person
    },
    include: {
      assignedUser: { select: userSelect },
      creator: { select: userSelect },
    },
  });

  res.json(updated);
});

// Delete a chore
router.delete("/chores/:id", async (req, res) => {
  const id = Number(req.params.id);
  const chore = await prisma.chore.findUnique({ where: { id } });
  if (!chore) return res.status(404).json({ error: "Chore not found" });

  const isCreator = chore.createdBy === req.userId;
  const isAssigned = chore.assignedUserId === req.userId;
  const isAdmin = await isFlatAdmin(chore.flatId, req.userId);

  if (!isCreator && !isAssigned && !isAdmin) {
    return res.status(403).json({ error: "Cannot delete this chore" });
  }

  await prisma.chore.delete({ where: { id } });
  res.json({ success: true });
});

module.exports = router;
