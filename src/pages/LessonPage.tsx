import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/Layout";
import type { LessonDetail } from "../types/course";

function renderContent(text: string) {
  return text.split(/\n\n+/).map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("### ")) {
      return <h3 key={i}>{trimmed.slice(4)}</h3>;
    }
    const html = trimmed
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br />");
    return (
      <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

export function LessonPage() {
  const { slug = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [nav, setNav] = useState<{
    prevLessonId: string | null;
    nextLessonId: string | null;
  }>({ prevLessonId: null, nextLessonId: null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError("");
    api
      .getLesson(slug, lessonId)
      .then((data) => {
        setCourseTitle(data.course.title);
        setCourseId(data.course.id);
        setLesson(data.lesson);
        setNav(data.navigation);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Ошибка";
        setError(msg);
        if (msg.includes("авторизац") || msg.includes("запишитесь")) {
          navigate(`/courses/${slug}`, { replace: true });
        }
      });
  }, [slug, lessonId, navigate]);

  async function markComplete() {
    if (!lesson || !courseId) return;
    setBusy(true);
    try {
      await api.completeLesson(courseId, lesson.id);
      setLesson({ ...lesson, completed: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (error && !lesson) {
    return (
      <PageShell>
        <p className="banner banner--error">{error}</p>
      </PageShell>
    );
  }

  if (!lesson) {
    return (
      <PageShell>
        <p className="muted">Загрузка урока…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Link to={`/courses/${slug}`} className="back-link">
        ← {courseTitle}
      </Link>

      <article className="lesson-view">
        <header>
          <p className="hero__eyebrow">
            Урок {lesson.order} · {lesson.durationMinutes} мин
          </p>
          <h1>{lesson.title}</h1>
          <p className="muted">{lesson.summary}</p>
        </header>

        {lesson.videoUrl && (
          <div className="lesson-view__video">
            <a href={lesson.videoUrl} target="_blank" rel="noreferrer">
              Открыть видео →
            </a>
          </div>
        )}

        <div className="lesson-view__content">{renderContent(lesson.content)}</div>

        <div className="lesson-view__actions">
          {!lesson.completed ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={markComplete}
            >
              {busy ? "…" : "Отметить как пройденный"}
            </button>
          ) : (
            <span className="badge">Урок пройден</span>
          )}

          <div className="lesson-view__nav">
            {nav.prevLessonId ? (
              <Link
                className="btn btn--ghost"
                to={`/courses/${slug}/lessons/${nav.prevLessonId}`}
              >
                ← Предыдущий
              </Link>
            ) : (
              <span />
            )}
            {nav.nextLessonId ? (
              <Link
                className="btn btn--ghost"
                to={`/courses/${slug}/lessons/${nav.nextLessonId}`}
              >
                Следующий →
              </Link>
            ) : (
              <Link className="btn btn--ghost" to={`/courses/${slug}`}>
                К курсу
              </Link>
            )}
          </div>
        </div>
      </article>
    </PageShell>
  );
}
