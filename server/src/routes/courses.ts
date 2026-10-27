import { Router } from "express";
import { courses, enrollments, toObjectId, type CourseDoc, type EnrollmentDoc, type QuizDoc, type QuizResultDoc } from "../db.js";
import { optionalAuth, authRequired, type AuthedRequest } from "../auth.js";
import {
  courseOutline,
  courseSections,
  emptyQuiz,
  enrollmentView,
  flatLessons,
  hasAccess,
  isActive,
  publicCourse,
  publicQuiz,
  sectionOpen,
} from "../course.js";

export const coursesRouter = Router();

async function findCourse(key: string, isAdmin: boolean): Promise<CourseDoc | null> {
  const row = (await courses().findOne({ _id: key })) ?? (await courses().findOne({ slug: key }));
  if (!row || (!row.published && !isAdmin)) return null;
  return row;
}

async function myEnrollment(req: AuthedRequest, courseId: string): Promise<EnrollmentDoc | null> {
  if (!req.user) return null;
  const oid = toObjectId(req.user.id);
  return oid ? enrollments().findOne({ userId: oid, courseId }) : null;
}

coursesRouter.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  const rows = await courses().find({ published: true }).sort({ featured: -1, updatedAt: -1 }).toArray();
  const oid = req.user ? toObjectId(req.user.id) : null;
  const mine = oid ? await enrollments().find({ userId: oid }).toArray() : [];
  const byCourse = new Map(mine.map((e) => [e.courseId, e]));
  res.json({
    courses: rows.map((row) => ({
      ...publicCourse(row),
      enrollmentStatus: byCourse.get(row._id) ? (byCourse.get(row._id)!.status ?? "active") : null,
    })),
  });
});

/** The course the cabinet opens: the featured one, else the newest published. */
coursesRouter.get("/featured", async (_req, res) => {
  const row =
    (await courses().findOne({ published: true, featured: true })) ??
    (await courses().find({ published: true }).sort({ updatedAt: -1 }).limit(1).next());
  if (!row) {
    res.status(404).json({ error: "Курс әлі жарияланбаған" });
    return;
  }
  res.json({ slug: row.slug });
});

coursesRouter.get("/:key", optionalAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.user?.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const enr = await myEnrollment(req, row._id);
  res.json({
    course: publicCourse(row),
    outline: courseOutline(row, enr, isAdmin),
    enrollment: enrollmentView(row, enr),
    access: hasAccess(row, enr, isAdmin),
  });
});

coursesRouter.get("/:key/lessons/:lessonId", authRequired, async (req: AuthedRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const sections = courseSections(row);
  const all = flatLessons(row);
  const idx = all.findIndex((l) => l.id === String(req.params.lessonId));
  if (idx === -1) {
    res.status(404).json({ error: "Сабақ табылмады" });
    return;
  }
  const lesson = all[idx];
  const enr = await myEnrollment(req, row._id);
  const open = hasAccess(row, enr, isAdmin) && sectionOpen(sections, lesson.sectionIndex, row, enr, isAdmin);
  if (!open && !lesson.isPreview) {
    res.status(403).json({
      error: hasAccess(row, enr, isAdmin)
        ? "Бұл бөлім алдыңғы бөлімнің тестінен кейін ашылады"
        : "Сабақ курсқа қолжетімділік ашылғаннан кейін көрінеді",
    });
    return;
  }
  if (enr) await enrollments().updateOne({ _id: enr._id }, { $set: { lastAccessedAt: new Date() } });

  const section = sections[lesson.sectionIndex];
  res.json({
    course: publicCourse(row),
    section: { id: section.id, title: section.title, order: lesson.sectionIndex + 1, hasQuiz: section.quiz.questions.length > 0 },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content,
      videoUrl: lesson.videoUrl ?? null,
      practiceVideoUrl: lesson.practiceVideoUrl ?? null,
      durationMinutes: lesson.durationMinutes,
      isPreview: Boolean(lesson.isPreview),
      materials: lesson.materials ?? [],
      completed: Boolean(enr?.completedLessonIds.includes(lesson.id)),
    },
    navigation: {
      prevLessonId: idx > 0 ? all[idx - 1].id : null,
      nextLessonId: idx < all.length - 1 ? all[idx + 1].id : null,
    },
    outline: courseOutline(row, enr, isAdmin),
    enrollment: enrollmentView(row, enr),
  });
});

