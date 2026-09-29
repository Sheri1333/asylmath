import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { connectDb, closeDb, courses, users, type CourseDoc, type UserDoc } from "./db.js";

const sampleCourses: Omit<CourseDoc, "_id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Алгебра: с нуля до уверенности",
    slug: "algebra-basics",
    subject: "Алгебра",
    level: "beginner",
    description:
      "Линейные уравнения, дроби, степени и практические задачи. Подходит для школьников и абитуриентов.",
    coverColor: "#0f766e",
    isFree: true,
    priceTenge: null,
    published: true,
    lessons: [
      {
        id: randomUUID(),
        title: "Числа и выражения",
        summary: "Что такое переменная и как читать алгебраическое выражение.",
        content:
          "## Числа и выражения\n\nАлгебра начинается с умения записывать величины буквами.\n\n**Пример.** Если билет стоит `x` тенге, а вы купили 3 билета, сумма равна `3x`.\n\n### Практика\n1. Запишите выражение: число на 5 больше, чем `a`.\n2. Упростите: `2a + 3a`.",
        durationMinutes: 15,
        order: 1,
      },
      {
        id: randomUUID(),
        title: "Линейные уравнения",
        summary: "Решаем уравнения вида ax + b = c.",
        content:
          "## Линейные уравнения\n\nЦель — найти неизвестное `x`.\n\n**Правило.** Можно прибавлять/вычитать одно и то же к обеим частям, а также умножать/делить (кроме нуля).\n\n**Пример.** `2x + 4 = 10` → `2x = 6` → `x = 3`.",
        durationMinutes: 20,
        order: 2,
      },
      {
        id: randomUUID(),
        title: "Дроби и пропорции",
        summary: "Сложение дробей и решение пропорций.",
        content:
          "## Дроби и пропорции\n\nПропорция: `a/b = c/d` тогда и только тогда, когда `a·d = b·c`.\n\nИспользуйте это, чтобы находить неизвестный член.",
        durationMinutes: 25,
        order: 3,
      },
    ],
  },
  {
    title: "Геометрия на плоскости",
    slug: "plane-geometry",
    subject: "Геометрия",
    level: "intermediate",
    description:
      "Углы, треугольники, площади и теорема Пифагора — с наглядными примерами.",
    coverColor: "#1d4ed8",
    isFree: true,
    priceTenge: null,
    published: true,
    lessons: [
      {
        id: randomUUID(),
        title: "Углы и параллельные прямые",
        summary: "Смежные, вертикальные и соответственные углы.",
        content:
          "## Углы\n\nСмежные углы в сумме дают 180°. Вертикальные углы равны.\n\nПри параллельных прямых соответственные углы равны.",
        durationMinutes: 18,
        order: 1,
      },
      {
        id: randomUUID(),
        title: "Треугольники",
        summary: "Сумма углов, виды треугольников, признаки равенства.",
        content:
          "## Треугольники\n\nСумма углов треугольника — 180°.\n\nПризнаки равенства: SSS, SAS, ASA.",
        durationMinutes: 22,
        order: 2,
      },
      {
        id: randomUUID(),
        title: "Теорема Пифагора",
        summary: "a² + b² = c² и её применение.",
        content:
          "## Теорема Пифагора\n\nВ прямоугольном треугольнике квадрат гипотенузы равен сумме квадратов катетов.\n\n**Пример.** Катеты 3 и 4 → гипотенуза 5.",
        durationMinutes: 20,
        order: 3,
      },
    ],
  },
  {
    title: "Математический анализ: введение",
    slug: "calculus-intro",
    subject: "Анализ",
    level: "advanced",
    description:
      "Пределы, производная и интеграл — интуитивно и с формулами. Для старших классов и первого курса.",
    coverColor: "#b45309",
    isFree: false,
    priceTenge: 2990,
    published: true,
    lessons: [
      {
        id: randomUUID(),
        title: "Что такое предел",
        summary: "Идея приближения к значению.",
        content:
          "## Предел\n\nГоворим, что `lim x→a f(x) = L`, если значения функции приближаются к `L`, когда `x` приближается к `a`.",
        durationMinutes: 25,
        order: 1,
      },
      {
        id: randomUUID(),
        title: "Производная как скорость изменения",
        summary: "Геометрический и физический смысл.",
        content:
          "## Производная\n\nПроизводная `f'(x)` — мгновенная скорость изменения.\n\nГеометрически это наклон касательной.",
        durationMinutes: 30,
        order: 2,
      },
    ],
  },
];

async function main() {
  await connectDb();

  const adminEmail = "admin@aslmath.kz";
  const existingAdmin = await users().findOne({ email: adminEmail });
  if (!existingAdmin) {
    await users().insertOne({
      email: adminEmail,
      passwordHash: bcrypt.hashSync("admin123", 10),
      name: "AslMath Admin",
      role: "admin",
      createdAt: new Date(),
    } as UserDoc);
    console.log("Created admin: admin@aslmath.kz / admin123");
  } else {
    console.log("Admin already exists");
  }

  const count = await courses().countDocuments();
  if (count === 0) {
    const now = new Date();
    for (const course of sampleCourses) {
      await courses().insertOne({
        ...course,
        _id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`Seeded ${sampleCourses.length} courses`);
  } else {
    console.log(`Courses already present (${count}), skip seed courses`);
  }

  await closeDb();
  console.log("Seed done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
