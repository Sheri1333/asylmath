import { Router } from "express";
import { ObjectId } from "mongodb";
import { examAttempts, exams, toObjectId, type ExamAttemptDoc, type ExamDoc, type QuizDoc } from "../db.js";
import { authRequired, type AuthedRequest } from "../auth.js";
import { fullExam, publicExam, publicExamQuestions } from "../exam.js";

export const examsRouter = Router();

function grade(questions: ExamDoc["questions"], picksIn: unknown) {
  const picks = questions.map((_, i) => {
    const v = Array.isArray(picksIn) ? Number(picksIn[i]) : -1;
    return Number.isInteger(v) ? v : -1;
  });
  const total = questions.length;
  const score = questions.filter((q, i) => picks[i] === q.answer).length;
  return { picks, total, score };
}

function attemptView(attempt: ExamAttemptDoc | null, quiz: Pick<QuizDoc, "passPercent"> | ExamDoc) {
  if (!attempt) return null;
  const passPercent = "passPercent" in quiz ? quiz.passPercent : 70;
  return {
    best: attempt.best,
    last: attempt.last,
    total: attempt.total,
    passed: attempt.passed,
    attempts: attempt.attempts,
    passPercent,
    updatedAt: attempt.updatedAt.toISOString(),
  };
}

examsRouter.get("/", authRequired, async (req: AuthedRequest, res) => {
  const oid = toObjectId(req.user!.id);
  const rows = await exams().find({ published: true }).sort({ date: -1, updatedAt: -1 }).toArray();
  const mine = oid
    ? await examAttempts().find({ userId: oid, examId: { $in: rows.map((r) => r._id) } }).toArray()
    : [];
  const byExam = new Map(mine.map((a) => [a.examId, a]));
  res.json({
    exams: rows.map((row) => ({
      ...publicExam(row),
      result: attemptView(byExam.get(row._id) ?? null, row),
    })),
  });
});

examsRouter.get("/:id", authRequired, async (req: AuthedRequest, res) => {
  const row = await exams().findOne({ _id: String(req.params.id), published: true });
  if (!row) {
    res.status(404).json({ error: "Тест табылмады" });
    return;
  }
  if (row.questions.length === 0) {
    res.status(404).json({ error: "Тестте сұрақ жоқ" });
    return;
  }
  const oid = toObjectId(req.user!.id);
  const attempt = oid ? await examAttempts().findOne({ examId: row._id, userId: oid }) : null;
  const result = attempt
    ? {
        ...attemptView(attempt, row)!,
        review: row.questions.map((q, i) => ({
          id: q.id,
          pick: attempt.lastPicks?.[i] ?? -1,
          answer: q.answer,
          explanation: q.explanation,
        })),
        reviewVideoUrl: row.reviewVideoUrl || null,
      }
    : null;
  res.json({
    exam: publicExam(row),
    quiz: {
      passPercent: row.passPercent,
      timeLimitMinutes: row.timeLimitMinutes,
      questions: publicExamQuestions(row),
    },
    result,
  });
});

examsRouter.post("/:id", authRequired, async (req: AuthedRequest, res) => {
  const row = await exams().findOne({ _id: String(req.params.id), published: true });
  if (!row) {
    res.status(404).json({ error: "Тест табылмады" });
    return;
  }
  if (row.questions.length === 0) {
    res.status(400).json({ error: "Тестте сұрақ жоқ" });
    return;
  }
  const oid = toObjectId(req.user!.id);
  if (!oid) {
    res.status(401).json({ error: "Пайдаланушы табылмады" });
    return;
  }
  const graded = grade(row.questions, (req.body as { picks?: unknown })?.picks);
  const passed = graded.total > 0 && (graded.score / graded.total) * 100 >= row.passPercent;
  const prev = await examAttempts().findOne({ examId: row._id, userId: oid });
  const now = new Date();
  const next: Omit<ExamAttemptDoc, "_id"> = {
    examId: row._id,
    userId: oid,
    best: Math.max(prev?.best ?? 0, graded.score),
    last: graded.score,
    total: graded.total,
    passed: Boolean(prev?.passed) || passed,
    attempts: (prev?.attempts ?? 0) + 1,
    lastPicks: graded.picks,
    updatedAt: now,
  };
  if (prev) {
    await examAttempts().updateOne({ _id: prev._id }, { $set: next });
  } else {
    await examAttempts().insertOne({ _id: new ObjectId(), ...next });
  }
  res.json({
    score: graded.score,
    total: graded.total,
    passed,
    passPercent: row.passPercent,
    reviewVideoUrl: row.reviewVideoUrl || null,
    review: row.questions.map((q, i) => ({
      id: q.id,
      pick: graded.picks[i],
      answer: q.answer,
      explanation: q.explanation,
    })),
  });
});

/** Admin helper re-export for full payload shape used by the editor. */
export { fullExam };
