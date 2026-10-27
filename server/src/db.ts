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

export interface MaterialDoc {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface LessonDoc {
  id: string;
  title: string;
  summary: string;
  content: string;
  videoUrl?: string;
  /** Optional second video: solved ҰБТ problems. Empty means the lesson has only the explanation, or no video at all. */
  practiceVideoUrl?: string;
  durationMinutes: number;
  order: number;
  /** Open to signed-in visitors without paid access. */
  isPreview?: boolean;
  materials?: MaterialDoc[];
  /** Test that belongs to this lesson. No questions means the lesson has no test. */
  quiz?: QuizDoc;
}

export type QuestionLevel = "easy" | "mid" | "hard";

export interface QuestionDoc {
  id: string;
  prompt: string;
  formula?: string;
  choices: string[];
  /** Index into choices. Never sent to students before they submit. */
  answer: number;
  explanation: string;
  level: QuestionLevel;
}

export interface QuizDoc {
  passPercent: number;
  timeLimitMinutes: number;
  questions: QuestionDoc[];
}

export interface SectionDoc {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonDoc[];
  quiz: QuizDoc;
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
  /** The course the student cabinet opens by default. */
  featured?: boolean;
  /** Next section opens only after the previous section's test is passed. */
  sequential?: boolean;
  /** Kaspi payment details shown to students who have not paid yet. */
  paymentNote?: string;
  paymentUrl?: string;
  sections?: SectionDoc[];
  /** Legacy flat list from before sections existed; read through courseSections(). */
  lessons?: LessonDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = "active" | "pending";

export interface QuizResultDoc {
  best: number;
  last: number;
  total: number;
  passed: boolean;
  attempts: number;
  /** Per-question picks of the last attempt, for the review screen. */
  lastPicks: number[];
  updatedAt: Date;
}

export interface EnrollmentDoc {
  _id: ObjectId;
  userId: ObjectId;
  courseId: string;
  /** Missing on enrollments created before access requests existed: treated as active. */
  status?: EnrollmentStatus;
  completedLessonIds: string[];
  quizResults?: Record<string, QuizResultDoc>;
  requestNote?: string;
  enrolledAt: Date;
  activatedAt?: Date;
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

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
