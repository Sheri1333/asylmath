import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/home", label: "Басты бет", icon: "grid" },
  { to: "/course", label: "Курс", icon: "book" },
  { to: "/tests", label: "Сынақтар", icon: "clock" },
  { to: "/profile", label: "Профиль", icon: "user" },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "grid")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  if (name === "book")
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c1.2-2.5 3.2-3.5 6-3.5s4.8 1 6 3.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M9 7H5v12h14V7h-4" />
      <path d="M9 7V5h6v2M10 12h4" />
    </svg>
  );
}

export function Shell({
  children,
  crumbs,
}: {
  children: ReactNode;
  crumbs?: string;
}) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || "Айбек";

  return (
    <div className="shell">
      <aside className="side">
        <a className="brand" href="/">
          <img src="/assets/logo.png" alt="" />
        </a>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "on" : "")}>
              <Icon name={l.icon} />
              {l.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "on" : "")}>
              <Icon name="admin" />
              Админ
            </NavLink>
          )}
        </nav>
        <button
          type="button"
          className="side-out"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Шығу
        </button>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <p className="crumbs">{crumbs || "Оқу кеңістігі › ҰБТ Дайындық 2025"}</p>
          <div className="who">
            <span className="bell" aria-hidden>
              <span />
            </span>
            <div>
              <strong>{name}</strong>
              <small>11-сынып оқушысы</small>
            </div>
          </div>
        </header>
        <div className="shell-body">{children}</div>
      </div>
    </div>
  );
}