function quizContext(row: CourseDoc, sectionId: string) {
  const sections = courseSections(row);
  const index = sections.findIndex((s) => s.id === sectionId);
  return { sections, index, section: index === -1 ? null : sections[index] };
}

function grade(quiz: QuizDoc, picksIn: unknown) {
  const picks = quiz.questions.map((_, i) => {
    const v = Array.isArray(picksIn) ? Number(picksIn[i]) : -1;
    return Number.isInteger(v) ? v : -1;
  });
  const total = quiz.questions.length;
  const score = quiz.questions.filter((q, i) => picks[i] === q.answer).length;
  const passed = total > 0 && (score / total) * 100 >= quiz.passPercent;
  return { picks, total, score, passed };
}

function resultView(quiz: QuizDoc, result: QuizResultDoc | undefined) {
  if (!result) return null;
  return {
    best: result.best,
    last: result.last,
    total: result.total,
    passed: result.passed,
    attempts: result.attempts,
    review: quiz.questions.map((q, i) => ({
      id: q.id,
      pick: result.lastPicks?.[i] ?? -1,
      answer: q.answer,
      explanation: q.explanation,
    })),
  };
}

async function saveAttempt(enr: EnrollmentDoc | null, key: string, graded: ReturnType<typeof grade>) {
  if (!enr) return;
  const prev = enr.quizResults?.[key];
  await enrollments().updateOne(
    { _id: enr._id },
    {
      $set: {
        [`quizResults.${key}`]: {
          best: Math.max(prev?.best ?? 0, graded.score),
          last: graded.score,
          total: graded.total,
          passed: Boolean(prev?.passed) || graded.passed,
          attempts: (prev?.attempts ?? 0) + 1,
          lastPicks: graded.picks,
          updatedAt: new Date(),
        },
        lastAccessedAt: new Date(),
      },
    },
  );
}

function lessonOpen(
  row: CourseDoc,
  sections: ReturnType<typeof courseSections>,
  lesson: { sectionIndex: number; isPreview?: boolean },
  enr: EnrollmentDoc | null,
  isAdmin: boolean,
) {
  return (hasAccess(row, enr, isAdmin) && sectionOpen(sections, lesson.sectionIndex, row, enr, isAdmin)) || Boolean(lesson.isPreview);
}

coursesRouter.get("/:key/sections/:sectionId/quiz", authRequired, async (req: AuthedRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const { sections, index, section } = quizContext(row, String(req.params.sectionId));
  if (!section || section.quiz.questions.length === 0) {
    res.status(404).json({ error: "Бұл бөлімде тест жоқ" });
    return;
  }
  const enr = await myEnrollment(req, row._id);
  if (!hasAccess(row, enr, isAdmin)) {
    res.status(403).json({ error: "Тест курсқа қолжетімділік ашылғаннан кейін көрінеді" });
    return;
  }
  if (!sectionOpen(sections, index, row, enr, isAdmin)) {
    res.status(403).json({ error: "Алдымен алдыңғы бөлімнің тестін тапсырыңыз" });
    return;
  }
  res.json({
    course: publicCourse(row),
    scope: "section",
    section: { id: section.id, title: section.title, order: index + 1 },
    lesson: null,
    nextSection: sections[index + 1] ? { id: sections[index + 1].id, title: sections[index + 1].title } : null,
    nextLessonId: null,
    quiz: publicQuiz(section.quiz),
    result: resultView(section.quiz, enr?.quizResults?.[section.id]),
  });
});

