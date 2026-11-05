import { randomUUID } from "node:crypto";
import type { ExamDoc, ExamQuestionDoc, QuestionLevel } from "./db.js";

const levels: QuestionLevel[] = ["easy", "mid", "hard"];
const str = (v: unknown, max = 20000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const id = (v: unknown) => {
  const s = str(v, 80);
  return /^[\w-]{1,80}$/.test(s) ? s : randomUUID();
};

/** Sorted unique in-range choice indexes from a number, an array, or junk. */
export function normalizePick(raw: unknown, count: number): number[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const out = new Set<number>();
  for (const v of list) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n < count) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Correct choices of a question; old docs only have `answer`. */
export function answersOf(q: Pick<ExamQuestionDoc, "answer" | "answers" | "choices">): number[] {
  const list = normalizePick(q.answers?.length ? q.answers : q.answer, q.choices.length);
  return list.length ? list : [0];
}

/** Exact match: every correct choice picked and nothing else. */
export function pickCorrect(q: Pick<ExamQuestionDoc, "answer" | "answers" | "choices">, pick: unknown): boolean {
  const want = answersOf(q);
  const got = normalizePick(pick, q.choices.length);
  return got.length === want.length && got.every((v, i) => v === want[i]);
}

function cleanQuestion(q: unknown, n: number): ExamQuestionDoc {
  const o = (q ?? {}) as Record<string, unknown>;
  const prompt = str(o.prompt, 8000);
  const choices = (Array.isArray(o.choices) ? o.choices : []).map((c) => str(c, 2000)).filter(Boolean);
  if (!prompt) throw new Error(`Вопрос ${n}: нужен текст`);
  if (choices.length < 2) throw new Error(`Вопрос ${n}: минимум 2 варианта ответа`);
  const answers = normalizePick(Array.isArray(o.answers) && o.answers.length ? o.answers : o.answer, choices.length);
  if (answers.length === 0) answers.push(0);
  return {
    id: id(o.id),
    prompt,
    description: str(o.description, 4000),
    imageUrl: str(o.imageUrl, 1000) || undefined,
    choices,
    answer: answers[0],
    answers,
    explanation: str(o.explanation, 20000),
    reviewVideoUrl: str(o.reviewVideoUrl, 1000),
    level: levels.includes(o.level as QuestionLevel) ? (o.level as QuestionLevel) : "mid",
  };
}

/** YYYY-MM-DD only. */
export function cleanExamDate(raw: unknown): string {
  const s = str(raw, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Укажите дату теста (ГГГГ-ММ-ДД)");
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Некорректная дата теста");
  return s;
}

export function examInput(body: Record<string, unknown>) {
  const title = str(body.title, 300);
  if (!title) throw new Error("Укажите название теста");
  const questions = (Array.isArray(body.questions) ? body.questions : []).map((q, i) => cleanQuestion(q, i + 1));
  return {
    title,
    date: cleanExamDate(body.date),
    description: str(body.description, 4000),
    passPercent: num(body.passPercent, 70, 1, 100),
    timeLimitMinutes: num(body.timeLimitMinutes, 40, 0, 300),
    published: Boolean(body.published),
    reviewVideoUrl: str(body.reviewVideoUrl, 1000),
    questions,
  };
}

export function publicExam(doc: ExamDoc) {
  return {
    id: doc._id,
    title: doc.title,
    date: doc.date,
    description: doc.description,
    passPercent: doc.passPercent,
    timeLimitMinutes: doc.timeLimitMinutes,
    published: doc.published,
    reviewVideoUrl: doc.reviewVideoUrl,
    questionCount: doc.questions.length,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function publicExamQuestions(doc: ExamDoc) {
  return doc.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    description: q.description,
    imageUrl: q.imageUrl ?? "",
    choices: q.choices,
    level: q.level,
    /** How many choices are correct, so the page lets the student tick that many. */
    multi: answersOf(q).length > 1,
  }));
}

export function fullExam(doc: ExamDoc) {
  return {
    ...publicExam(doc),
    questions: doc.questions.map((q) => ({
      ...q,
      imageUrl: q.imageUrl ?? "",
      reviewVideoUrl: q.reviewVideoUrl ?? "",
      answers: answersOf(q),
    })),
  };
}

/** Review payload after submit: per-question video, with exam-level fallback. */
export function examReview(doc: ExamDoc, picks: Array<number | number[]>) {
  const fallback = doc.reviewVideoUrl || "";
  return doc.questions.map((q, i) => {
    const chosen = normalizePick(picks[i], q.choices.length);
    const answers = answersOf(q);
    return {
      id: q.id,
      pick: chosen[0] ?? -1,
      picks: chosen,
      answer: answers[0],
      answers,
      correct: pickCorrect(q, chosen),
      explanation: q.explanation,
      reviewVideoUrl: (q.reviewVideoUrl || fallback || null) as string | null,
    };
  });
}
