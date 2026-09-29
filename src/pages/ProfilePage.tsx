import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageShell, levelLabel } from "../components/Layout";
import type { CourseSummary } from "../types/course";

interface MyEnrollment {
  courseId: string;
  progressPercent: number;
  course: CourseSummary;
}

export function ProfilePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<MyEnrollment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api
      .myEnrollments()
      .then((data) => setItems(data.enrollments as MyEnrollment[]))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Ошибка"),
      );
  }, [user]);

  if (loading) {
    return (
      <PageShell>
        <p className="muted">Загрузка…</p>
      </PageShell>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <PageShell>
      <section className="profile-head">
        <h1>Моё обучение</h1>
        <p className="muted">
          {user.name} · {user.email}
        </p>
      </section>

      {error && <p className="banner banner--error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">
          Вы ещё не записаны ни на один курс.{" "}
          <Link to="/">Открыть каталог</Link>
        </p>
      ) : (
        <div className="course-grid">
          {items.map(({ course, progressPercent }) => (
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
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p>Прогресс: {progressPercent}%</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