coursesRouter.post("/:key/sections/:sectionId/quiz", authRequired, async (req: AuthedRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const { sections, index, section } = quizContext(row, String(req.params.sectionId));
  if (!section || section.quiz.questions.length === 0) {
    res.status(404).json({ error: "Бұл бөлімде тест жоқ" });
    return;
  }
  const enr = await myEnrollment(req, row._id);
  if (!isAdmin && (!isActive(enr) || !sectionOpen(sections, index, row, enr, false))) {
    res.status(403).json({ error: "Тест әлі ашылмаған" });
    return;
  }
  const graded = grade(section.quiz, (req.body as { picks?: unknown })?.picks);
  await saveAttempt(enr, section.id, graded);
  res.json({
    score: graded.score,
    total: graded.total,
    passed: graded.passed,
    passPercent: section.quiz.passPercent,
    review: section.quiz.questions.map((q, i) => ({ id: q.id, pick: graded.picks[i], answer: q.answer, explanation: q.explanation })),
  });
});

coursesRouter.get("/:key/lessons/:lessonId/quiz", authRequired, async (req: AuthedRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const sections = courseSections(row);
  const all = flatLessons(row);
  const idx = all.findIndex((l) => l.id === String(req.params.lessonId));
  const lesson = idx === -1 ? null : all[idx];
  const quiz = lesson?.quiz ?? emptyQuiz();
  if (!lesson || quiz.questions.length === 0) {
    res.status(404).json({ error: "Бұл сабақта тест жоқ" });
    return;
  }
  const enr = await myEnrollment(req, row._id);
  if (!lessonOpen(row, sections, lesson, enr, isAdmin)) {
    res.status(403).json({ error: "Тест сабақ ашылғаннан кейін көрінеді" });
    return;
  }
  const next = all[idx + 1];
  const nextOpen = next ? lessonOpen(row, sections, next, enr, isAdmin) : false;
  const section = sections[lesson.sectionIndex];
  res.json({
    course: publicCourse(row),
    scope: "lesson",
    section: { id: section.id, title: section.title, order: lesson.sectionIndex + 1 },
    lesson: { id: lesson.id, title: lesson.title },
    nextSection: null,
    nextLessonId: nextOpen ? next!.id : null,
    quiz: publicQuiz(quiz),
    result: resultView(quiz, enr?.quizResults?.[lesson.id]),
  });
});

coursesRouter.post("/:key/lessons/:lessonId/quiz", authRequired, async (req: AuthedRequest, res) => {
  const isAdmin = req.user!.role === "admin";
  const row = await findCourse(String(req.params.key), isAdmin);
  if (!row) {
    res.status(404).json({ error: "Курс табылмады" });
    return;
  }
  const sections = courseSections(row);
  const lesson = flatLessons(row).find((l) => l.id === String(req.params.lessonId));
  const quiz = lesson?.quiz ?? emptyQuiz();
  if (!lesson || quiz.questions.length === 0) {
    res.status(404).json({ error: "Бұл сабақта тест жоқ" });
    return;
  }
  const enr = await myEnrollment(req, row._id);
  if (!lessonOpen(row, sections, lesson, enr, isAdmin)) {
    res.status(403).json({ error: "Тест әлі ашылмаған" });
    return;
  }
  if (!isAdmin && !isActive(enr) && !lesson.isPreview) {
    res.status(403).json({ error: "Тест әлі ашылмаған" });
    return;
  }
  const graded = grade(quiz, (req.body as { picks?: unknown })?.picks);
  await saveAttempt(enr, lesson.id, graded);
  res.json({
    score: graded.score,
    total: graded.total,
    passed: graded.passed,
    passPercent: quiz.passPercent,
    review: quiz.questions.map((q, i) => ({ id: q.id, pick: graded.picks[i], answer: q.answer, explanation: q.explanation })),
  });
});
