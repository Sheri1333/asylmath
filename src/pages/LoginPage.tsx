import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <Link to="/" className="ln-brand">
          <img src="/assets/logo.png" alt="" />
          <span>
            MATH <em>ASYL</em>
          </span>
        </Link>
        <h1>Кіру</h1>
        <p className="auth-card__sub">Жеке кабинетке кіріп, оқуды жалғастырыңыз</p>
        <p className="auth-card__sub">Жеке кабинетке кіріп, оқуды жалғастырыңыз</p>
        {error && <p className="auth-card__error">{error}</p>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="auth-card__btn" disabled={busy}>
          {busy ? "…" : "Кіру"}
        </button>
        <p className="auth-card__footer">
          Аккаунт жоқ па? <Link to="/register">Тіркелу</Link>
        </p>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <Link to="/" className="ln-brand">
          <img src="/assets/logo.png" alt="" />
          <span>
            MATH <em>ASYL</em>
          </span>
        </Link>
        <h1>Тіркелу</h1>
        <p className="auth-card__sub">Аккаунт ашып, ҰБТ-ға дайындықты бүгін бастаңыз</p>
        <p className="auth-card__sub">Аккаунт ашып, ҰБТ-ға дайындықты бүгін бастаңыз</p>
        {error && <p className="auth-card__error">{error}</p>}
        <label>
          Аты-жөні
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="auth-card__btn" disabled={busy}>
          {busy ? "…" : "Аккаунт ашу"}
        </button>
        <p className="auth-card__footer">
          Аккаунт бар ма? <Link to="/login">Кіру</Link>
        </p>
      </form>
    </div>
  );
}
