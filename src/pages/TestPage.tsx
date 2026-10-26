import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PageState } from "../components/PageState";
import { FormulaOrText, mainSlug, Markdown, MathText, nextQuiz, useMainCourse } from "../lib/course";
import type { QuizView, ReviewItem } from "../types/course";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Highlights "x₁ = 3"-style tokens the way the Figma question card does. */
function mathify(text: string): ReactNode {
  const parts = text.split(/(x[₁₂] = [−-]?\d+)/g);
  return parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <Fragment key={i}>{p}</Fragment>));
}

function QText({ text }: { text: string }) {
  if (text.includes("$") || text.includes("\\")) return <MathText text={text} />;
  return <>{mathify(text)}</>;
}

const levelName = { easy: "Жеңіл", mid: "Орташа деңгей", hard: "Күрделі" } as const;
const letters = "ABCDEFGH";

/** /tests without an id: the next test the student has to pass. */
export function TestRedirect() {
  const { view, error, reload } = useMainCourse();
  if (view) {
    const target = nextQuiz(view.outline);
    return <Navigate to={target ? target.to : "/course"} replace />;
  }
  return (
    <Shell variant="study" flush streak={false}>
      <PageState error={error} onRetry={reload} />
    </Shell>
  );
}

type Outcome = { score: number; total: number; passed: boolean; review: ReviewItem[] };

