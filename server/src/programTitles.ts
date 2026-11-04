import { courses } from "./db.js";

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

/** Keep live course section titles aligned with the landing program. */
export async function syncProgramTitles(): Promise<void> {
  const rows = await courses()
    .find({ published: true, "sections.12": { $exists: true } })
    .project({ sections: 1, title: 1 })
    .toArray();

  for (const row of rows) {
    const sections = row.sections;
    if (!sections || sections.length < PROGRAM_TITLES.length) continue;
    let changed = false;
    const next = sections.map((s: (typeof sections)[number], i: number) => {
      const title = PROGRAM_TITLES[i];
      if (!title || s.title === title) return s;
      changed = true;
      return { ...s, title };
    });
    if (!changed) continue;
    await courses().updateOne({ _id: row._id }, { $set: { sections: next, updatedAt: new Date() } });
    console.log(`Synced program titles for course ${row.title}`);
  }
}
