const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember } = require("../utils/access");

const router = express.Router();
router.use(requireAuth);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("Other"),
  dueDate: z.string().optional(), // YYYY-MM-DD
  dueTime: z.string().optional().default("19:00"),
  taskType: z.enum(["ONE_TIME", "RECURRING", "ROTATING"]).default("ONE_TIME"),
  repeatInterval: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  points: z.number().int().optional(),
  assignmentType: z.enum(["MANUAL", "AUTO_FAIR", "ROTATING"]).default("MANUAL"),
  assignedUserId: z.number().int().optional(),
});

function getPointsForDifficulty(diff) {
  if (diff === "EASY") return 1;
  if (diff === "HARD") return 5;
  return 3;
}

// ── Fair Auto-Assignment Selection Algorithm ──
async function selectFairAssignee(flatId, category, dueDateStr) {
  const members = await prisma.flatMember.findMany({
    where: { flatId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (members.length === 0) return null;

  const dateObj = dueDateStr ? new Date(dueDateStr) : new Date();
  const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = daysMap[dateObj.getDay()];

  const preferences = await prisma.taskPreference.findMany({
    where: { flatId },
  });
  const prefMap = new Map(preferences.map((p) => [p.userId, p]));

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const histories = await prisma.taskHistory.findMany({
    where: { flatId, createdAt: { gte: fourteenDaysAgo }, action: "COMPLETED" },
  });

  const memberPoints = new Map();
  members.forEach((m) => memberPoints.set(m.userId, 0));
  histories.forEach((h) => {
    const current = memberPoints.get(h.userId) || 0;
    memberPoints.set(h.userId, current + h.pointsEarned);
  });

  const candidates = members.map((m) => {
    const userId = m.userId;
    const pts = memberPoints.get(userId) || 0;
    const pref = prefMap.get(userId);

    let isAvailable = true;
    let preferred = false;
    let avoid = false;

    if (pref) {
      if (pref.availableDays && !pref.availableDays.includes(dayName)) {
        isAvailable = false;
      }
      if (pref.preferredCategories && pref.preferredCategories.includes(category)) {
        preferred = true;
      }
      if (pref.avoidCategories && pref.avoidCategories.includes(category)) {
        avoid = true;
      }
    }

    let score = pts;
    if (!isAvailable) score += 100;
    if (preferred) score -= 3;
    if (avoid) score += 10;

    return { userId, score };
  });

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.userId ?? members[0].userId;
}

// ── GET /flats/:flatId/tasks ──
router.get("/flats/:flatId/tasks", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (isNaN(flatId)) return res.status(400).json({ error: "Invalid flat ID" });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const tasks = await prisma.task.findMany({
    where: { flatId },
    include: {
      creator: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      swaps: {
        where: { status: "PENDING" },
        include: {
          requester: { select: { id: true, name: true } },
          target: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  res.json(tasks);
});

// ── POST /flats/:flatId/tasks ──
router.post("/flats/:flatId/tasks", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (isNaN(flatId)) return res.status(400).json({ error: "Invalid flat ID" });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;
  const points = data.points ?? getPointsForDifficulty(data.difficulty);
  const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();

  let assignedUserId = data.assignedUserId;

  if (data.assignmentType === "AUTO_FAIR" || (!assignedUserId && data.assignmentType === "ROTATING")) {
    assignedUserId = await selectFairAssignee(flatId, data.category, data.dueDate);
  }

  const task = await prisma.task.create({
    data: {
      flatId,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      dueDate,
      dueTime: data.dueTime,
      taskType: data.taskType,
      repeatInterval: data.repeatInterval ?? null,
      difficulty: data.difficulty,
      points,
      assignmentType: data.assignmentType,
      assignedUserId: assignedUserId ?? req.userId,
      createdBy: req.userId,
    },
    include: {
      creator: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(task);
});

// ── PATCH /tasks/:id/complete ──
router.patch("/tasks/:id/complete", async (req, res) => {
  const taskId = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!(await isFlatMember(task.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const completedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: {
        creator: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    await tx.taskHistory.create({
      data: {
        taskId,
        flatId: task.flatId,
        userId: req.userId,
        action: "COMPLETED",
        pointsEarned: task.points,
      },
    });

    if (task.taskType === "RECURRING" || task.taskType === "ROTATING") {
      const nextDueDate = new Date(task.dueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 7);

      let nextAssigneeId = task.assignedUserId;
      if (task.taskType === "ROTATING") {
        nextAssigneeId = await selectFairAssignee(task.flatId, task.category, nextDueDate.toISOString());
      }

      await tx.task.create({
        data: {
          flatId: task.flatId,
          title: task.title,
          description: task.description,
          category: task.category,
          dueDate: nextDueDate,
          dueTime: task.dueTime,
          taskType: task.taskType,
          repeatInterval: task.repeatInterval,
          difficulty: task.difficulty,
          points: task.points,
          assignmentType: task.assignmentType,
          assignedUserId: nextAssigneeId,
          createdBy: task.createdBy,
        },
      });
    }

    return completedTask;
  });

  res.json(updated);
});

// ── POST /tasks/:id/swap ──
router.post("/tasks/:id/swap", async (req, res) => {
  const taskId = Number(req.params.id);
  const { targetId, reason } = req.body;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!(await isFlatMember(task.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const swap = await prisma.taskSwap.create({
    data: {
      taskId,
      requesterId: req.userId,
      targetId: Number(targetId),
      reason: reason ?? null,
    },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(swap);
});

// ── POST /task-swaps/:id/respond ──
router.post("/task-swaps/:id/respond", async (req, res) => {
  const swapId = Number(req.params.id);
  const { action } = req.body;

  const swap = await prisma.taskSwap.findUnique({
    where: { id: swapId },
    include: { task: true },
  });

  if (!swap) return res.status(404).json({ error: "Swap request not found" });
  if (swap.targetId !== req.userId && swap.requesterId !== req.userId) {
    return res.status(403).json({ error: "Not authorized to respond to this swap" });
  }

  if (action === "ACCEPT") {
    await prisma.$transaction([
      prisma.taskSwap.update({
        where: { id: swapId },
        data: { status: "ACCEPTED" },
      }),
      prisma.task.update({
        where: { id: swap.taskId },
        data: { assignedUserId: swap.targetId },
      }),
      prisma.taskHistory.create({
        data: {
          taskId: swap.taskId,
          flatId: swap.task.flatId,
          userId: req.userId,
          action: "SWAPPED",
        },
      }),
    ]);
  } else {
    await prisma.taskSwap.update({
      where: { id: swapId },
      data: { status: "REJECTED" },
    });
  }

  res.json({ message: `Swap request ${action.toLowerCase()}ed` });
});

// ── POST /tasks/:id/skip ──
router.post("/tasks/:id/skip", async (req, res) => {
  const taskId = Number(req.params.id);
  const { reason, reassign } = req.body;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!(await isFlatMember(task.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  let assignedUserId = task.assignedUserId;
  if (reassign) {
    assignedUserId = await selectFairAssignee(task.flatId, task.category, task.dueDate.toISOString());
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: reassign ? "PENDING" : "SKIPPED",
      assignedUserId,
    },
  });

  await prisma.taskHistory.create({
    data: {
      taskId,
      flatId: task.flatId,
      userId: req.userId,
      action: "SKIPPED",
    },
  });

  res.json(updated);
});

// ── GET /flats/:flatId/workload ──
router.get("/flats/:flatId/workload", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const members = await prisma.flatMember.findMany({
    where: { flatId },
    include: { user: { select: { id: true, name: true } } },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const histories = await prisma.taskHistory.findMany({
    where: { flatId, createdAt: { gte: thirtyDaysAgo }, action: "COMPLETED" },
  });

  const pointsMap = new Map();
  members.forEach((m) => pointsMap.set(m.userId, { name: m.user.name, points: 0 }));

  histories.forEach((h) => {
    if (pointsMap.has(h.userId)) {
      pointsMap.get(h.userId).points += h.pointsEarned;
    }
  });

  const workloadList = Array.from(pointsMap.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    points: data.points,
  }));

  const totalPoints = workloadList.reduce((sum, w) => sum + w.points, 0);
  const avgPoints = members.length > 0 ? totalPoints / members.length : 0;

  const variance =
    members.length > 0
      ? workloadList.reduce((sum, w) => sum + Math.pow(w.points - avgPoints, 2), 0) / members.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const fairnessScore = avgPoints > 0 ? Math.max(0, Math.min(100, Math.round((1 - stdDev / (avgPoints + 5)) * 100))) : 100;

  res.json({
    members: workloadList,
    average: Math.round(avgPoints * 10) / 10,
    fairnessScore,
  });
});

// ── GET & PUT /flats/:flatId/task-preferences ──
router.get("/flats/:flatId/task-preferences", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const pref = await prisma.taskPreference.findUnique({
    where: { flatId_userId: { flatId, userId: req.userId } },
  });

  res.json(
    pref ?? {
      availableDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      preferredCategories: "",
      avoidCategories: "",
      preferredTime: "ANY",
    }
  );
});

router.put("/flats/:flatId/task-preferences", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const { availableDays, preferredCategories, avoidCategories, preferredTime } = req.body;

  const updated = await prisma.taskPreference.upsert({
    where: { flatId_userId: { flatId, userId: req.userId } },
    update: {
      availableDays: availableDays ?? "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      preferredCategories: preferredCategories ?? "",
      avoidCategories: avoidCategories ?? "",
      preferredTime: preferredTime ?? "ANY",
    },
    create: {
      flatId,
      userId: req.userId,
      availableDays: availableDays ?? "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      preferredCategories: preferredCategories ?? "",
      avoidCategories: avoidCategories ?? "",
      preferredTime: preferredTime ?? "ANY",
    },
  });

  res.json(updated);
});

module.exports = router;
