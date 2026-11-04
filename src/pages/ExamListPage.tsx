import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PageState } from "../components/PageState";
import type { ExamSummary } from "../types/course";

const months = [
  "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
  "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
];

function splitDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return { day: iso, month: "", year: "" };
  return { day: String(d), month: months[m - 1], year: String(y) };
}

export function ExamListPage() {
  const [items, setItems] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  function load() {
    setError(null);
    api
      .exams()
      .then((r) => setItems(r.exams))
      .catch((e) => setError({ message: e instanceof Error ? e.message : "Қате", status: 0 }));
  }

  useEffect(() => {
    load();
  }, []);

  if (!items) {
    return (
      <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Сынақтар" }]} subtitle="Сынақтар">
        <PageState error={error} onRetry={load} />
      </Shell>
    );
  }

  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Сынақтар" }]} subtitle="Сынақтар">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>Сынақтар</h1>
            <p>
              <Icon name="event" size={20} color="var(--navy)" />
              <span>Сынақ тесттер · нәтижелер осында</span>
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <div className="acc__empty">
            <p>Әзірге жарияланған сынақ жоқ. Жаңа тест шыққанда осында пайда болады.</p>
            <Link to="/course" className="prog__btn">Курсқа өту<Icon name="arrow_forward" size={16} /></Link>
          </div>
        ) : (
          <ul className="exam-list">
            {items.map((ex) => {
              const done = Boolean(ex.result);
              const ok = Boolean(ex.result?.passed);
              const { day, month, year } = splitDate(ex.date);
              const status = !done ? "new" : ok ? "ok" : "bad";
              const statusLabel = !done
                ? "Жаңа"
                : ok
                  ? `${ex.result!.best}/${ex.result!.total} · өтті`
                  : `${ex.result!.best}/${ex.result!.total} · қайталау`;
              const cta = done ? (ok ? "Нәтиже" : "Қайталау") : "Бастау";

              return (
                <li key={ex.id}>
                  <Link
                    to={`/tests/exam/${ex.id}`}
                    className={`exam-card exam-card--${status}`}
                  >
                    <time className="exam-card__cal" dateTime={ex.date} aria-label={`${day} ${month} ${year}`}>
                      <b>{day}</b>
                      <span>{month}</span>
                    </time>

                    <div className="exam-card__body">
                      <div className="exam-card__top">
                        <h2>{ex.title}</h2>
                        <em className={`exam-card__status exam-card__status--${status}`}>{statusLabel}</em>
                      </div>
                      {ex.description && <p>{ex.description}</p>}
                      <div className="exam-card__meta">
                        <span>{ex.questionCount} сұрақ</span>
                        <span>шек {ex.passPercent}%</span>
                        {ex.timeLimitMinutes > 0 && <span>{ex.timeLimitMinutes} мин</span>}
                      </div>
                    </div>

                    <span className="exam-card__cta">
                      {cta}
                      <Icon name="arrow_forward" size={16} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="adm-muted">Сабақ ішіндегі мини-тесттер курс бағдарламасында ашылады.</p>
      </div>
    </Shell>
  );
}
