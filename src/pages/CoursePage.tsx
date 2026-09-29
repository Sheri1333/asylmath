import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageShell, levelLabel } from "../components/Layout";
import type { CourseSummary, EnrollmentInfo } from "../types/course";

export function CoursePage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getCourse(slug);
    setCourse(data.course);
    setEnrollment(data.enrollment);
  }

  useEffect(() => {
    setError("");
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка"),
    );
  }, [slug]);

  async function onEnroll() {
    if (!user) {
      navigate("/login", { state: { from: `/courses/${slug}` } });
      return;
    }
    if (!course) return;
    setBusy(true);
    setError("");
    try {
      await api.enroll(course.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записаться");
    } finally {
      setBusy(false);
    }
  }

  if (error && !course) {
    return (
      <PageShell>
        <p className="banner banner--error">{error}</p>
        <Link to="/">← К каталогу</Link>
      </PageShell>
    );
  }

  if (!course) {
    return (
      <PageShell>
        <p className="muted">Загрузка…</p>
      </PageShell>
    );
  }

  const completed = new Set(enrollment?.completedLessonIds ?? []);

  return (
    <PageShell>
      <Link to="/" className="back-link">
        ← Все курсы
      </Link>

      <section
        className="course-hero"
        style={{ ["--cover" as string]: course.coverColor }}
      >
        <div className="course-hero__panel">
          <p className="hero__eyebrow">
            {course.subject} · {levelLabel(course.level)}
          </p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-hero__stats">
            <span>{course.lessonCount} уроков</span>
            <span>{course.durationMinutes} минут</span>
            <span>
              {course.isFree
                ? "Бесплатно"
                : `${course.priceTenge?.toLocaleString("ru-RU")} ₸`}
            </span>
          </div>
          {enrollment ? (
            <div className="progress-block">
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
              <p>Прогресс: {enrollment.progressPercent}%</p>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={onEnroll}
            >
              {busy ? "…" : "Записаться на курс"}
            </button>
          )}
          {error && <p className="banner banner--error">{error}</p>}
        </div>
      </section>

      <section className="lessons-section">
        <h2>Программа</h2>
        <ol className="lesson-list">
          {(course.lessons ?? []).map((lesson) => {
            const done = completed.has(lesson.id);
            const canOpen = Boolean(enrollment);
            const inner = (
              <>
                <span className="lesson-list__order">{lesson.order}</span>
                <div>
                  <strong>{lesson.title}</strong>
                  <p>{lesson.summary}</p>
                </div>
                <span className="lesson-list__meta">
                  {done ? "✓ " : ""}
                  {lesson.durationMinutes} мин
                </span>
              </>
            );
            return (
              <li key={lesson.id} className={done ? "is-done" : undefined}>
                {canOpen ? (
                  <Link to={`/courses/${course.slug}/lessons/${lesson.id}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className="lesson-list__locked">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
        {!enrollment && (
          <p className="muted">Запишитесь на курс, чтобы открыть уроки.</p>
        )}
      </section>
    </PageShell>
  );
}
