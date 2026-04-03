import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

const router = Router();

const getSalonId = (req: AuthRequest) => req.user!.salonId as string;

const categorySchema = z.enum(["BUG", "UX", "FEATURE", "INTEGRATION", "NOTIFICATIONS", "OTHER"]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

/** Zgłoszenie (salon + autor widoczne tylko dla własnego salonu / admina). */
router.post("/feedback", async (req: AuthRequest, res) => {
  const schema = z.object({
    category: categorySchema,
    title: z.string().min(3).max(200),
    body: z.string().min(10).max(20000),
    priority: prioritySchema.optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane zgłoszenia" });

  const salonId = getSalonId(req);
  const userId = req.user!.userId;

  const row = await prisma.salonFeedback.create({
    data: {
      salonId,
      authorUserId: userId,
      category: parsed.data.category,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      priority: parsed.data.priority ?? "MEDIUM",
    },
  });
  return res.json({ feedback: row });
});

router.get("/feedback", async (req: AuthRequest, res) => {
  const salonId = getSalonId(req);
  const list = await prisma.salonFeedback.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { email: true } },
    },
  });
  return res.json({
    feedback: list.map((f) => ({
      id: f.id,
      category: f.category,
      title: f.title,
      body: f.body,
      priority: f.priority,
      status: f.status,
      votingOpenedAt: f.votingOpenedAt,
      publicReply: f.publicReply,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      authorEmail: f.author.email,
    })),
  });
});

/** Lista do głosowania: bez danych zgłaszającego salonu — tylko treść i statystyki. */
router.get("/feedback/voting", async (req: AuthRequest, res) => {
  const salonId = getSalonId(req);
  const rows = await prisma.salonFeedback.findMany({
    where: {
      status: "IN_VOTING",
      votingOpenedAt: { not: null },
    },
    include: {
      _count: { select: { votes: true } },
      votes: { where: { salonId }, select: { id: true } },
    },
  });

  rows.sort(
    (a, b) =>
      b._count.votes - a._count.votes ||
      (b.votingOpenedAt?.getTime() ?? 0) - (a.votingOpenedAt?.getTime() ?? 0),
  );

  return res.json({
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      body: r.body,
      voteCount: r._count.votes,
      hasMyVote: r.votes.length > 0,
      votingOpenedAt: r.votingOpenedAt,
    })),
  });
});

router.post("/feedback/:id/vote", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const salonId = getSalonId(req);

  const fb = await prisma.salonFeedback.findFirst({
    where: { id, status: "IN_VOTING", votingOpenedAt: { not: null } },
  });
  if (!fb) return res.status(404).json({ error: "Pomysł nie jest dostępny do głosowania" });

  const existing = await prisma.salonFeedbackVote.findUnique({
    where: { feedbackId_salonId: { feedbackId: id, salonId } },
  });

  if (existing) {
    await prisma.salonFeedbackVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.salonFeedbackVote.create({
      data: { feedbackId: id, salonId },
    });
  }

  const voteCount = await prisma.salonFeedbackVote.count({ where: { feedbackId: id } });
  return res.json({ ok: true, voted: !existing, voteCount });
});

export default router;
