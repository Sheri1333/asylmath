import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { connectDb, isDbReady } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { coursesRouter } from "./routes/courses.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { adminRouter } from "./routes/admin.js";

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
app.use(express.json({ limit: "4mb" }));

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
