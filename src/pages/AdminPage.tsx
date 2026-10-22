import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { fmtMoney } from "../lib/course";
import type { AdminEnrollment, CourseSummary } from "../types/course";

type Tab = "stats" | "courses" | "access" | "users";
type Stats = { users: number; courses: number; publishedCourses: number; enrollments: number; pending: number };
type AdminUser = { id: string; email: string; name: string; role: string; createdAt: string; enrollmentsCount: number };

const date = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function AdminPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "stats";
  const setTab = (t: Tab) => setParams(t === "stats" ? {} : { tab: t });
  const [stats, setStats] = useState<Stats | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [access, setAccess] = useState<AdminEnrollment[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [grant, setGrant] = useState({ email: "", courseId: "" });

  const refresh = useCallback(async () => {
    const [s, c, u, a] = await Promise.all([api.adminStats(), api.adminCourses(), api.adminUsers(), api.adminEnrollments("all")]);
    setStats(s.stats);
    setCourses(c.courses);
    setUsers(u.users);
    setAccess(a.enrollments);
    setGrant((g) => (g.courseId ? g : { ...g, courseId: c.courses.find((x) => x.featured)?.id ?? c.courses[0]?.id ?? "" }));
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    setBusy(true);
    try {
      await action();
      await refresh();
      setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const pending = access.filter((a) => a.status === "pending");
  const activeAccess = access.filter((a) => a.status === "active");
  const q = query.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const shownUsers = useMemo(() => users.filter((u) => match(u.name) || match(u.email)), [users, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownAccess = activeAccess.filter((a) => match(a.user.name) || match(a.user.email) || match(a.course.title));

  function onGrant(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      await api.adminGrant(grant.email, grant.courseId);
      setGrant((g) => ({ ...g, email: "" }));
    }, `Доступ открыт для ${grant.email}`);
  }

  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Админ-панель" }]} subtitle="Админ-панель">
      <div className="cab adm">
        <section className="cab-hello">
          <div>
            <h1>Админ-панель</h1>
            <p><Icon name="admin_panel_settings" size={20} color="var(--navy)" /><span>Курсы, оплаты и ученики</span></p>
          </div>
          <div className="qz-toggle" role="tablist">
            {([
              ["stats", "monitoring", "Обзор"],
              ["courses", "menu_book", "Курсы"],
              ["access", "verified", "Доступ"],
              ["users", "group", "Пользователи"],
            ] as const).map(([t, icon, label]) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                <Icon name={icon} size={18} />{label}
                {t === "access" && pending.length > 0 && <b className="adm-badge">{pending.length}</b>}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="adm-alert">{error}</p>}
        {notice && <p className="adm-ok" role="status"><Icon name="check_circle" size={18} />{notice}</p>}

        {tab === "stats" && (
          <>
            <div className="adm-kpis">
              {[
                { icon: "group", v: stats?.users, l: "Пользователей" },
                { icon: "schedule", v: stats?.pending, l: "Ждут подтверждения оплаты", warn: Boolean(stats?.pending) },
                { icon: "school", v: stats?.enrollments, l: "Учеников с доступом" },
                { icon: "menu_book", v: stats?.publishedCourses, l: `Опубликовано курсов из ${stats?.courses ?? "—"}` },
              ].map((k) => (
                <article key={k.l} className={k.warn ? "warn" : ""}>
                  <span className="cab-card__ico"><Icon name={k.icon} size={22} /></span>
                  <strong>{k.v ?? "—"}</strong>
                  <small>{k.l}</small>
                </article>
              ))}
            </div>
            <div className="adm-two">
              <article className="cab-card">
                <header className="cab-card__head">
                  <div>
                    <span className="cab-card__ico"><Icon name="schedule" size={22} /></span>
                    <div><h3>Новые заявки на оплату</h3><p>Проверьте поступление в Kaspi и откройте доступ</p></div>
                  </div>
                  <button type="button" className="adm-link" onClick={() => setTab("access")}>Все <Icon name="arrow_forward" size={16} /></button>
                </header>
                <PendingList items={pending.slice(0, 5)} busy={busy} run={run} />
              </article>
              <article className="cab-card">
                <header className="cab-card__head">
                  <div>
                    <span className="cab-card__ico"><Icon name="group" size={22} /></span>
                    <div><h3>Новые пользователи</h3><p>Последние регистрации</p></div>
                  </div>
                  <button type="button" className="adm-link" onClick={() => setTab("users")}>Все <Icon name="arrow_forward" size={16} /></button>
                </header>
                <ul className="adm-list">
                  {users.slice(0, 6).map((u) => (
                    <li key={u.id}>
                      <span className="adm-ava">{u.name.slice(0, 1).toUpperCase()}</span>
                      <div><b>{u.name}</b><small>{u.email} · {date(u.createdAt)}</small></div>
                      <span className={u.role === "admin" ? "adm-role admin" : "adm-role"}>{u.role === "admin" ? "Админ" : "Ученик"}</span>
                    </li>
                  ))}
                  {users.length === 0 && <li className="adm-muted">Пока нет пользователей</li>}
                </ul>
              </article>
            </div>
          </>
        )}

        {tab === "courses" && (
          <article className="cab-card">
            <header className="cab-card__head">
              <div>
                <span className="cab-card__ico"><Icon name="menu_book" size={22} /></span>
                <div><h3>Курсы</h3><p>Основной курс открывается ученикам в кабинете</p></div>
              </div>
              <Link to="/admin/courses/new" className="qz-next"><Icon name="add" size={18} />Новый курс</Link>
            </header>
            <ul className="adm-clist">
              {courses.map((c) => (
                <li key={c.id}>
                  <span className="adm-swatch" style={{ background: c.coverColor }} />
                  <div>
                    <b>{c.title}{c.featured && <em className="adm-role live">Основной</em>}</b>
                    <small>
                      {c.sectionCount} разделов · {c.lessonCount} уроков · {c.quizCount} тестов · {c.isFree ? "бесплатно" : fmtMoney(c.priceTenge)}
                    </small>
                  </div>
                  <span className={c.published ? "adm-role live" : "adm-role"}>{c.published ? "Опубликован" : "Черновик"}</span>
                  <div className="adm-acts">
                    <Link to={`/admin/courses/${c.id}`} className="adm-open"><Icon name="edit" size={18} />Редактировать</Link>
                    <button
                      type="button"
                      className="danger"
                      aria-label={`Удалить курс ${c.title}`}
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`Удалить курс «${c.title}» вместе с прогрессом учеников? Это нельзя отменить.`)) return;
                        void run(() => api.adminDeleteCourse(c.id), "Курс удалён");
                      }}
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </li>
              ))}
              {courses.length === 0 && (
                <li className="adm-empty">
                  <p>Курсов пока нет. Создайте первый: добавьте разделы, уроки с видео и тесты.</p>
                  <Link to="/admin/courses/new" className="qz-next"><Icon name="add" size={18} />Создать курс</Link>
                </li>
              )}
            </ul>
          </article>
        )}

        {tab === "access" && (
          <>
            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="schedule" size={22} /></span>
                  <div><h3>Ждут подтверждения ({pending.length})</h3><p>Ученик нажал «Төледім». Сверьте имя или телефон с Kaspi.</p></div>
                </div>
              </header>
              <PendingList items={pending} busy={busy} run={run} />
            </article>

            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="add" size={22} /></span>
                  <div><h3>Открыть доступ вручную</h3><p>Ученик должен быть зарегистрирован на сайте</p></div>
                </div>
              </header>
              <form className="adm-grant" onSubmit={onGrant}>
                <label>Email ученика<input type="email" required value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} placeholder="student@mail.kz" /></label>
                <label>Курс
                  <select value={grant.courseId} onChange={(e) => setGrant({ ...grant, courseId: e.target.value })} required>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
                <button type="submit" className="qz-next" disabled={busy || !grant.courseId}>Открыть доступ</button>
              </form>
            </article>

            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="school" size={22} /></span>
                  <div><h3>С доступом ({activeAccess.length})</h3><p>Прогресс учеников по курсам</p></div>
                </div>
                <input className="adm-search" placeholder="Поиск по имени, email, курсу" value={query} onChange={(e) => setQuery(e.target.value)} />
              </header>
              <div className="adm-table">
                <table>
                  <thead>
                    <tr><th>Ученик</th><th>Курс</th><th>Прогресс</th><th>Тесты сданы</th><th>Открыт</th><th /></tr>
                  </thead>
                  <tbody>
                    {shownAccess.map((a) => (
                      <tr key={a.id}>
                        <td><span className="adm-ava">{a.user.name.slice(0, 1).toUpperCase()}</span>{a.user.name}<small className="adm-sub-email">{a.user.email}</small></td>
                        <td>{a.course.title}</td>
                        <td><span className="adm-bar"><i style={{ width: `${a.progressPercent}%` }} /></span>{a.progressPercent}%</td>
                        <td>{Object.values(a.quizResults).filter((r) => r.passed).length}</td>
                        <td>{a.activatedAt ? date(a.activatedAt) : date(a.enrolledAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="adm-del"
                            disabled={busy}
                            aria-label="Закрыть доступ"
                            title="Закрыть доступ"
                            onClick={() => {
                              if (!confirm(`Закрыть доступ ${a.user.email} к курсу «${a.course.title}»? Прогресс будет удалён.`)) return;
                              void run(() => api.adminDeleteEnrollment(a.id), "Доступ закрыт");
                            }}
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shownAccess.length === 0 && <tr><td colSpan={6} className="adm-muted">Никого не найдено</td></tr>}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}

        {tab === "users" && (
          <article className="cab-card">
            <header className="cab-card__head">
              <div>
                <span className="cab-card__ico"><Icon name="group" size={22} /></span>
                <div><h3>Пользователи</h3><p>{users.length} в базе</p></div>
              </div>
              <input className="adm-search" placeholder="Поиск по имени или email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </header>
            <div className="adm-table">
              <table>
                <thead>
                  <tr><th>Имя</th><th>Email</th><th>Роль</th><th>Курсы</th><th>Создан</th><th /></tr>
                </thead>
                <tbody>
                  {shownUsers.map((u) => {
                    const self = u.id === user?.id;
                    return (
                      <tr key={u.id}>
                        <td><span className="adm-ava">{u.name.slice(0, 1).toUpperCase()}</span>{u.name}{self && <em className="adm-you">вы</em>}</td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            disabled={self || busy}
                            aria-label={`Роль ${u.email}`}
                            onChange={(e) => void run(() => api.adminSetRole(u.id, e.target.value as "user" | "admin"), "Роль обновлена")}
                          >
                            <option value="user">Ученик</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                        <td>{u.enrollmentsCount}</td>
                        <td>{date(u.createdAt)}</td>
                        <td>
                          {!self && (
                            <button
                              type="button"
                              className="adm-del"
                              disabled={busy}
                              aria-label={`Удалить ${u.email}`}
                              onClick={() => {
                                if (!confirm(`Удалить пользователя ${u.email} и весь его прогресс?`)) return;
                                void run(() => api.adminDeleteUser(u.id), "Пользователь удалён");
                              }}
                            >
                              <Icon name="delete" size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {shownUsers.length === 0 && <tr><td colSpan={6} className="adm-muted">Никого не найдено</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </div>
    </Shell>
  );
}

function PendingList({
  items,
  busy,
  run,
}: {
  items: AdminEnrollment[];
  busy: boolean;
  run: (action: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  if (items.length === 0) return <p className="adm-muted">Новых заявок нет.</p>;
  return (
    <ul className="adm-pending">
      {items.map((a) => (
        <li key={a.id}>
          <div>
            <b>{a.user.name}</b>
            <small>{a.user.email} · {a.course.title} · {fmtMoney(a.course.priceTenge)}</small>
            {a.note && <p>Kaspi: «{a.note}»</p>}
            <small>Заявка: {dateTime(a.enrolledAt)}</small>
          </div>
          <div className="adm-pending__acts">
            <button type="button" className="qz-next" disabled={busy} onClick={() => void run(() => api.adminSetEnrollment(a.id, "active"), `Доступ открыт: ${a.user.email}`)}>
              <Icon name="check" size={18} />Оплата пришла
            </button>
            <button
              type="button"
              className="qz-prev"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Отклонить заявку ${a.user.email}? Ученик сможет отправить её снова.`)) return;
                void run(() => api.adminDeleteEnrollment(a.id), "Заявка отклонена");
              }}
            >
              Отклонить
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
