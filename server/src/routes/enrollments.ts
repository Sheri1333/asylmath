import { Router } from "express";
import { ObjectId } from "mongodb";
import { courses, enrollments, toObjectId, type EnrollmentDoc } from "../db.js";
import { authRequired, type AuthedRequest } from "../auth.js";
import { courseSections, enrollmentView, flatLessons, isActive, publicCourse, sectionOpen } from "../course.js";

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

/** Free courses open at once; paid ones wait for an admin to confirm the Kaspi payment. */
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
  const note = String((req.body as { note?: unknown })?.note ?? "").trim().slice(0, 500);
  const existing = await enrollments().findOne({ userId: oid, courseId });
  if (existing) {
    if (note && !isActive(existing)) await enrollments().updateOne({ _id: existing._id }, { $set: { requestNote: note } });
    res.json({ ok: true, enrollment: enrollmentView(course, existing) });
    return;
  }
  const now = new Date();
  const free = course.isFree || !course.priceTenge;
  const doc: EnrollmentDoc = {
    _id: new ObjectId(),
    userId: oid,
    courseId,
    status: free ? "active" : "pending",
    completedLessonIds: [],
    quizResults: {},
    requestNote: note || undefined,
    enrolledAt: now,
    activatedAt: free ? now : undefined,
    lastAccessedAt: now,
  };
  await enrollments().insertOne(doc);
  res.status(201).json({ ok: true, enrollment: enrollmentView(course, doc) });
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
  if (!isActive(enr) || !sectionOpen(courseSections(course), lesson.sectionIndex, course, enr, false)) {
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
