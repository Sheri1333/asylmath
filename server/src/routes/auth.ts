import { Router } from "express";
import bcrypt from "bcryptjs";
import { users, publicUser, type UserDoc } from "../db.js";
import { authRequired, signToken, type AuthedRequest } from "../auth.js";

export const authRouter = Router();

function respondUser(
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  },
  user: ReturnType<typeof publicUser>,
  status = 200,
) {
  const payload = { token: signToken(user), user };
  if (status === 201) res.status(201).json(payload);
  else res.json(payload);
}

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ error: "email, password и name обязательны" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Пароль минимум 6 символов" });
    return;
  }

  const normalized = email.trim().toLowerCase();
  const existing = await users().findOne({ email: normalized });
  if (existing) {
    res.status(409).json({ error: "Email уже зарегистрирован" });
    return;
  }

  const now = new Date();
  const result = await users().insertOne({
    email: normalized,
    passwordHash: bcrypt.hashSync(password, 10),
    name: name.trim(),
    role: "user",
    createdAt: now,
  } as UserDoc);

  respondUser(
    res,
    publicUser({
      _id: result.insertedId,
      email: normalized,
      passwordHash: "",
      name: name.trim(),
      role: "user",
      createdAt: now,
    }),
    201,
  );
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email и password обязательны" });
    return;
  }

  const row = await users().findOne({ email: email.trim().toLowerCase() });
  if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }

  respondUser(res, publicUser(row));
});

authRouter.get("/me", authRequired, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

authRouter.post("/password", authRequired, async (req: AuthedRequest, res) => {
  const { current, next } = (req.body ?? {}) as { current?: string; next?: string };
  if (!current || !next) {
    res.status(400).json({ error: "Ағымдағы және жаңа құпиясөзді енгізіңіз" });
    return;
  }
  if (next.length < 8) {
    res.status(400).json({ error: "Жаңа құпиясөз кемінде 8 таңбадан тұруы керек" });
    return;
  }
  const row = await users().findOne({ email: req.user!.email });
  if (!row || !bcrypt.compareSync(current, row.passwordHash)) {
    res.status(400).json({ error: "Ағымдағы құпиясөз қате" });
    return;
  }
  await users().updateOne({ _id: row._id }, { $set: { passwordHash: bcrypt.hashSync(next, 10) } });
  res.json({ ok: true });
});
