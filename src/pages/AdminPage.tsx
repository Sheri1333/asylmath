import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
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

const emptyLesson = (order: number): LessonDraft => ({
  title: "",
  summary: "",
  content: "",
  videoUrl: "",
  durationMinutes: 15,
  order,
});

export function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<"stats" | "courses" | "users">("stats");
  const [stats, setStats] = useState<{
    users: number;
    courses: number;
    publishedCourses: number;
    enrollments: number;
  } | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: string;
      enrollmentsCount: number;
    }>
  >([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    subject: "Математика",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    description: "",
    coverColor: "#0f766e",
    isFree: true,
    priceTenge: 0,
    published: true,
    lessons: [emptyLesson(1)],
  });

  async function refresh() {
    const [s, c, u] = await Promise.all([
      api.adminStats(),
      api.adminCourses(),
      api.adminUsers(),
    ]);
    setStats(s.stats);
    setCourses(c.courses);
    setUsers(u.users);
  }

  useEffect(() => {
    if (!isAdmin) return;
    refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка"),
    );
  }, [isAdmin]);

  async function startEdit(id: string) {
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
      lessons:
        course.lessons.length > 0
          ? course.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              summary: l.summary,
              content: l.content,
              videoUrl: l.videoUrl,
              durationMinutes: l.durationMinutes,
              order: l.order,
            }))
          : [emptyLesson(1)],
    });
    setTab("courses");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      subject: "Математика",
      level: "beginner",
      description: "",
      coverColor: "#0f766e",
      isFree: true,
      priceTenge: 0,
      published: true,
      lessons: [emptyLesson(1)],
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.adminSaveCourse(
        {
          title: form.title,
          slug: form.slug || undefined,
          subject: form.subject,
          level: form.level,
          description: form.description,
          coverColor: form.coverColor,
          isFree: form.isFree,
          priceTenge: form.isFree ? null : form.priceTenge,
          published: form.published,
          lessons: form.lessons,
        },
        editingId ?? undefined,
      );
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Удалить курс?")) return;
    await api.adminDeleteCourse(id);
    if (editingId === id) resetForm();
    await refresh();
  }

  if (loading) {
    return (
      <Shell crumbs="Админ">
        <p className="muted">Загрузка…</p>
      </Shell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <Shell crumbs="Админ">
        <p className="banner banner--error">Доступ только для администратора</p>
      </Shell>
    );
  }

  return (
    <Shell crumbs="Админ">
      <h1>Админ-панель</h1>
      <div className="toolbar">
        <button
          type="button"
          className={tab === "stats" ? "chip chip--active" : "chip"}
          onClick={() => setTab("stats")}
        >
          Статистика
        </button>
        <button
          type="button"
          className={tab === "courses" ? "chip chip--active" : "chip"}
          onClick={() => setTab("courses")}
        >
          Курсы
        </button>
        <button
          type="button"
          className={tab === "users" ? "chip chip--active" : "chip"}
          onClick={() => setTab("users")}
        >
          Пользователи
        </button>
      </div>

      {error && <p className="banner banner--error">{error}</p>}

      {tab === "stats" && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <strong>{stats.users}</strong>
            <span>пользователей</span>
          </div>
          <div className="stat-card">
            <strong>{stats.courses}</strong>
            <span>курсов</span>
          </div>
          <div className="stat-card">
            <strong>{stats.publishedCourses}</strong>
            <span>опубликовано</span>
          </div>
          <div className="stat-card">
            <strong>{stats.enrollments}</strong>
            <span>записей</span>
          </div>
        </div>
      )}

      {tab === "courses" && (
        <div className="admin-split">
          <div>
            <h2>Список</h2>
            <ul className="admin-list">
              {courses.map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.title}</strong>
                    <p className="muted">
                      {c.subject} · {c.lessonCount} уроков ·{" "}
                      {c.published ? "опубликован" : "черновик"}
                    </p>
                  </div>
                  <div className="admin-list__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => startEdit(c.id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => onDelete(c.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form className="admin-form" onSubmit={onSave}>
            <h2>{editingId ? "Редактирование" : "Новый курс"}</h2>
            <label>
              Название
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              Slug
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto"
              />
            </label>
            <label>
              Предмет
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label>
              Уровень
              <select
                value={form.level}
                onChange={(e) =>
                  setForm({
                    ...form,
                    level: e.target.value as typeof form.level,
                  })
                }
              >
                <option value="beginner">Начальный</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </label>
            <label>
              Описание
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </label>
            <label>
              Цвет обложки
              <input
                type="color"
                value={form.coverColor}
                onChange={(e) =>
                  setForm({ ...form, coverColor: e.target.value })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) =>
                  setForm({ ...form, isFree: e.target.checked })
                }
              />
              Бесплатный
            </label>
            {!form.isFree && (
              <label>
                Цена (₸)
                <input
                  type="number"
                  value={form.priceTenge}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceTenge: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm({ ...form, published: e.target.checked })
                }
              />
              Опубликован
            </label>

            <h3>Уроки</h3>
            {form.lessons.map((lesson, idx) => (
              <fieldset key={idx} className="lesson-draft">
                <legend>Урок {idx + 1}</legend>
                <label>
                  Заголовок
                  <input
                    value={lesson.title}
                    onChange={(e) => {
                      const lessons = [...form.lessons];
                      lessons[idx] = { ...lesson, title: e.target.value };
                      setForm({ ...form, lessons });
                    }}
                    required
                  />
                </label>
                <label>
                  Кратко
                  <input
                    value={lesson.summary}
                    onChange={(e) => {
                      const lessons = [...form.lessons];
                      lessons[idx] = { ...lesson, summary: e.target.value };
                      setForm({ ...form, lessons });
                    }}
                  />
                </label>
                <label>
                  Содержание (markdown-lite)
                  <textarea
                    value={lesson.content}
                    onChange={(e) => {
                      const lessons = [...form.lessons];
                      lessons[idx] = { ...lesson, content: e.target.value };
                      setForm({ ...form, lessons });
                    }}
                    rows={5}
                    required
                  />
                </label>
                <label>
                  Минут
                  <input
                    type="number"
                    value={lesson.durationMinutes}
                    onChange={(e) => {
                      const lessons = [...form.lessons];
                      lessons[idx] = {
                        ...lesson,
                        durationMinutes: Number(e.target.value) || 10,
                      };
                      setForm({ ...form, lessons });
                    }}
                  />
                </label>
              </fieldset>
            ))}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                setForm({
                  ...form,
                  lessons: [
                    ...form.lessons,
                    emptyLesson(form.lessons.length + 1),
                  ],
                })
              }
            >
              + Урок
            </button>

            <div className="admin-form__actions">
              <button type="submit" className="btn btn--primary">
                {editingId ? "Сохранить" : "Создать"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={resetForm}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === "users" && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Курсы</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.enrollmentsCount}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
