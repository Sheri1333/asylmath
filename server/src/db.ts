import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", "..", ".env"));

export type UserRole = "user" | "admin";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface LessonDoc {
  id: string;
  title: string;
  summary: string;
  content: string;
  videoUrl?: string;
  durationMinutes: number;
  order: number;
}

export interface CourseDoc {
  _id: string;
  title: string;
  slug: string;
  subject: string;
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  coverColor: string;
  isFree: boolean;
  priceTenge: number | null;
  published: boolean;
  lessons: LessonDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrollmentDoc {
  _id: ObjectId;
  userId: ObjectId;
  courseId: string;
  completedLessonIds: string[];
  enrolledAt: Date;
  lastAccessedAt: Date;
}

let client: MongoClient | null = null;
let database: Db | null = null;

export function toObjectId(id: string): ObjectId | null {
  try {
    if (!ObjectId.isValid(id)) return null;
    const oid = new ObjectId(id);
    return oid.toHexString() === id ? oid : null;
  } catch {
    return null;
  }
}

export async function connectDb(): Promise<Db> {
  if (database) return database;

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI не задан. Добавьте его в server/.env");
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20_000,
    connectTimeoutMS: 20_000,
  });
  await client.connect();
  database = client.db("aslmath");

  await database.collection<UserDoc>("users").createIndex({ email: 1 }, { unique: true });
  await database.collection<CourseDoc>("courses").createIndex({ slug: 1 }, { unique: true });
  await database.collection<CourseDoc>("courses").createIndex({ published: 1, subject: 1 });
  await database
    .collection<EnrollmentDoc>("enrollments")
    .createIndex({ userId: 1, courseId: 1 }, { unique: true });
  await database.collection<EnrollmentDoc>("enrollments").createIndex({ userId: 1 });

  console.log("MongoDB connected: db=aslmath");
  return database;
}

export function isDbReady(): boolean {
  return database !== null;
}

function requireDb(): Db {
  if (!database) {
    throw new Error("MongoDB ещё не подключена");
  }
  return database;
}

export function getDb(): Db {
  return requireDb();
}

export function users(): Collection<UserDoc> {
  return requireDb().collection<UserDoc>("users");
}

export function courses(): Collection<CourseDoc> {
  return requireDb().collection<CourseDoc>("courses");
}

export function enrollments(): Collection<EnrollmentDoc> {
  return requireDb().collection<EnrollmentDoc>("enrollments");
}

export function publicUser(doc: UserDoc) {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
  };
}

export function publicCourse(doc: CourseDoc, opts?: { includeLessons?: boolean }) {
  const lessons = [...doc.lessons].sort((a, b) => a.order - b.order);
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
    lessonCount: lessons.length,
    durationMinutes: lessons.reduce((sum, l) => sum + l.durationMinutes, 0),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lessons: opts?.includeLessons
      ? lessons.map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          durationMinutes: l.durationMinutes,
          order: l.order,
          hasVideo: Boolean(l.videoUrl),
        }))
      : undefined,
  };
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
