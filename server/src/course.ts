import { randomUUID } from "node:crypto";
import type {
  CourseDoc,
  EnrollmentDoc,
  LessonDoc,
  MaterialDoc,
  QuestionDoc,
  QuestionLevel,
  QuizDoc,
  SectionDoc,
} from "./db.js";

export const emptyQuiz = (): QuizDoc => ({ passPercent: 70, timeLimitMinutes: 20, questions: [] });

/** Sections in order, lessons in order. Courses saved before sections existed read as one section. */
export function courseSections(doc: CourseDoc): SectionDoc[] {
  const raw: SectionDoc[] =
    doc.sections && doc.sections.length > 0
      ? doc.sections
      : doc.lessons && doc.lessons.length > 0
        ? [{ id: "main", title: "Сабақтар", description: "", order: 1, lessons: doc.lessons, quiz: emptyQuiz() }]
        : [];
  return [...raw]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      ...s,
      quiz: s.quiz ?? emptyQuiz(),
      lessons: [...(s.lessons ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({ ...l, quiz: l.quiz ?? emptyQuiz() })),
    }));
}

export function flatLessons(doc: CourseDoc) {
  return courseSections(doc).flatMap((s, si) =>
    s.lessons.map((l) => ({ ...l, sectionId: s.id, sectionIndex: si })),
  );
}

export function isActive(enr: EnrollmentDoc | null | undefined): boolean {
  return Boolean(enr) && (enr!.status ?? "active") === "active";
}

/** Full access to every lesson and test (sequencing still applies). */
export function hasAccess(doc: CourseDoc, enr: EnrollmentDoc | null, isAdmin: boolean): boolean {
  return isAdmin || isActive(enr);
}

/** A section is open when sequencing is off, it is the first one, or the test before it is passed. */
export function sectionOpen(
  sections: SectionDoc[],
  index: number,
  doc: CourseDoc,
  enr: EnrollmentDoc | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin || !doc.sequential || index <= 0) return true;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = sections[i];
    if (prev.quiz.questions.length === 0) continue;
    return Boolean(enr?.quizResults?.[prev.id]?.passed);
  }
  return true;
}

export function progressPercent(doc: CourseDoc, enr: EnrollmentDoc | null): number {
  const lessons = flatLessons(doc);
  if (!enr || lessons.length === 0) return 0;
  const done = new Set(enr.completedLessonIds);
  return Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100);
}

export function publicCourse(doc: CourseDoc) {
  const sections = courseSections(doc);
  const lessons = sections.flatMap((s) => s.lessons);
  return {
    id: doc._id,
    title: doc.title,
    slug: doc.slug,
    subject: doc.subject,
    level: doc.level,
    description: doc.description,
    coverColor: doc.coverColor,
    isFree: doc.isFree,
    priceTenge: doc.priceTenge,
    published: doc.published,
    featured: Boolean(doc.featured),
    sequential: Boolean(doc.sequential),
    paymentNote: doc.paymentNote ?? "",
    paymentUrl: doc.paymentUrl ?? "",
    sectionCount: sections.length,
    lessonCount: lessons.length,
    quizCount: sections.reduce(
      (n, s) =>
        n +
        (s.quiz.questions.length > 0 ? 1 : 0) +
        s.lessons.filter((l) => (l.quiz?.questions.length ?? 0) > 0).length,
      0,
    ),
    durationMinutes: lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function enrollmentView(doc: CourseDoc, enr: EnrollmentDoc | null) {
  if (!enr) return null;
  return {
    status: enr.status ?? "active",
    completedLessonIds: enr.completedLessonIds,
    progressPercent: progressPercent(doc, enr),
    enrolledAt: enr.enrolledAt.toISOString(),
    activatedAt: enr.activatedAt?.toISOString() ?? null,
    lastAccessedAt: enr.lastAccessedAt.toISOString(),
    quizResults: Object.fromEntries(
      Object.entries(enr.quizResults ?? {}).map(([k, r]) => [
        k,
        { best: r.best, last: r.last, total: r.total, passed: r.passed, attempts: r.attempts, updatedAt: r.updatedAt.toISOString() },
      ]),
    ),
  };
}

/** Course map for the student: what exists, what is done, what is locked. No lesson bodies, no answers. */
export function courseOutline(doc: CourseDoc, enr: EnrollmentDoc | null, isAdmin: boolean) {
  const sections = courseSections(doc);
  const access = hasAccess(doc, enr, isAdmin);
  const done = new Set(enr?.completedLessonIds ?? []);
  return sections.map((s, i) => {
    const open = access && sectionOpen(sections, i, doc, enr, isAdmin);
    const result = enr?.quizResults?.[s.id];
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      order: i + 1,
      open,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        durationMinutes: l.durationMinutes,
        isPreview: Boolean(l.isPreview),
        hasVideo: Boolean(l.videoUrl),
        materialCount: l.materials?.length ?? 0,
        completed: done.has(l.id),
        locked: !(open || l.isPreview),
        quiz: quizOutline(l.quiz ?? emptyQuiz(), !(open || l.isPreview), enr?.quizResults?.[l.id]),
      })),
      quiz: quizOutline(s.quiz, !open, result),
    };
  });
}

