import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">∑</span>
          <span className="brand__text">AslMath</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end>
            Курсы
          </NavLink>
          {user && <NavLink to="/profile">Моё обучение</NavLink>}
          {isAdmin && <NavLink to="/admin">Админ</NavLink>}
        </nav>
        <div className="site-header__actions">
          <ThemeToggle />
          {user ? (
            <>
              <span className="site-header__user">{user.name}</span>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                Войти
              </Link>
              <Link to="/register" className="btn btn--primary">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          <strong>AslMath</strong> — курсы математики онлайн
        </p>
        <p className="muted">React + Node · учебный проект</p>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="page">
      <SiteHeader />
      <main className={wide ? "page__main page__main--wide" : "page__main"}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function levelLabel(level: string): string {
  if (level === "beginner") return "Начальный";
  if (level === "intermediate") return "Средний";
  if (level === "advanced") return "Продвинутый";
  return level;
}
