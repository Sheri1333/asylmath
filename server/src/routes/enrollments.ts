import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  courses,
  enrollments,
  publicCourse,
  toObjectId,
  type EnrollmentDoc,
} from "../db.js";
import { authRequired, type AuthedRequest } from "../auth.js";

export const enrollmentsRouter = Router();

enrollmentsRouter.get("/me", authRequired, async (req: AuthedRequest, res) => {
  const oid = toObjectId(req.user!.id);
  if (!oid) {
    res.status(401).json({ error: "Недействительный пользователь" });
    return;
  }

  const mine = await enrollments()
    .find({ userId: oid })
    .sort({ lastAccessedAt: -1 })
    .toArray();

  const courseIds = mine.map((e) => e.courseId);
  const courseRows = await courses()
    .find({ _id: { $in: courseIds } })
    .toArray();
  const byId = new Map(courseRows.map((c) => [c._id, c]));

  res.json({
    enrollments: mine
      .map((e) => {
        const course = byId.get(e.courseId);
        if (!course) return null;
        const lessonCount = course.lessons.length;
        return {
          courseId: e.courseId,
          enrolledAt: e.enrolledAt.toISOString(),
          lastAccessedAt: e.lastAccessedAt.toISOString(),
          completedLessonIds: e.completedLessonIds,
          progressPercent:
            lessonCount === 0
              ? 0
              : Math.round((e.completedLessonIds.length / lessonCount) * 100),
          course: publicCourse(course),
        };
      })
      .filter(Boolean),
  });
});

enrollmentsRouter.post(
  "/:courseId",
  authRequired,
  async (req: AuthedRequest, res) => {
    const courseId = String(req.params.courseId);
    const oid = toObjectId(req.user!.id);
    if (!oid) {
      res.status(401).json({ error: "Недействительный пользователь" });
      return;
    }

    const course = await courses().findOne({ _id: courseId, published: true });
    if (!course) {
      res.status(404).json({ error: "Курс не найден" });
      return;
    }

    const existing = await enrollments().findOne({
      userId: oid,
      courseId,
    });
    if (existing) {
      res.json({
        ok: true,
        alreadyEnrolled: true,
        enrollment: {
          courseId,
          completedLessonIds: existing.completedLessonIds,
          enrolledAt: existing.enrolledAt.toISOString(),
        },
      });
      return;
    }

    const now = new Date();
    const doc: EnrollmentDoc = {
      _id: new ObjectId(),
      userId: oid,
      courseId,
      completedLessonIds: [],
      enrolledAt: now,
      lastAccessedAt: now,
    };
    await enrollments().insertOne(doc);

    res.status(201).json({
      ok: true,
      alreadyEnrolled: false,
      enrollment: {
        courseId,
        completedLessonIds: [],
        enrolledAt: now.toISOString(),
      },
    });
  },
);

enrollmentsRouter.post(
  "/:courseId/lessons/:lessonId/complete",
  authRequired,
  async (req: AuthedRequest, res) => {
    const courseId = String(req.params.courseId);
    const lessonId = String(req.params.lessonId);
    const oid = toObjectId(req.user!.id);
    if (!oid) {
      res.status(401).json({ error: "Недействительный пользователь" });
      return;
    }

    const course = await courses().findOne({ _id: courseId });
    if (!course) {
      res.status(404).json({ error: "Курс не найден" });
      return;
    }
    if (!course.lessons.some((l) => l.id === lessonId)) {
      res.status(404).json({ error: "Урок не найден" });
      return;
    }

    const enr = await enrollments().findOne({ userId: oid, courseId });
    if (!enr) {
      res.status(403).json({ error: "Сначала запишитесь на курс" });
      return;
    }

    const completed = new Set(enr.completedLessonIds);
    completed.add(lessonId);
    const completedLessonIds = [...completed];

    await enrollments().updateOne(
      { _id: enr._id },
      {
        $set: {
          completedLessonIds,
          lastAccessedAt: new Date(),
        },
      },
    );

    res.json({
      ok: true,
      completedLessonIds,
      progressPercent:
        course.lessons.length === 0
          ? 0
          : Math.round((completedLessonIds.length / course.lessons.length) * 100),
    });
  },
);
