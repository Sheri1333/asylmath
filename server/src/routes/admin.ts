import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import express, { Router } from "express";
import { ObjectId } from "mongodb";
import { courses, enrollments, toObjectId, users, type CourseDoc } from "../db.js";
import { adminRequired, type AuthedRequest } from "../auth.js";
import { cleanSections, courseSections, enrollmentView, publicCourse } from "../course.js";

export const adminRouter = Router();

adminRouter.use(adminRequired);

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const MAX_UPLOAD = 20 * 1024 * 1024;
const ALLOWED = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".mp3", ".mp4", ".zip"]);

function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", ә: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", қ: "q",
    л: "l", м: "m", н: "n", ң: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u", ү: "u", ф: "f", х: "h",
    һ: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", і: "i", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const latin = input.trim().toLowerCase().split("").map((ch) => map[ch] ?? ch).join("");
  return latin.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || randomUUID().slice(0, 8);
}

function courseInput(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  if (!title) throw new Error("Укажите название курса");
  const isFree = Boolean(body.isFree);
  const price = Number(body.priceTenge);
  return {
    title,
    slug: slugify(String(body.slug ?? "").trim() || title),
    subject: String(body.subject ?? "Математика").trim() || "Математика",
    level: (["beginner", "intermediate", "advanced"].includes(String(body.level)) ? body.level : "beginner") as CourseDoc["level"],
    description: String(body.description ?? "").trim().slice(0, 4000),
    coverColor: /^#[0-9a-f]{6}$/i.test(String(body.coverColor)) ? String(body.coverColor) : "#00236f",
    isFree,
    priceTenge: isFree || !Number.isFinite(price) || price <= 0 ? null : Math.round(price),
    published: Boolean(body.published),
    featured: Boolean(body.featured),
    sequential: Boolean(body.sequential),
    paymentNote: String(body.paymentNote ?? "").trim().slice(0, 2000),
    paymentUrl: String(body.paymentUrl ?? "").trim().slice(0, 1000),
    sections: cleanSections(body.sections),
  };
}

function fullCourse(doc: CourseDoc) {
  return { ...publicCourse(doc), sections: courseSections(doc) };
}

async function ensureSingleFeatured(id: string, featured: boolean) {
  if (featured) await courses().updateMany({ _id: { $ne: id } }, { $set: { featured: false } });
}

adminRouter.get("/stats", async (_req, res) => {
  const [userCount, courseCount, publishedCount, activeCount, pendingCount] = await Promise.all([
    users().countDocuments(),
    courses().countDocuments(),
    courses().countDocuments({ published: true }),
    enrollments().countDocuments({ status: { $ne: "pending" } }),
    enrollments().countDocuments({ status: "pending" }),
  ]);
  res.json({
    stats: {
      users: userCount,
      courses: courseCount,
      publishedCourses: publishedCount,
      enrollments: activeCount,
      pending: pendingCount,
    },
  });
});

// ── Courses ────────────────────────────────────────────────────────────────

adminRouter.get("/courses", async (_req, res) => {
  const rows = await courses().find().sort({ featured: -1, updatedAt: -1 }).toArray();
  res.json({ courses: rows.map(publicCourse) });
});

adminRouter.get("/courses/:id", async (req, res) => {
  const row = await courses().findOne({ _id: String(req.params.id) });
  if (!row) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  res.json({ course: fullCourse(row) });
});

adminRouter.post("/courses", async (req: AuthedRequest, res) => {
  let input;
  try {
    input = courseInput(req.body ?? {});
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }
  if (await courses().findOne({ slug: input.slug })) input.slug = `${input.slug}-${randomUUID().slice(0, 4)}`;
  const now = new Date();
  const doc: CourseDoc = { _id: randomUUID(), ...input, createdAt: now, updatedAt: now };
  await courses().insertOne(doc);
  await ensureSingleFeatured(doc._id, doc.featured ?? false);
  res.status(201).json({ ok: true, course: fullCourse(doc) });
});