export function TestPage() {
  const { sectionId = "", lessonId = "" } = useParams();
  const isLesson = Boolean(lessonId);
  const [data, setData] = useState<QuizView | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [mode, setMode] = useState<"quiz" | "result">("quiz");
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [flags, setFlags] = useState<number[]>([]);
  const [left, setLeft] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState(false);
  const submitted = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const slug = await mainSlug();
      const d = isLesson ? await api.lessonQuiz(slug, lessonId) : await api.quiz(slug, sectionId);
      setData(d);
      setPicks(d.quiz.questions.map(() => -1));
      setFlags([]);
      setIndex(0);
      setLeft(d.quiz.timeLimitMinutes * 60);
      submitted.current = false;
      if (d.result) {
        setOutcome({ score: d.result.last, total: d.result.total, passed: d.result.passed, review: d.result.review });
        setMode("result");
      } else {
        setOutcome(null);
        setMode("quiz");
      }
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Қате", status: e instanceof ApiError ? e.status : 0 });
    }
  }, [sectionId, lessonId, isLesson]);

  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    if (!data || submitted.current) return;
    submitted.current = true;
    setSending(true);
    try {
      const slug = await mainSlug();
      const r = isLesson ? await api.submitLessonQuiz(slug, lessonId, picks) : await api.submitQuiz(slug, sectionId, picks);
      setOutcome(r);
      setMode("result");
      window.scrollTo(0, 0);
    } catch (e) {
      submitted.current = false;
      alert(e instanceof Error ? e.message : "Нәтижені жіберу мүмкін болмады");
    } finally {
      setSending(false);
    }
  }, [data, picks, sectionId, lessonId, isLesson]);

  const timed = Boolean(data?.quiz.timeLimitMinutes);
  useEffect(() => {
    if (!timed || mode !== "quiz") return;
    const id = window.setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [timed, mode]);
  useEffect(() => {
    if (timed && mode === "quiz" && left === 0 && data && !submitted.current) void submit();
  }, [left, timed, mode, data, submit]);

  function restart() {
    if (!data) return;
    setPicks(data.quiz.questions.map(() => -1));
    setFlags([]);
    setIndex(0);
    setLeft(data.quiz.timeLimitMinutes * 60);
    submitted.current = false;
    setMode("quiz");
  }

  if (!data) {
    return (
      <Shell variant="study" flush streak={false}>
        {error?.status === 403 ? (
          <div className="pstate pstate--err">
            <Icon name="lock" size={28} />
            <h2>Тест әлі жабық</h2>
            <p>{error.message}</p>
            <div className="pstate__acts"><Link to="/course" className="qz-next">Курс бағдарламасы</Link></div>
          </div>
        ) : (
          <PageState error={error} onRetry={load} />
        )}
      </Shell>
    );
  }

  const { section, quiz, nextSection, lesson } = data;
  const lessonMode = data.scope === "lesson" || Boolean(lesson);
  const qs = quiz.questions;
  const q = qs[index];
  const answered = picks.filter((p) => p >= 0).length;
  const pct = Math.round(((index + 1) / qs.length) * 100);
  const need = Math.ceil((quiz.passPercent / 100) * qs.length);
  const toggleFlag = () => setFlags((f) => (f.includes(index) ? f.filter((n) => n !== index) : [...f, index]));
  const pick = (i: number) => setPicks((p) => p.map((v, j) => (j === index ? i : v)));
  const last = index === qs.length - 1;
  const counts = qs.reduce(
    (acc, _, i) => {
      if (i === index) return acc;
      if (flags.includes(i)) acc.flag += 1;
      else if (picks[i] >= 0) acc.ans += 1;
      return acc;
    },
    { ans: 0, flag: 0 },
  );
  const finish = () => {
    const missing = qs.length - answered;
    if (missing > 0 && !confirm(`${missing} сұраққа жауап берілмеді. Тестті аяқтайсыз ба?`)) return;
    void submit();
  };

  const results = outcome && (
    <div className="qz-res">
      <article className="qz-card qz-res__score">
        <div className={outcome.passed ? "qz-res__ring ok" : "qz-res__ring"}>
          <b>{outcome.score}<em>/{outcome.total}</em></b>
          <small>{Math.round((outcome.score / outcome.total) * 100)}%</small>
        </div>
        <div>
          <h2>{outcome.passed ? "Тест сәтті тапсырылды!" : "Шекке әлі жетпеді"}</h2>
          <p>
            {outcome.passed
              ? lessonMode
                ? "Сабақ тесті сәтті тапсырылды."
                : nextSection
                  ? `«${nextSection.title}» бөлімі ашылды.`
                  : "Курстың соңғы тестін тапсырдыңыз."
              : `Өту үшін кемінде ${need} дұрыс жауап керек. Төмендегі қателерді қарап, қайта тапсырыңыз.`}
          </p>
          <div className="qz-res__acts">
            {outcome.passed && lessonMode && data.nextLessonId ? (
              <Link to={`/lesson/${data.nextLessonId}`} className="qz-next">Келесі сабаққа өту<Icon name="arrow_forward" size={16} /></Link>
            ) : outcome.passed && nextSection ? (
              <Link to="/lesson" className="qz-next">Келесі бөлімге өту<Icon name="arrow_forward" size={16} /></Link>
            ) : (
              <button type="button" className="qz-next" onClick={restart}>Қайта тапсыру<Icon name="arrow_forward" size={16} /></button>
            )}
            {outcome.passed && <button type="button" className="qz-prev" onClick={restart}>Қайта тапсыру</button>}
            <Link to="/course" className="qz-prev"><Icon name="arrow_back" size={16} />Курс бағдарламасы</Link>
          </div>
        </div>
      </article>
      {qs.map((item, i) => {
        const r = outcome.review[i];
        return (
          <article key={item.id} className="qz-card qz-q qz-after">
            <p className="qz-q__text">{i + 1}. <QText text={item.prompt} /></p>
            {item.formula && (
              <div className="math-frame"><b><FormulaOrText text={item.formula} display /></b></div>
            )}
            <div className="qz-opts">
              {item.choices.map((c, ci) => {
                const good = Boolean(r && ci === r.answer);
                const bad = Boolean(r && r.pick === ci && ci !== r.answer);
                return (
                  <button key={ci} type="button" disabled className={good ? "good" : bad ? "bad" : ""}>
                    <span className="qz-opts__l">{letters[ci]}</span>
                    <span className="qz-opts__t"><FormulaOrText text={c} /></span>
                    <span className="qz-opts__r">{good ? <Icon name="check" size={16} /> : bad ? <Icon name="close" size={16} /> : null}</span>
                  </button>
                );
              })}
            </div>
            {r?.explanation && (
              <div className="qz-errors">
                <strong>Работа с ошибками</strong>
                <Markdown text={r.explanation} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );

  const crumbs = [{ label: "Курс", to: "/course" }, { label: lessonMode ? "Сабақ тесті" : `${section.order}-бөлім тесті` }];

  return (
    <Shell variant="study" subtitle="Курс" flush streak={false} crumbs={crumbs}>
      {/* Phone layout — frame 1:2 */}
      <div className="qm">
        <div className="qm-switch">
          <button type="button" className={mode === "quiz" ? "on" : ""} onClick={() => (outcome ? restart() : setMode("quiz"))}>
            <Icon name="edit_note" size={16} />{outcome ? "Қайта тапсыру" : "Сұрақ барысы"}
          </button>
          <button type="button" className={mode === "result" ? "on" : ""} disabled={!outcome} onClick={() => setMode("result")}>
            <Icon name="emoji_events" size={16} />Қорытынды нәтиже
          </button>
        </div>
        {mode === "quiz" && (
          <>
            <div className="qm-card qm-head">
              <span className="qm-head__ico"><Icon name="assignment" size={18} /></span>
              <div>
                <strong>{lessonMode ? "Сабақ тесті" : `${section.order}-бөлім тесті`}</strong>
                <small>{lessonMode && lesson ? lesson.title : section.title}</small>
              </div>
              <Link to="/course" className="qm-head__x" aria-label="Тесттен шығу"><Icon name="close" size={16} /></Link>
            </div>
            <div className="qm-card qm-prog">
              <div>
                <span><b>{index + 1} / {qs.length} сұрақ</b> <small>({pct}%)</small></span>
                <span className="qm-prog__chips">
                  {timed && <em className="t"><Icon name="timer" size={14} />{fmt(left)}</em>}
                  <em>Шек: {quiz.passPercent}%</em>
                </span>
              </div>
              <i><s style={{ width: `${pct}%` }} /></i>
            </div>
            {q.formula && (
              <div className="qm-banner">
                <div><small>Формула</small><b><FormulaOrText text={q.formula} /></b></div>
                <span><Icon name="calculate" size={22} /></span>
              </div>
            )}
            <article className="qm-q">
              <header>
                <span>Сұрақ #{index + 1}</span>
                <small><Icon name="star" size={16} color="var(--orange)" />1 ұпай</small>
              </header>
              <p className="qm-q__text"><QText text={q.prompt} /></p>
              <p className="qm-q__hint">Бір дұрыс жауапты таңдаңыз</p>
              <div className="qm-opts">
                {q.choices.map((c, i) => {
                  const on = picks[index] === i;
                  return (
                    <button key={i} type="button" className={on ? "on" : ""} aria-pressed={on} aria-label={`${letters[i]}) ${c}`} onClick={() => pick(i)}>
                      <span className="l">{letters[i]}</span>
                      <span className="t"><FormulaOrText text={c} /></span>
                      <Icon name={on ? "check_circle" : "radio_button_unchecked"} size={on ? 22 : 20} />
                    </button>
                  );
                })}
              </div>
            </article>
            <div className="qm-acts">
              <button type="button" className={flags.includes(index) ? "qm-flag on" : "qm-flag"} onClick={index > 0 ? () => setIndex(index - 1) : toggleFlag}>
                {index > 0 ? <><Icon name="arrow_back" size={18} />Алдыңғы</> : <><Icon name="flag" size={18} fill={flags.includes(index)} />Белгілеу</>}
              </button>
              <button type="button" className="qm-next" disabled={sending} onClick={() => (last ? finish() : setIndex(index + 1))}>
                {last ? (sending ? "Тексерілуде…" : "Тестті аяқтау") : "Келесі сұрақ"}<Icon name="arrow_forward" size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="qz-ctx">
        <div className="qz-ctx__info">
          <p className="qz-ctx__crumbs">
            <span>{section.order}-бөлім</span>
            <Icon name="chevron_right" size={12} />
            <span>{section.title}</span>
            <Icon name="chevron_right" size={12} />
            <em>{lessonMode ? "Сабақ тесті" : "Тақырып тесті"}</em>
          </p>
          <h1>{lessonMode && lesson ? `${lesson.title}: сабақ тесті` : `${section.title}: тақырыптық тест`}</h1>
          <p className="qz-ctx__note">
            {lessonMode
              ? <>Сабақты бекіту үшін</>
              : nextSection
                ? <>Келесі бөлімді (<b>«{nextSection.title}»</b>) ашу үшін</>
                : "Тестті өту үшін"}{" "}
            кемінде {quiz.passPercent}% ({need}/{qs.length}) жинау қажет.
          </p>
        </div>
        <div className="qz-toggle">
          <button type="button" className={mode === "quiz" ? "on" : ""} onClick={() => (outcome && mode === "result" ? restart() : setMode("quiz"))}>
            <Icon name="edit_note" size={15} />{outcome ? "Қайта тапсыру" : "Тест тапсыру"}
          </button>
          <button type="button" className={mode === "result" ? "on" : ""} disabled={!outcome} onClick={() => setMode("result")}>
            <Icon name="workspace_premium" size={14} />Нәтижелер көрінісі
          </button>
        </div>
      </div>

      <div className="qz">
        {mode === "result" ? (
          results
        ) : (
          <div className="qz-grid">
            <div className="qz-main">
              <article className="qz-card qz-status">
                <div className="qz-status__prog">
                  <div>
                    <b><Icon name="quiz" size={18} />Сұрақ: {index + 1} / {qs.length}</b>
                    <span>{answered} жауап берілді</span>
                  </div>
                  <i><s style={{ width: `${pct}%` }} /></i>
                </div>
                <div className="qz-status__chips">
                  {timed && <span className={left < 60 ? "qz-timer low" : "qz-timer"}><Icon name="schedule" size={20} color="var(--brown)" />{fmt(left)}</span>}
                  <span className="qz-limit"><b>Шек: {quiz.passPercent}%</b><small>{need}/{qs.length} дұрыс</small></span>
                </div>
              </article>

              <article className="qz-card qz-q">
                <header>
                  <div>
                    <span className="chip">{index + 1}-сұрақ</span>
                    <span className={`chip lvl ${q.level}`}>{levelName[q.level]}</span>
                    <span className="chip gray">1 балл</span>
                  </div>
                  <button type="button" className={flags.includes(index) ? "qz-flag on" : "qz-flag"} onClick={toggleFlag}>
                    <Icon name="bookmark" size={16} fill={flags.includes(index)} />Белгілеу
                  </button>
                </header>
                <p className="qz-q__text"><QText text={q.prompt} /></p>
                {q.formula && (
                  <div className="math-frame"><b><FormulaOrText text={q.formula} display /></b></div>
                )}
                <div className="qz-opts">
                  {q.choices.map((c, i) => {
                    const on = picks[index] === i;
                    return (
                      <button key={i} type="button" className={on ? "on" : ""} aria-pressed={on} aria-label={`${letters[i]}) ${c}`} onClick={() => pick(i)}>
                        <span className="qz-opts__l">{letters[i]}</span>
                        <span className="qz-opts__t"><FormulaOrText text={c} /></span>
                        <span className="qz-opts__r">{on && <Icon name="check" size={16} />}</span>
                      </button>
                    );
                  })}
                </div>
                <footer>
                  <button type="button" className="qz-prev" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                    <Icon name="arrow_back" size={16} />Алдыңғы сұрақ
                  </button>
                  <div>
                    {!last && <button type="button" className="qz-end" onClick={finish}>Тестті аяқтау</button>}
                    <button type="button" className="qz-next" disabled={sending} onClick={() => (last ? finish() : setIndex((i) => i + 1))}>
                      {last ? (sending ? "Тексерілуде…" : "Тестті аяқтау") : "Келесі сұрақ"}<Icon name="arrow_forward" size={16} />
                    </button>
                  </div>
                </footer>
              </article>
            </div>

            <aside className="qz-side">
              <article className="qz-card qz-matrix">
                <header>
                  <h3><Icon name="apps" size={18} color="var(--navy)" />Сұрақтар матрицасы</h3>
                  <small>{qs.length} сұрақ</small>
                </header>
                <div className="qz-matrix__grid">
                  {qs.map((_, i) => {
                    const cls = i === index ? "cur" : flags.includes(i) ? "flag" : picks[i] >= 0 ? "ans" : "";
                    return (
                      <button key={i} type="button" className={cls} aria-label={`${i + 1}-сұрақ`} onClick={() => setIndex(i)}>
                        {i + 1}
                        {cls === "flag" && <i />}
                      </button>
                    );
                  })}
                </div>
                <ul>
                  <li><i className="ans" />Жауап берілді ({counts.ans})</li>
                  <li><i className="cur" />Ағымдағы (1)</li>
                  <li><i className="flag" />Белгіленген ({counts.flag})</li>
                  <li><i />Ашылмаған ({qs.length - 1 - counts.ans - counts.flag})</li>
                </ul>
              </article>
            </aside>
          </div>
        )}
      </div>
    </Shell>
  );
}
