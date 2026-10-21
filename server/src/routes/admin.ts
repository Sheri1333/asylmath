import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  courses,
  enrollments,
  publicCourse,
  toObjectId,
  users,
  type CourseDoc,
  type LessonDoc,
} from "../db.js";
import { adminRequired, type AuthedRequest } from "../auth.js";

export const adminRouter = Router();

adminRouter.use(adminRequired);

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, "e")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || randomUUID();
}

adminRouter.get("/stats", async (_req, res) => {
  const [userCount, courseCount, enrollmentCount, publishedCount] =
    await Promise.all([
      users().countDocuments(),
      courses().countDocuments(),
      enrollments().countDocuments(),
      courses().countDocuments({ published: true }),
    ]);

  const recentUsers = await users()
    .find()
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();

  res.json({
    stats: {
      users: userCount,
      courses: courseCount,
      publishedCourses: publishedCount,
      enrollments: enrollmentCount,
    },
    recentUsers: recentUsers.map((u) => ({
      id: u._id.toHexString(),
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
  });
});

adminRouter.get("/courses", async (_req, res) => {
  const rows = await courses().find().sort({ updatedAt: -1 }).toArray();
  res.json({
    courses: rows.map((row) => publicCourse(row, { includeLessons: true })),
  });
});

adminRouter.get("/courses/:id", async (req, res) => {
  const row = await courses().findOne({ _id: String(req.params.id) });
  if (!row) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  res.json({
    course: {
      ...publicCourse(row, { includeLessons: true }),
      lessons: [...row.lessons]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          content: l.content,
          videoUrl: l.videoUrl ?? "",
          durationMinutes: l.durationMinutes,
          order: l.order,
        })),
    },
  });
});

adminRouter.post("/courses", async (req: AuthedRequest, res) => {
  const body = req.body as Partial<CourseDoc> & {
    lessons?: Array<Partial<LessonDoc>>;
  };

  if (!body.title?.trim()) {
    res.status(400).json({ error: "title обязателен" });
    return;
  }

  const now = new Date();
  const id = randomUUID();
  const slugBase = body.slug?.trim() || slugify(body.title);
  let slug = slugBase;
  let n = 1;
  while (await courses().findOne({ slug })) {
    slug = `${slugBase}-${n++}`;
  }

  const lessons: LessonDoc[] = (body.lessons ?? []).map((l, i) => ({
    id: l.id || randomUUID(),
    title: (l.title ?? `Урок ${i + 1}`).trim(),
    summary: (l.summary ?? "").trim(),
    content: (l.content ?? "").trim(),
    videoUrl: l.videoUrl?.trim() || undefined,
    durationMinutes: Number(l.durationMinutes) || 10,
    order: Number.isFinite(l.order) ? Number(l.order) : i + 1,
  }));

  const doc: CourseDoc = {
    _id: id,
    title: body.title.trim(),
    slug,
    subject: (body.subject ?? "Математика").trim(),
    level: body.level ?? "beginner",
    description: (body.description ?? "").trim(),
    coverColor: body.coverColor ?? "#0d9488",
    isFree: body.isFree !== false,
    priceTenge: body.isFree === false ? Number(body.priceTenge) || 0 : null,
    published: body.published !== false,
    lessons,
    createdAt: now,
    updatedAt: now,
  };

  await courses().insertOne(doc);
  res.status(201).json({ ok: true, id, course: publicCourse(doc, { includeLessons: true }) });
});

adminRouter.put("/courses/:id", async (req, res) => {
  const id = String(req.params.id);
  const existing = await courses().findOne({ _id: id });
  if (!existing) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }

  const body = req.body as Partial<CourseDoc> & {
    lessons?: Array<Partial<LessonDoc>>;
  };

  const lessons: LessonDoc[] =
    body.lessons !== undefined
      ? body.lessons.map((l, i) => ({
          id: l.id || randomUUID(),
          title: (l.title ?? `Урок ${i + 1}`).trim(),
          summary: (l.summary ?? "").trim(),
          content: (l.content ?? "").trim(),
          videoUrl: l.videoUrl?.trim() || undefined,
          durationMinutes: Number(l.durationMinutes) || 10,
          order: Number.isFinite(l.order) ? Number(l.order) : i + 1,
        }))
      : existing.lessons;

  const next: CourseDoc = {
    ...existing,
    title: body.title?.trim() || existing.title,
    slug: body.slug?.trim() || existing.slug,
    subject: body.subject?.trim() || existing.subject,
    level: body.level ?? existing.level,
    description:
      body.description !== undefined
        ? body.description.trim()
        : existing.description,
    coverColor: body.coverColor ?? existing.coverColor,
    isFree: body.isFree ?? existing.isFree,
    priceTenge:
      (body.isFree ?? existing.isFree)
        ? null
        : body.priceTenge !== undefined
          ? Number(body.priceTenge) || 0
          : existing.priceTenge,
    published: body.published ?? existing.published,
    lessons,
    updatedAt: new Date(),
  };

  await courses().replaceOne({ _id: id }, next);
  res.json({ ok: true, course: publicCourse(next, { includeLessons: true }) });
});

adminRouter.delete("/courses/:id", async (req, res) => {
  const id = String(req.params.id);
  const result = await courses().deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  await enrollments().deleteMany({ courseId: id });
  res.json({ ok: true });
});

adminRouter.get("/users", async (_req, res) => {
  const rows = await users().find().sort({ createdAt: -1 }).toArray();
  const counts = await enrollments()
    .aggregate<{ _id: ObjectId; count: number }>([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ])
    .toArray();
  const countMap = new Map(counts.map((c) => [c._id.toHexString(), c.count]));

  res.json({
    users: rows.map((u) => ({
      id: u._id.toHexString(),
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      enrollmentsCount: countMap.get(u._id.toHexString()) ?? 0,
    })),
  });
});

adminRouter.patch("/users/:id", async (req: AuthedRequest, res) => {
  const id = toObjectId(String(req.params.id));
  const role = (req.body as { role?: string } | undefined)?.role;
  if (!id) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  if (role !== "user" && role !== "admin") {
    res.status(400).json({ error: "Роль должна быть user или admin" });
    return;
  }
  if (req.user?.id === id.toHexString() && role !== "admin") {
    res.status(400).json({ error: "Нельзя снять права администратора с себя" });
    return;
  }
  const result = await users().updateOne({ _id: id }, { $set: { role } });
  if (result.matchedCount === 0) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  res.json({ ok: true });
});

adminRouter.delete("/users/:id", async (req: AuthedRequest, res) => {
  const id = toObjectId(String(req.params.id));
  if (!id) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  if (req.user?.id === id.toHexString()) {
    res.status(400).json({ error: "Нельзя удалить свой аккаунт" });
    return;
  }
  const result = await users().deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  await enrollments().deleteMany({ userId: id });
  res.json({ ok: true });
});
