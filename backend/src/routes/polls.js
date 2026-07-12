const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { isFlatMember, isFlatAdmin } = require("../utils/access");

const router = express.Router();
router.use(requireAuth);

function serializePoll(poll, userId) {
  const options = poll.options.map((o) => ({
    id: o.id,
    label: o.label,
    votes: o.votes.length,
  }));
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const myVote = poll.options.flatMap((o) => o.votes).find((v) => v.userId === userId);

  return {
    id: poll.id,
    flatId: poll.flatId,
    question: poll.question,
    createdBy: poll.createdBy,
    createdAt: poll.createdAt,
    closedAt: poll.closedAt,
    totalVotes,
    options,
    myOptionId: myVote?.optionId ?? null,
  };
}

// List polls in a flat, newest first.
router.get("/flats/:flatId/polls", async (req, res) => {
  const flatId = Number(req.params.flatId);
  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const polls = await prisma.poll.findMany({
    where: { flatId },
    orderBy: { createdAt: "desc" },
    include: { options: { include: { votes: true } } },
  });

  res.json(polls.map((p) => serializePoll(p, req.userId)));
});

// Create a poll with at least two options.
router.post("/flats/:flatId/polls", async (req, res) => {
  const flatId = Number(req.params.flatId);
  const parsed = z
    .object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!(await isFlatMember(flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }

  const poll = await prisma.poll.create({
    data: {
      flatId,
      question: parsed.data.question,
      createdBy: req.userId,
      options: { create: parsed.data.options.map((label) => ({ label })) },
    },
    include: { options: { include: { votes: true } } },
  });

  res.status(201).json(serializePoll(poll, req.userId));
});

// Cast or change a vote (one vote per user per poll).
router.post("/polls/:pollId/vote", async (req, res) => {
  const pollId = Number(req.params.pollId);
  const parsed = z.object({ optionId: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  if (!(await isFlatMember(poll.flatId, req.userId))) {
    return res.status(403).json({ error: "Not a member of this flat" });
  }
  if (poll.closedAt) return res.status(409).json({ error: "Poll is closed" });
  if (!poll.options.some((o) => o.id === parsed.data.optionId)) {
    return res.status(400).json({ error: "Invalid option for this poll" });
  }

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId: req.userId } },
    create: { pollId, optionId: parsed.data.optionId, userId: req.userId },
    update: { optionId: parsed.data.optionId },
  });

  const updated = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { include: { votes: true } } },
  });
  res.json(serializePoll(updated, req.userId));
});

// Close a poll (creator or flat admin only).
router.post("/polls/:pollId/close", async (req, res) => {
  const pollId = Number(req.params.pollId);
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return res.status(404).json({ error: "Poll not found" });

  const isCreator = poll.createdBy === req.userId;
  const isAdmin = await isFlatAdmin(poll.flatId, req.userId);
  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: "Only the poll creator or flat admin can close it" });
  }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { closedAt: new Date() },
    include: { options: { include: { votes: true } } },
  });
  res.json(serializePoll(updated, req.userId));
});

module.exports = router;
