import { courses, type LessonDoc, type QuizDoc, type SectionDoc } from "./db.js";

/** Canonical ҰБТ block titles, index 0…12. */
export const PROGRAM_TITLES = [
  "Негіздер (арифметика, бөлшек, пайыз)",
  "Дәрежелер, түбірлер, алгебралық өрнектер",
  "Сызықтық және квадрат теңдеулер, теңсіздіктер, жүйелер",
  "Тізбектер және прогрессиялар",
  "Функциялар және графиктер",
  "Тригонометрия",
  "Иррационал теңдеулер мен теңсіздіктер",
  "Көрсеткіштік және логарифмдік",
  "Туынды және оның қолданылуы",
  "Алғашқы функция және интеграл",
  "Планиметрия",
  "Стереометрия",
  "Кеңістіктегі векторлар мен координаталар",
] as const;

const PRICE_TENGE = 20_000;
const QUIZ_MINUTES = 20;
const PASS = 70;

/** Strip hand-typed list prefixes like "1. " so the UI number is not doubled. */
function cleanLessonTitle(title: string): string {
  return title.replace(/^\d+\.\s+/, "").trim() || title;
}

function normalizeQuiz(quiz: QuizDoc | undefined): QuizDoc {
  const q = quiz ?? { passPercent: PASS, timeLimitMinutes: QUIZ_MINUTES, questions: [] };
  return {
    ...q,
    passPercent: PASS,
    timeLimitMinutes: q.questions.length > 0 ? QUIZ_MINUTES : q.timeLimitMinutes || QUIZ_MINUTES,
  };
}

function touchSections(sections: SectionDoc[]): { sections: SectionDoc[]; changed: boolean } {
  let changed = false;
  const next = sections.map((s, i) => {
    let section = s;
    const title = PROGRAM_TITLES[i];
    if (title && section.title !== title) {
      section = { ...section, title };
      changed = true;
    }
    const quiz = normalizeQuiz(section.quiz);
    if (quiz.passPercent !== section.quiz?.passPercent || quiz.timeLimitMinutes !== section.quiz?.timeLimitMinutes) {
      section = { ...section, quiz };
      changed = true;
    }
    const lessons = section.lessons.map((l: LessonDoc) => {
      let lesson = l;
      const cleaned = cleanLessonTitle(l.title);
      if (cleaned !== l.title) {
        lesson = { ...lesson, title: cleaned };
        changed = true;
      }
      const lq = normalizeQuiz(lesson.quiz);
      if (
        lq.passPercent !== lesson.quiz?.passPercent ||
        (lesson.quiz && lesson.quiz.questions.length > 0 && lq.timeLimitMinutes !== lesson.quiz.timeLimitMinutes)
      ) {
        lesson = { ...lesson, quiz: lq };
        changed = true;
      }
      return lesson;
    });
    if (lessons.some((l, j) => l !== section.lessons[j])) {
      section = { ...section, lessons };
    }
    return section;
  });
  return { sections: next, changed };
}

/** Align live course titles, quiz timing, price, and sequential lock with product rules. */
export async function syncProgramTitles(): Promise<void> {
  const rows = await courses()
    .find({ published: true, "sections.0": { $exists: true } })
    .project({ sections: 1, title: 1, priceTenge: 1, sequential: 1, featured: 1 })
    .toArray();

  for (const row of rows) {
    if (!row.sections?.length) continue;
    const { sections, changed: sectionChanged } = touchSections(row.sections);
    const patch: Record<string, unknown> = {};
    if (sectionChanged) patch.sections = sections;
    if (row.featured && row.priceTenge !== PRICE_TENGE) patch.priceTenge = PRICE_TENGE;
    if (row.sequential !== true) patch.sequential = true;
    if (Object.keys(patch).length === 0) continue;
    patch.updatedAt = new Date();
    await courses().updateOne({ _id: row._id }, { $set: patch });
    console.log(`Synced course defaults for ${row.title}`);
  }
}
