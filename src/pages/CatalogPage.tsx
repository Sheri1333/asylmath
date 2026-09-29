import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PageShell, levelLabel } from "../components/Layout";
import type { CourseSummary } from "../types/course";

export function CatalogPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listCourses()
      .then((data) => setCourses(data.courses))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Ошибка загрузки"),
      )
      .finally(() => setLoading(false));
  }, []);

  const subjects = [...new Set(courses.map((c) => c.subject))].sort();
  const visible = subject
    ? courses.filter((c) => c.subject === subject)
    : courses;

  return (
    <PageShell>
      <section className="hero">
        <p className="hero__eyebrow">Онлайн-курсы</p>
        <h1 className="hero__title">AslMath</h1>
        <p className="hero__lead">
          Математика по шагам: алгебра, геометрия и анализ. Записывайтесь на
          курс и отмечайте пройденные уроки.
        </p>
      </section>

      <div className="toolbar">
        <button
          type="button"
          className={!subject ? "chip chip--active" : "chip"}
          onClick={() => setSubject("")}
        >
          Все
        </button>
        {subjects.map((s) => (
          <button
            key={s}
            type="button"
            className={subject === s ? "chip chip--active" : "chip"}
            onClick={() => setSubject(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="banner banner--error">{error}</p>}
      {loading && <p className="muted">Загрузка курсов…</p>}

      {!loading && !error && (
        <div className="course-grid">
          {visible.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="course-card"
              style={{ ["--cover" as string]: course.coverColor }}
            >
              <div className="course-card__cover" />
              <div className="course-card__body">
                <div className="course-card__meta">
                  <span>{course.subject}</span>
                  <span>{levelLabel(course.level)}</span>
                </div>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <div className="course-card__footer">
                  <span>
                    {course.lessonCount} уроков · {course.durationMinutes} мин
                  </span>
                  <span className="course-card__price">
                    {course.isFree
                      ? "Бесплатно"
                      : `${course.priceTenge?.toLocaleString("ru-RU")} ₸`}
                  </span>
                </div>
                {course.enrolled && (
                  <span className="badge">Вы записаны</span>
                )}
              </div>
            </Link>
          ))}
          {visible.length === 0 && (
            <p className="muted">Пока нет опубликованных курсов.</p>
          )}
        </div>
      )}
    </PageShell>
  );
}
