import { Shell } from "../components/Shell";
import { useAuth } from "../auth/AuthContext";

export function AccountPage() {
  const { user } = useAuth();
  return (
    <Shell crumbs="Басты бет › Профиль">
      <article className="card profile">
        <div className="avatar">{(user?.name || "А").slice(0, 1)}</div>
        <div>
          <h1>{user?.name}</h1>
          <p>{user?.email}</p>
          <p>11-сынып · ҰБТ 2025 · Мақсат: 45 балл</p>
        </div>
      </article>
      <div className="kpis">
        <article><b>31/50</b><span>соңғы сынақ</span></article>
        <article><b>5 күн</b><span>streak</span></article>
        <article><b>4 / 11</b><span>бөлім</span></article>
      </div>
    </Shell>
  );
}