adminRouter.put("/courses/:id", async (req, res) => {
  const id = String(req.params.id);
  const existing = await courses().findOne({ _id: id });
  if (!existing) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  let input;
  try {
    input = courseInput(req.body ?? {});
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }
  const clash = await courses().findOne({ slug: input.slug, _id: { $ne: id } });
  if (clash) {
    res.status(409).json({ error: `Адрес «${input.slug}» уже занят другим курсом` });
    return;
  }
  await courses().updateOne({ _id: id }, { $set: { ...input, updatedAt: new Date() }, $unset: { lessons: "" } });
  await ensureSingleFeatured(id, input.featured);
  const row = await courses().findOne({ _id: id });
  res.json({ ok: true, course: fullCourse(row!) });
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

// ── Access (enrollments) ───────────────────────────────────────────────────

adminRouter.get("/enrollments", async (req, res) => {
  const status = String(req.query.status ?? "");
  const filter = status === "pending" ? { status: "pending" as const } : status === "active" ? { status: { $ne: "pending" as const } } : {};
  const rows = await enrollments().find(filter).sort({ enrolledAt: -1 }).limit(500).toArray();
  const [userRows, courseRows] = await Promise.all([
    users().find({ _id: { $in: rows.map((r) => r.userId) } }).toArray(),
    courses().find({ _id: { $in: rows.map((r) => r.courseId) } }).toArray(),
  ]);
  const u = new Map(userRows.map((x) => [x._id.toHexString(), x]));
  const c = new Map(courseRows.map((x) => [x._id, x]));
  res.json({
    enrollments: rows.flatMap((r) => {
      const user = u.get(r.userId.toHexString());
      const course = c.get(r.courseId);
      if (!user || !course) return [];
      return [{
        id: r._id.toHexString(),
        user: { id: user._id.toHexString(), name: user.name, email: user.email },
        course: { id: course._id, title: course.title, priceTenge: course.priceTenge },
        note: r.requestNote ?? "",
        ...enrollmentView(course, r)!,
      }];
    }),
  });
});

/** Open a course for a user by email: the manual path after a Kaspi payment. */
adminRouter.post("/enrollments", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const courseId = String(req.body?.courseId ?? "");
  const [user, course] = await Promise.all([users().findOne({ email }), courses().findOne({ _id: courseId })]);
  if (!user) {
    res.status(404).json({ error: `Пользователь ${email || "без email"} не найден — пусть сначала зарегистрируется` });
    return;
  }
  if (!course) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  const now = new Date();
  await enrollments().updateOne(
    { userId: user._id, courseId },
    {
      $set: { status: "active", activatedAt: now, lastAccessedAt: now },
      $setOnInsert: { _id: new ObjectId(), completedLessonIds: [], quizResults: {}, enrolledAt: now },
    },
    { upsert: true },
  );
  res.json({ ok: true });
});

adminRouter.patch("/enrollments/:id", async (req, res) => {
  const id = toObjectId(String(req.params.id));
  const status = req.body?.status;
  if (!id || (status !== "active" && status !== "pending")) {
    res.status(400).json({ error: "Статус должен быть active или pending" });
    return;
  }
  const result = await enrollments().updateOne(
    { _id: id },
    { $set: { status, ...(status === "active" ? { activatedAt: new Date() } : {}) } },
  );
  if (result.matchedCount === 0) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  res.json({ ok: true });
});

adminRouter.delete("/enrollments/:id", async (req, res) => {
  const id = toObjectId(String(req.params.id));
  if (!id) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  await enrollments().deleteOne({ _id: id });
  res.json({ ok: true });
});

// ── Files ──────────────────────────────────────────────────────────────────

adminRouter.post(
  "/uploads",
  express.raw({ type: () => true, limit: MAX_UPLOAD }),
  (req, res) => {
    const original = decodeURIComponent(String(req.headers["x-filename"] ?? "file"));
    const ext = path.extname(original).toLowerCase();
    if (!ALLOWED.has(ext)) {
      res.status(400).json({ error: `Формат ${ext || "без расширения"} не поддерживается` });
      return;
    }
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Пустой файл" });
      return;
    }
    mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}${ext}`;
    writeFileSync(path.join(UPLOAD_DIR, name), body);
    res.status(201).json({ ok: true, file: { name: original.slice(0, 200), url: `/api/files/${name}`, size: body.length } });
  },
);

// ── Users ──────────────────────────────────────────────────────────────────

adminRouter.get("/users", async (_req, res) => {
  const rows = await users().find().sort({ createdAt: -1 }).toArray();
  const counts = await enrollments()
    .aggregate<{ _id: ObjectId; count: number }>([{ $group: { _id: "$userId", count: { $sum: 1 } } }])
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
