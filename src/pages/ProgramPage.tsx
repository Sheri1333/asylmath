import { useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { AccessCard } from "../components/AccessCard";
import { useMainCourse, sectionDone, sectionEmpty } from "../lib/course";
import { PageState } from "../components/PageState";

export function ProgramPage() {
  const { view, error, reload } = useMainCourse();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!view) {
    return (
      <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Курс бағдарламасы" }]} subtitle="Курс">
        <PageState error={error} onRetry={reload} />
      </Shell>
    );
  }

  const { course, outline, enrollment, access } = view;
  const total = outline.reduce((n, s) => n + s.lessons.length, 0);
  const done = outline.reduce((n, s) => n + s.lessons.filter((l) => l.completed).length, 0);
  const current = outline.find((s) => s.open && !sectionEmpty(s) && !sectionDone(s));
  const expanded = openId ?? current?.id ?? outline[0]?.id;

  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Курс бағдарламасы" }]} subtitle="Курс">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>{course.title}</h1>
            <p>
              <Icon name="menu_book" size={20} color="var(--navy)" />
              <span>{outline.length} бөлім, {total} сабақ</span>
              {access && (
                <>
                  <i />
                  <span><b>{done}</b> сабақ өтілді</span>
                </>
              )}
            </p>
          </div>
          {access && enrollment && (
            <div className="prog-meter" aria-label={`Курс ${enrollment.progressPercent}% өтілді`}>
              <b>{enrollment.progressPercent}%</b>
              <i><s style={{ width: `${enrollment.progressPercent}%` }} /></i>
            </div>
          )}
        </section>

        {!access && <AccessCard view={view} onChange={reload} />}

        <div className="prog">
          {outline.map((s) => {
            const isDone = sectionDone(s);
            const state = sectionEmpty(s) ? "soon" : !s.open ? "lock" : isDone ? "done" : s.id === current?.id ? "now" : "open";
            const lessonsDone = s.lessons.filter((l) => l.completed).length;
            const isOpen = expanded === s.id;
            return (
              <article key={s.id} className={`prog__item ${state} ${isOpen ? "expanded" : ""}`}>
                <button type="button" className="prog__head" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? "" : s.id)}>
                  <span className="prog__n">
                    {state === "done" ? <Icon name="check" size={18} /> : state === "lock" ? <Icon name="lock" size={16} /> : s.order}
                  </span>
                  <span className="prog__title">
                    <strong>{s.order}. {s.title}</strong>
                    <small>
                      {s.lessons.length ? `${lessonsDone} / ${s.lessons.length} сабақ` : "Сабақтар жақында қосылады"}
                      {s.quiz && ` · тест ${s.quiz.questionCount} сұрақ`}
                    </small>
                  </span>
                  <Icon name="expand_more" size={24} className="prog__chev" />
                </button>
                {isOpen && (
                  <div className="prog__body">
                    {s.description && <p className="prog__desc">{s.description}</p>}
                    {!s.open && access && <p className="prog__hint">Бұл бөлім алдыңғы бөлімнің тестін тапсырғаннан кейін ашылады.</p>}
                    <ul className="prog__lessons">
                      {s.lessons.map((l) => (
                        <li key={l.id} className={l.completed ? "done" : l.locked ? "lock" : ""}>
                          {l.locked ? (
                            <span className="prog__row">
                              <Icon name="lock" size={18} />
                              <span>{l.title}</span>
                              <em>{l.durationMinutes} мин</em>
                            </span>
                          ) : (
                            <Link className="prog__row" to={`/lesson/${l.id}`}>
                              <Icon name={l.completed ? "check_circle" : "play_circle"} size={18} fill={l.completed} />
                              <span>{l.title}</span>
                              {l.isPreview && !access && <b className="prog__free">Тегін</b>}
                              <em>{l.durationMinutes} мин</em>
                            </Link>
                          )}
                        </li>
                      ))}
                      {s.quiz && (
                        <li className={s.quiz.result?.passed ? "done quiz" : s.quiz.locked ? "lock quiz" : "quiz"}>
                          {s.quiz.locked ? (
                            <span className="prog__row">
                              <Icon name="lock" size={18} />
                              <span>Тақырып тесті</span>
                              <em>{s.quiz.questionCount} сұрақ</em>
                            </span>
                          ) : (
                            <Link className="prog__row" to={`/tests/${s.id}`}>
                              <Icon name="quiz" size={18} />
                              <span>Тақырып тесті</span>
                              <em>
                                {s.quiz.result
                                  ? `${s.quiz.result.best} / ${s.quiz.result.total}${s.quiz.result.passed ? " · өтті" : ""}`
                                  : `${s.quiz.questionCount} сұрақ`}
                              </em>
                            </Link>
                          )}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
          {outline.length === 0 && <p className="adm-muted">Курс бағдарламасы әлі толтырылмаған.</p>}
        </div>
      </div>
    </Shell>
  );
}

