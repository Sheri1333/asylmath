import { Router } from "express";
import { courses, enrollments, publicCourse, toObjectId } from "../db.js";
import { optionalAuth, authRequired, type AuthedRequest } from "../auth.js";

export const coursesRouter = Router();

coursesRouter.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  const subject =
    typeof req.query.subject === "string" ? req.query.subject.trim() : "";
  const filter: Record<string, unknown> = { published: true };
  if (subject) filter.subject = subject;

  const rows = await courses().find(filter).sort({ updatedAt: -1 }).toArray();
  let enrolledIds = new Set<string>();

  if (req.user) {
    const oid = toObjectId(req.user.id);
    if (oid) {
      const mine = await enrollments().find({ userId: oid }).toArray();
      enrolledIds = new Set(mine.map((e) => e.courseId));
    }
  }

  res.json({
    courses: rows.map((row) => ({
      ...publicCourse(row),
      enrolled: enrolledIds.has(row._id),
    })),
  });
});

coursesRouter.get("/:idOrSlug", optionalAuth, async (req: AuthedRequest, res) => {
  const key = String(req.params.idOrSlug);
  const row =
    (await courses().findOne({ _id: key })) ??
    (await courses().findOne({ slug: key }));

  if (!row || (!row.published && req.user?.role !== "admin")) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }

  let enrollment = null;
  if (req.user) {
    const oid = toObjectId(req.user.id);
    if (oid) {
      const enr = await enrollments().findOne({
        userId: oid,
        courseId: row._id,
      });
      if (enr) {
        enrollment = {
          completedLessonIds: enr.completedLessonIds,
          enrolledAt: enr.enrolledAt.toISOString(),
          lastAccessedAt: enr.lastAccessedAt.toISOString(),
          progressPercent:
            row.lessons.length === 0
              ? 0
              : Math.round(
                  (enr.completedLessonIds.length / row.lessons.length) * 100,
                ),
        };
      }
    }
  }

  res.json({
    course: publicCourse(row, { includeLessons: true }),
    enrollment,
  });
});

coursesRouter.get(
  "/:idOrSlug/lessons/:lessonId",
  authRequired,
  async (req: AuthedRequest, res) => {
    const key = String(req.params.idOrSlug);
    const lessonId = String(req.params.lessonId);
    const row =
      (await courses().findOne({ _id: key })) ??
      (await courses().findOne({ slug: key }));

    if (!row || (!row.published && req.user?.role !== "admin")) {
      res.status(404).json({ error: "Курс не найден" });
      return;
    }

    const oid = toObjectId(req.user!.id);
    if (!oid) {
      res.status(401).json({ error: "Недействительный пользователь" });
      return;
    }

    const enr = await enrollments().findOne({
      userId: oid,
      courseId: row._id,
    });
    if (!enr && req.user!.role !== "admin") {
      res.status(403).json({ error: "Сначала запишитесь на курс" });
      return;
    }

    const lesson = row.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      res.status(404).json({ error: "Урок не найден" });
      return;
    }

    if (enr) {
      await enrollments().updateOne(
        { _id: enr._id },
        { $set: { lastAccessedAt: new Date() } },
      );
    }

    const sorted = [...row.lessons].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === lessonId);

    res.json({
      course: {
        id: row._id,
        title: row.title,
        slug: row.slug,
      },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        content: lesson.content,
        videoUrl: lesson.videoUrl ?? null,
        durationMinutes: lesson.durationMinutes,
        order: lesson.order,
        completed: Boolean(enr?.completedLessonIds.includes(lesson.id)),
      },
      navigation: {
        prevLessonId: idx > 0 ? sorted[idx - 1].id : null,
        nextLessonId: idx < sorted.length - 1 ? sorted[idx + 1].id : null,
      },
    });
  },
);
