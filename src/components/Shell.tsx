import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "./Icon";

type Variant = "home" | "study";

const nav = {
  home: [
    { to: "/home", label: "Басты бет", icon: "dashboard" },
    { to: "/course", label: "Курс", icon: "menu_book" },
    { to: "/tests", label: "Сынақтар", icon: "quiz" },
    { to: "/profile", label: "Профиль", icon: "settings" },
  ],
  study: [
    { to: "/home", label: "Басты бет", icon: "grid_view" },
    { to: "/course", label: "Курс", icon: "menu_book" },
    { to: "/tests", label: "Сынақтар", icon: "timer" },
    { to: "/profile", label: "Профиль", icon: "person" },
  ],
};

export type Crumb = { label: string; to?: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Shell({
  children,
  crumbs,
  variant = "home",
  subtitle = "Курс",
  flush,
  streak = false,
}: {
  children: ReactNode;
  crumbs?: Crumb[];
  variant?: Variant;
  subtitle?: string;
  flush?: boolean;
  streak?: boolean;
}) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const name = user?.name?.split(" ")[0] || "Айбек";
  const links = nav[variant];
  const trail = crumbs ?? (variant === "home"
    ? [{ label: "Оқу кеңістігі", to: "/home" }, { label: "Жеке кабинет" }]
    : [{ label: "Басты бет", to: "/home" }, { label: "Курс", to: "/course" }]);

  const pageTitle = trail[trail.length - 1]?.label;
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} — MATH ASYL` : "MATH ASYL";
  }, [pageTitle]);

  function out() {
    logout();
    navigate("/");
  }

  return (
    <div className={`app app--${variant}`}>
      <aside className="side">
        <div className="side__top">
          {variant === "home" ? (
            <Link to="/" className="side__brand">
              <span className="side__logo side__logo--calc"><Icon name="calculate" size={22} /></span>
              <span>
                <strong>MATH ASYL</strong>
                <small>ҰБТ Математика</small>
              </span>
            </Link>
          ) : (
            <Link to="/" className="side__brand side__brand--study">
              <span className="side__logo">M</span>
              <span>
                <strong>MATH ASYL</strong>
                <small>ҰБТ дайындық</small>
              </span>
            </Link>
          )}
          <nav className="side__nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "on" : "")}>
                <Icon name={l.icon} size={variant === "home" ? 20 : 20} />
                {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "on" : "")}>
                <Icon name="admin_panel_settings" size={20} />
                Админ
              </NavLink>
            )}
          </nav>
        </div>
        <div className="side__bottom">
          {streak && (
            <div className="side__streak">
              <Icon name="local_fire_department" size={20} color="#9d4300" />
              <span>
                <b>14 күн streak</b>
                <small>Күнделікті есеп</small>
              </span>
            </div>
          )}
          <button type="button" className="side__out" onClick={out}>
            <Icon name="logout" size={18} />
            Шығу
          </button>
        </div>
      </aside>

      <header className="top">
        <div className="top__crumbs">
          {trail.map((c, i) => (
            <span key={c.label} className={i === trail.length - 1 ? "cur" : ""}>
              {i > 0 && <Icon name="chevron_right" size={variant === "home" ? 12 : 16} />}
              {c.to && i < trail.length - 1 ? <Link to={c.to}>{c.label}</Link> : c.label}
            </span>
          ))}
        </div>
        <Link to="/" className="top__mbrand">
          <span className="side__logo">M</span>
          <span>
            <strong>MATH ASYL</strong>
            <small>{subtitle}</small>
          </span>
        </Link>
        <div className="top__right">
          <Link to="/profile" className="top__who">
            <span>
              <strong>{name}</strong>
              <small>{isAdmin ? "Әкімші" : "Оқушы"}</small>
            </span>
            <span className="top__ava">{initials(user?.name || name)}</span>
          </Link>
        </div>
      </header>

      <main className={flush ? "app__main app__main--flush" : "app__main"}>{children}</main>

      <nav className="tabbar">
        {nav.study.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "on" : "")}>
            <Icon name={l.icon} size={20} />
            {l.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => (isActive ? "on" : "")}>
            <Icon name="admin_panel_settings" size={20} />
            Админ
          </NavLink>
        )}
      </nav>
    </div>
  );
}
