import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import type { CourseSummary } from "../types/course";

interface LessonDraft {
  id?: string;
  title: string;
  summary: string;
  content: string;
  videoUrl: string;
  durationMinutes: number;
  order: number;
}

type Level = "beginner" | "intermediate" | "advanced";

interface CourseForm {
  title: string;
  slug: string;
  subject: string;
  level: Level;
  description: string;
  coverColor: string;
  isFree: boolean;
  priceTenge: number;
  published: boolean;
  lessons: LessonDraft[];
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  enrollmentsCount: number;
}

type Stats = { users: number; courses: number; publishedCourses: number; enrollments: number };

const emptyLesson = (order: number): LessonDraft => ({
  title: "",
  summary: "",
  content: "",
  videoUrl: "",
  durationMinutes: 15,
  order,
});

const emptyForm = (): CourseForm => ({
  title: "",
  slug: "",
  subject: "Математика",
  level: "beginner",
  description: "",
  coverColor: "#00236f",
  isFree: true,
  priceTenge: 9990,
  published: true,
  lessons: [emptyLesson(1)],
});

const levels: Record<Level, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
};

const date = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");

export function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<"stats" | "courses" | "users">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [query, setQuery] = useState("");

  async function refresh() {
    const [s, c, u] = await Promise.all([api.adminStats(), api.adminCourses(), api.adminUsers()]);
    setStats(s.stats);
    setCourses(c.courses);
    setUsers(u.users);
  }

  useEffect(() => {
    if (!isAdmin) return;
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки"));
  }, [isAdmin]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const shownUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    setBusy(true);
    try {
      await action();
      await refresh();
      setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function startEdit(id: string) {
    setError("");
    try {
      const { course } = await api.adminGetCourse(id);
      setEditingId(id);
      setForm({
        title: course.title,
        slug: course.slug,
        subject: course.subject,
        level: course.level,
        description: course.description,
        coverColor: course.coverColor,
        isFree: course.isFree,
        priceTenge: course.priceTenge ?? 0,
        published: course.published,
        lessons: course.lessons.length
          ? course.lessons.map((l) => ({ ...l, videoUrl: l.videoUrl || "" }))
          : [emptyLesson(1)],
      });
      setTab("courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть курс");
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function setLesson(idx: number, patch: Partial<LessonDraft>) {
    const lessons = form.lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    setForm({ ...form, lessons });
  }

  function moveLesson(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= form.lessons.length) return;
    const lessons = [...form.lessons];
    [lessons[idx], lessons[to]] = [lessons[to], lessons[idx]];
    setForm({ ...form, lessons: lessons.map((l, i) => ({ ...l, order: i + 1 })) });
  }

  function removeLesson(idx: number) {
    const lessons = form.lessons.filter((_, i) => i !== idx).map((l, i) => ({ ...l, order: i + 1 }));
    setForm({ ...form, lessons: lessons.length ? lessons : [emptyLesson(1)] });
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    const body = {
      title: form.title,
      slug: form.slug || undefined,
      subject: form.subject,
      level: form.level,
      description: form.description,
      coverColor: form.coverColor,
      isFree: form.isFree,
      priceTenge: form.isFree ? null : form.priceTenge,
      published: form.published,
      lessons: form.lessons.map((l, i) => ({ ...l, order: i + 1 })),
    };
    void run(async () => {
      await api.adminSaveCourse(body, editingId ?? undefined);
      resetForm();
    }, editingId ? "Курс сохранён" : "Курс создан");
  }

  if (loading) {
    return (
      <Shell crumbs={[{ label: "Админ-панель" }]}>
        <p className="adm-muted">Загрузка…</p>
      </Shell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <Shell crumbs={[{ label: "Админ-панель" }]}>
        <p className="adm-alert">Доступ только для администратора</p>
      </Shell>
    );
  }

  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Админ-панель" }]} subtitle="Админ-панель">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>Админ-панель</h1>
            <p><Icon name="admin_panel_settings" size={20} color="#00236f" /><span>Курсы, уроки и пользователи из базы данных</span></p>
          </div>
          <div className="qz-toggle">
            <button type="button" className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}><Icon name="monitoring" size={18} />Обзор</button>
            <button type="button" className={tab === "courses" ? "on" : ""} onClick={() => setTab("courses")}><Icon name="menu_book" size={18} />Курсы</button>
            <button type="button" className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}><Icon name="group" size={18} />Пользователи</button>
          </div>
        </section>

        {error && <p className="adm-alert">{error}</p>}
        {notice && <p className="adm-ok"><Icon name="check_circle" size={18} />{notice}</p>}

        {tab === "stats" && (
          <>
            <div className="adm-kpis">
              {[
                { icon: "group", v: stats?.users, l: "Пользователей" },
                { icon: "menu_book", v: stats?.courses, l: "Курсов" },
                { icon: "verified", v: stats?.publishedCourses, l: "Опубликовано" },
                { icon: "school", v: stats?.enrollments, l: "Записей на курсы" },
              ].map((k) => (
                <article key={k.l}>
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
                    <span className="cab-card__ico"><Icon name="group" size={22} /></span>
                    <div><h3>Новые пользователи</h3><p>Последние регистрации</p></div>
                  </div>
                  <button type="button" className="adm-link" onClick={() => setTab("users")}>Все <Icon name="arrow_forward" size={16} /></button>
                </header>
                <ul className="adm-list">
                  {users.slice(0, 6).map((u) => (
                    <li key={u.id}>
                      <span className="adm-ava">{u.name.slice(0, 1).toUpperCase()}</span>
                      <div><b>{u.name}</b><small>{u.email}</small></div>
                      <span className={u.role === "admin" ? "adm-role admin" : "adm-role"}>{u.role === "admin" ? "Админ" : "Ученик"}</span>
                    </li>
                  ))}
                  {users.length === 0 && <li className="adm-muted">Пока нет пользователей</li>}
                </ul>
              </article>
              <article className="cab-card">
                <header className="cab-card__head">
                  <div>
                    <span className="cab-card__ico"><Icon name="menu_book" size={22} /></span>
                    <div><h3>Курсы</h3><p>Опубликованные и черновики</p></div>
                  </div>
                  <button type="button" className="adm-link" onClick={() => { resetForm(); setTab("courses"); }}>Новый курс <Icon name="add" size={16} /></button>
                </header>
                <ul className="adm-list">
                  {courses.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <span className="adm-swatch" style={{ background: c.coverColor }} />
                      <div><b>{c.title}</b><small>{c.lessonCount} уроков · {c.durationMinutes} мин</small></div>
                      <span className={c.published ? "adm-role live" : "adm-role"}>{c.published ? "Опубликован" : "Черновик"}</span>
                    </li>
                  ))}
                  {courses.length === 0 && <li className="adm-muted">Курсов пока нет</li>}
                </ul>
              </article>
            </div>
          </>
        )}

        {tab === "courses" && (
          <div className="adm-courses">
            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="menu_book" size={22} /></span>
                  <div><h3>Все курсы</h3><p>{courses.length} в базе</p></div>
                </div>
                <button type="button" className="adm-link" onClick={resetForm}>Новый <Icon name="add" size={16} /></button>
              </header>
              <ul className="adm-clist">
                {courses.map((c) => (
                  <li key={c.id} className={editingId === c.id ? "on" : ""}>
                    <span className="adm-swatch" style={{ background: c.coverColor }} />
                    <div>
                      <b>{c.title}</b>
                      <small>{c.subject} · {levels[c.level]} · {c.lessonCount} уроков · {c.isFree ? "бесплатно" : `${c.priceTenge ?? 0} ₸`}</small>
                    </div>
                    <span className={c.published ? "adm-role live" : "adm-role"}>{c.published ? "Опубл." : "Черновик"}</span>
                    <div className="adm-acts">
                      <button type="button" onClick={() => startEdit(c.id)} aria-label="Изменить"><Icon name="edit" size={18} /></button>
                      <button
                        type="button"
                        className="danger"
                        aria-label="Удалить"
                        onClick={() => {
                          if (!confirm(`Удалить курс «${c.title}»?`)) return;
                          void run(async () => {
                            await api.adminDeleteCourse(c.id);
                            if (editingId === c.id) resetForm();
                          }, "Курс удалён");
                        }}
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </li>
                ))}
                {courses.length === 0 && <li className="adm-muted">Курсов пока нет — создайте первый справа.</li>}
              </ul>
            </article>

            <form className="cab-card adm-form" onSubmit={onSave}>
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name={editingId ? "edit" : "add"} size={22} /></span>
                  <div><h3>{editingId ? "Редактирование курса" : "Новый курс"}</h3><p>{editingId ? form.title : "Заполните поля и добавьте уроки"}</p></div>
                </div>
              </header>
              <div className="adm-fields">
                <label className="wide">Название<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
                <label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="авто" /></label>
                <label>Предмет<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
                <label>Уровень
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Level })}>
                    {Object.entries(levels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label>Цвет обложки<input type="color" value={form.coverColor} onChange={(e) => setForm({ ...form, coverColor: e.target.value })} /></label>
                <label className="wide">Описание<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <label className="adm-check"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />Бесплатный</label>
                {!form.isFree && (
                  <label>Цена, ₸<input type="number" min={0} value={form.priceTenge} onChange={(e) => setForm({ ...form, priceTenge: Number(e.target.value) || 0 })} /></label>
                )}
                <label className="adm-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />Опубликован</label>
              </div>

              <h4 className="adm-sub">Уроки <small>{form.lessons.length}</small></h4>
              {form.lessons.map((lesson, idx) => (
                <fieldset key={lesson.id ?? `new-${idx}`} className="adm-lesson">
                  <legend>
                    <span>Урок {idx + 1}</span>
                    <span className="adm-acts">
                      <button type="button" onClick={() => moveLesson(idx, -1)} disabled={idx === 0} aria-label="Выше"><Icon name="arrow_drop_up" size={22} /></button>
                      <button type="button" onClick={() => moveLesson(idx, 1)} disabled={idx === form.lessons.length - 1} aria-label="Ниже"><Icon name="expand_more" size={20} /></button>
                      <button type="button" className="danger" onClick={() => removeLesson(idx)} aria-label="Удалить урок"><Icon name="delete" size={18} /></button>
                    </span>
                  </legend>
                  <div className="adm-fields">
                    <label className="wide">Заголовок<input value={lesson.title} onChange={(e) => setLesson(idx, { title: e.target.value })} required /></label>
                    <label className="wide">Кратко<input value={lesson.summary} onChange={(e) => setLesson(idx, { summary: e.target.value })} /></label>
                    <label>Видео (URL)<input value={lesson.videoUrl} onChange={(e) => setLesson(idx, { videoUrl: e.target.value })} placeholder="https://…" /></label>
                    <label>Минут<input type="number" min={1} value={lesson.durationMinutes} onChange={(e) => setLesson(idx, { durationMinutes: Number(e.target.value) || 10 })} /></label>
                    <label className="wide">Содержание<textarea rows={4} value={lesson.content} onChange={(e) => setLesson(idx, { content: e.target.value })} required /></label>
                  </div>
                </fieldset>
              ))}
              <button type="button" className="adm-add" onClick={() => setForm({ ...form, lessons: [...form.lessons, emptyLesson(form.lessons.length + 1)] })}>
                <Icon name="add" size={18} />Добавить урок
              </button>

              <footer className="adm-foot">
                {editingId && <button type="button" className="qz-prev" onClick={resetForm}>Отмена</button>}
                <button type="submit" className="qz-next" disabled={busy}>{busy ? "Сохранение…" : editingId ? "Сохранить" : "Создать курс"}</button>
              </footer>
            </form>
          </div>
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
                    const self = u.id === user.id;
                    return (
                      <tr key={u.id}>
                        <td><span className="adm-ava">{u.name.slice(0, 1).toUpperCase()}</span>{u.name}{self && <em className="adm-you">вы</em>}</td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            disabled={self || busy}
                            onChange={(e) => {
                              const role = e.target.value as "user" | "admin";
                              void run(() => api.adminSetRole(u.id, role), "Роль обновлена");
                            }}
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
                              aria-label="Удалить пользователя"
                              onClick={() => {
                                if (!confirm(`Удалить пользователя ${u.email}?`)) return;
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
                  {shownUsers.length === 0 && (
                    <tr><td colSpan={6} className="adm-muted">Никого не найдено</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </div>
    </Shell>
  );
}
