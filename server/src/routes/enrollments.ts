import { Router } from "express";
import { ObjectId } from "mongodb";
import { courses, enrollments, toObjectId, type EnrollmentDoc } from "../db.js";
import { authRequired, type AuthedRequest } from "../auth.js";
import { courseSections, enrollmentView, flatLessons, isActive, lessonAccessible, publicCourse } from "../course.js";
import { notifyPayment, refreshPaymentCard } from "../payments.js";

export const enrollmentsRouter = Router();

enrollmentsRouter.get("/me", authRequired, async (req: AuthedRequest, res) => {
  const oid = toObjectId(req.user!.id);
  if (!oid) {
    res.status(401).json({ error: "Пайдаланушы табылмады" });
    return;
  }
  const mine = await enrollments().find({ userId: oid }).sort({ lastAccessedAt: -1 }).toArray();
  const rows = await courses().find({ _id: { $in: mine.map((e) => e.courseId) } }).toArray();
  const byId = new Map(rows.map((c) => [c._id, c]));
  res.json({
    enrollments: mine.flatMap((e) => {
      const course = byId.get(e.courseId);
      if (!course) return [];
      return [{ courseId: e.courseId, course: publicCourse(course), ...enrollmentView(course, e)! }];
    }),
  });
});

/** Pay presses per user per hour, so a loop of reject/retry cannot flood the admin chat. */
const payPresses = new Map<string, number[]>();
function tooManyPresses(userId: string): boolean {
  const now = Date.now();
  const recent = (payPresses.get(userId) ?? []).filter((t) => now - t < 60 * 60_000);
  recent.push(now);
  payPresses.set(userId, recent);
  return recent.length > 20;
}

function payerNameOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 80 ? name : null;
}

/**
 * Free courses open at once. For a paid course the student pays in Kaspi and
 * presses pay: the enrollment turns pending and the admin gets a Telegram card.
 */
enrollmentsRouter.post("/:courseId", authRequired, async (req: AuthedRequest, res) => {
  const courseId = String(req.params.courseId);
  const oid = toObjectId(req.user!.id);
  if (!oid) {
    res.status(401).json({ error: "Пайдаланушы табылмады" });
    return;
  }
  const course = await courses().findOne({ _id: courseId, published: true });
  if (!course) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const body = (req.body ?? {}) as { note?: unknown; payerName?: unknown };
  const free = course.isFree || !course.priceTenge;
  const existing = await enrollments().findOne({ userId: oid, courseId });
  if (existing && (free || isActive(existing))) {
    res.json({ ok: true, enrollment: enrollmentView(course, existing) });
    return;
  }

  const now = new Date();
  if (free) {
    const doc: EnrollmentDoc = {
      _id: new ObjectId(),
      userId: oid,
      courseId,
      status: "active",
      completedLessonIds: [],
      quizResults: {},
      enrolledAt: now,
      activatedAt: now,
      lastAccessedAt: now,
    };
    await enrollments().insertOne(doc);
    res.status(201).json({ ok: true, enrollment: enrollmentView(course, doc) });
    return;
  }

  const payerName = payerNameOf(body.payerName) ?? payerNameOf(body.note) ?? payerNameOf(req.user!.name);
  if (!payerName) {
    res.status(400).json({ error: "Kaspi-де жазатын аты-жөніңізді жазыңыз" });
    return;
  }
  if (tooManyPresses(oid.toHexString())) {
    res.status(429).json({ error: "Тым көп әрекет. Бір сағаттан кейін қайталаңыз." });
    return;
  }

  let doc: EnrollmentDoc | null;
  if (existing?.status === "pending") {
    doc = existing;
    if (existing.payerName !== payerName) {
      doc = await enrollments().findOneAndUpdate(
        { _id: existing._id, status: "pending" },
        { $set: { payerName } },
        { returnDocument: "after" },
      );
      if (doc) await refreshPaymentCard(doc);
    }
  } else if (existing) {
    // A rejected attempt: start a new one with a fresh Telegram card.
    doc = await enrollments().findOneAndUpdate(
      { _id: existing._id, status: { $ne: "active" } },
      {
        $set: { status: "pending", payerName, amountTenge: course.priceTenge!, paidAt: now },
        $unset: { notifiedAt: "", telegramMessages: "", decidedVia: "" },
      },
      { returnDocument: "after" },
    );
  } else {
    doc = {
      _id: new ObjectId(),
      userId: oid,
      courseId,
      status: "pending",
      completedLessonIds: [],
      quizResults: {},
      payerName,
      amountTenge: course.priceTenge!,
      paidAt: now,
      enrolledAt: now,
      lastAccessedAt: now,
    };
    await enrollments().insertOne(doc);
  }
  if (!doc) {
    const fresh = await enrollments().findOne({ userId: oid, courseId });
    res.json({ ok: true, enrollment: enrollmentView(course, fresh) });
    return;
  }
  await notifyPayment(doc._id);
  res.status(existing ? 200 : 201).json({ ok: true, enrollment: enrollmentView(course, doc) });
});

enrollmentsRouter.post("/:courseId/lessons/:lessonId/complete", authRequired, async (req: AuthedRequest, res) => {
  const courseId = String(req.params.courseId);
  const lessonId = String(req.params.lessonId);
  const oid = toObjectId(req.user!.id);
  if (!oid) {
    res.status(401).json({ error: "Пайдаланушы табылмады" });
    return;
  }
  const course = await courses().findOne({ _id: courseId });
  if (!course) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const lesson = flatLessons(course).find((l) => l.id === lessonId);
  if (!lesson) {
    res.status(404).json({ error: "Сабақ табылмады" });
    return;
  }
  const enr = await enrollments().findOne({ userId: oid, courseId });
  const sections = courseSections(course);
  const lessonIndex = sections[lesson.sectionIndex]?.lessons.findIndex((l) => l.id === lesson.id) ?? -1;
  if (!isActive(enr) || !lessonAccessible(sections, lesson.sectionIndex, lessonIndex, course, enr, false, Boolean(lesson.isPreview))) {
    res.status(403).json({ error: "Сабақ әлі ашылмаған" });
    return;
  }
  await enrollments().updateOne(
    { _id: enr!._id },
    { $addToSet: { completedLessonIds: lessonId }, $set: { lastAccessedAt: new Date() } },
  );
  const fresh = await enrollments().findOne({ _id: enr!._id });
  res.json({ ok: true, enrollment: enrollmentView(course, fresh) });
});