function quizOutline(quiz: QuizDoc, locked: boolean, result: { best: number; last: number; total: number; passed: boolean; attempts: number } | undefined) {
  if (quiz.questions.length === 0) return null;
  return {
    questionCount: quiz.questions.length,
    passPercent: quiz.passPercent,
    timeLimitMinutes: quiz.timeLimitMinutes,
    locked,
    result: result
      ? { best: result.best, last: result.last, total: result.total, passed: result.passed, attempts: result.attempts }
      : null,
  };
}

/** Questions for taking a test: no answers, no explanations. */
export function publicQuiz(quiz: QuizDoc) {
  return {
    passPercent: quiz.passPercent,
    timeLimitMinutes: quiz.timeLimitMinutes,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      formula: q.formula ?? "",
      choices: q.choices,
      level: q.level,
    })),
  };
}

// ── Admin input ─────────────────────────────────────────────────────────────

const str = (v: unknown, max = 20000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const id = (v: unknown) => {
  const s = str(v, 80);
  return /^[\w-]{1,80}$/.test(s) ? s : randomUUID();
};

function cleanMaterial(m: unknown): MaterialDoc | null {
  const o = (m ?? {}) as Record<string, unknown>;
  const url = str(o.url, 1000);
  if (!url) return null;
  return { id: id(o.id), name: str(o.name, 200) || "Файл", url, size: num(o.size, 0, 0, 1e10) };
}

function cleanLesson(l: unknown, order: number): LessonDoc {
  const o = (l ?? {}) as Record<string, unknown>;
  const title = str(o.title, 300);
  if (!title) throw new Error(`Урок ${order}: нужен заголовок`);
  return {
    id: id(o.id),
    title,
    summary: str(o.summary, 1000),
    content: str(o.content, 100000),
    videoUrl: str(o.videoUrl, 1000) || undefined,
    durationMinutes: num(o.durationMinutes, 10, 0, 600),
    order,
    isPreview: Boolean(o.isPreview),
    materials: (Array.isArray(o.materials) ? o.materials : []).map(cleanMaterial).filter((x): x is MaterialDoc => x !== null),
    quiz: cleanQuiz(o.quiz, `урок «${title}»`, 10),
  };
}

function cleanQuiz(raw: unknown, label: string, defaultMinutes: number): QuizDoc {
  const quiz = (raw ?? {}) as Record<string, unknown>;
  return {
    passPercent: num(quiz.passPercent, 70, 1, 100),
    timeLimitMinutes: num(quiz.timeLimitMinutes, defaultMinutes, 0, 300),
    questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((q, j) => cleanQuestion(q, j + 1, label)),
  };
}

const levels: QuestionLevel[] = ["easy", "mid", "hard"];

function cleanQuestion(q: unknown, n: number, section: string): QuestionDoc {
  const o = (q ?? {}) as Record<string, unknown>;
  const prompt = str(o.prompt, 4000);
  const choices = (Array.isArray(o.choices) ? o.choices : []).map((c) => str(c, 500)).filter(Boolean);
  if (!prompt) throw new Error(`«${section}», вопрос ${n}: нужен текст вопроса`);
  if (choices.length < 2) throw new Error(`«${section}», вопрос ${n}: нужно минимум 2 варианта ответа`);
  const answer = num(o.answer, 0, 0, choices.length - 1);
  return {
    id: id(o.id),
    prompt,
    formula: str(o.formula, 4000) || undefined,
    choices,
    answer,
    explanation: str(o.explanation, 4000),
    level: levels.includes(o.level as QuestionLevel) ? (o.level as QuestionLevel) : "mid",
  };
}

export function cleanSections(input: unknown): SectionDoc[] {
  const list = Array.isArray(input) ? input : [];
  return list.map((s, i) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const title = str(o.title, 300);
    if (!title) throw new Error(`Раздел ${i + 1}: нужно название`);
    return {
      id: id(o.id),
      title,
      description: str(o.description, 2000),
      order: i + 1,
      lessons: (Array.isArray(o.lessons) ? o.lessons : []).map((l, j) => cleanLesson(l, j + 1)),
      quiz: cleanQuiz(o.quiz, `«${title}»`, 20),
    };
  });
}
