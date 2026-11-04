import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { GridFSBucket } from "mongodb";
import { connectDb, getDb, isDbReady, toObjectId } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { coursesRouter } from "./routes/courses.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { adminRouter, UPLOAD_DIR } from "./routes/admin.js";
import { examsRouter } from "./routes/exams.js";
import { handleTelegramUpdate } from "./payments.js";
import { startTelegramPolling } from "./telegram.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  ...(process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

const corsMw = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.includes(origin) ? origin : false);
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
});

const app = express();
app.disable("x-powered-by");
app.use(corsMw);
app.options(/.*/, corsMw);
app.use(express.json({ limit: "10mb" }));

// Uploaded lesson materials. Served before the DB check so files work while Mongo reconnects.
// Images and files stored in the MongoDB bucket. Public by design (lesson pictures), but served
// with nosniff and a sandbox policy so an uploaded SVG cannot run script on our origin.
app.get("/api/files/g/:id", async (req, res) => {
  const id = toObjectId(String(req.params.id));
  if (!id || !isDbReady()) {
    res.status(404).json({ error: "Файл не найден" });
    return;
  }
  const bucket = new GridFSBucket(getDb(), { bucketName: "files" });
  const [meta] = await bucket.find({ _id: id }).toArray();
  if (!meta) {
    res.status(404).json({ error: "Файл не найден" });
    return;
  }
  res.setHeader("Content-Type", String(meta.metadata?.contentType ?? "application/octet-stream"));
  res.setHeader("Content-Length", String(meta.length));
  res.setHeader("Cache-Control", "public, max-age=604800");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "sandbox");
  bucket.openDownloadStream(id).on("error", () => res.destroy()).pipe(res);
});

app.use("/api/files", express.static(UPLOAD_DIR, { maxAge: "7d", fallthrough: false, dotfiles: "deny" }));

// Slow down password guessing: 20 attempts per IP per 15 minutes on login/register.
const attempts = new Map<string, { n: number; until: number }>();
app.use(["/api/auth/login", "/api/auth/register"], (req, res, next) => {
  if (req.method !== "POST") return next();
  const key = String(req.headers["x-real-ip"] ?? req.ip ?? "");
  const now = Date.now();
  const cur = attempts.get(key);
  const entry = cur && cur.until > now ? cur : { n: 0, until: now + 15 * 60_000 };
  entry.n += 1;
  attempts.set(key, entry);
  if (entry.n > 20) {
    res.status(429).json({ error: "Тым көп әрекет. 15 минуттан кейін қайталаңыз." });
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "aslmath-api",
    db: isDbReady() ? "up" : "down",
    requestId: randomUUID(),
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/health")) {
    next();
    return;
  }
  if (!isDbReady()) {
    res.status(503).json({
      error: "База ещё не подключена, повторите через несколько секунд",
    });
    return;
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/exams", examsRouter);
app.use("/api/admin", adminRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal error" });
  },
);

const server = app.listen(PORT, HOST, () => {
  console.log(`AslMath API http://${HOST}:${PORT}`);
});

async function connectLoop(): Promise<void> {
  for (;;) {
    try {
      await connectDb();
      const { syncProgramTitles } = await import("./programTitles.js");
      await syncProgramTitles().catch((err) =>
        console.error("syncProgramTitles:", err instanceof Error ? err.message : err),
      );
      startTelegramPolling(handleTelegramUpdate);
      return;
    } catch (err) {
      console.error(
        "MongoDB failed:",
        err instanceof Error ? err.message : err,
      );
      console.error(
        "Check MONGODB_URI and that MongoDB is running. Retry in 8s...",
      );
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
  }
}

void connectLoop();

export default app;
export { server };
