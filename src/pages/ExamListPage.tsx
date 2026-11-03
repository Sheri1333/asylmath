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

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${months[m - 1]} ${y}`;
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
              <span>Күн бойынша белгіленген толық тесттер</span>
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
              return (
                <li key={ex.id} className="exam-card">
                  <div className="exam-card__date">
                    <Icon name="calendar_month" size={22} />
                    <div>
                      <strong>{fmtDate(ex.date)}</strong>
                      <small>{ex.questionCount} сұрақ · шек {ex.passPercent}%</small>
                    </div>
                  </div>
                  <div className="exam-card__body">
                    <h2>{ex.title}</h2>
                    {ex.description && <p>{ex.description}</p>}
                    <div className="exam-card__meta">
                      {ex.timeLimitMinutes > 0 && (
                        <span><Icon name="timer" size={16} />{ex.timeLimitMinutes} мин</span>
                      )}
                      {done && (
                        <span className={ok ? "ok" : "bad"}>
                          <Icon name={ok ? "check_circle" : "error"} size={16} fill={ok} />
                          {ex.result!.best}/{ex.result!.total}
                          {ok ? " · өтті" : " · қайталау керек"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/tests/exam/${ex.id}`} className="qz-next">
                    {done ? "Нәтиже / қайталау" : "Тестті бастау"}
                    <Icon name="arrow_forward" size={16} />
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
