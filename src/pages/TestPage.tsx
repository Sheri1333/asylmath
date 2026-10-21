import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { quiz } from "../data/content";

const KEY = "asyl-quiz";

type Saved = { picks: Record<number, string>; flags: number[]; done: boolean };

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { picks: {}, flags: [], done: false };
    return JSON.parse(raw) as Saved;
  } catch {
    return { picks: {}, flags: [], done: false };
  }
}

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

const levelTone = (level: string) => (/жеңіл/i.test(level) ? "easy" : /күрделі/i.test(level) ? "hard" : "mid");

export function TestPage() {
  const saved = load();
  const [index, setIndex] = useState(3);
  const [picks, setPicks] = useState<Record<number, string>>(saved.picks);
  const [flags, setFlags] = useState<number[]>(saved.flags);
  const [mode, setMode] = useState<"quiz" | "result">(saved.done ? "result" : "quiz");
  const [left, setLeft] = useState(14 * 60 + 25);

  useEffect(() => {
    const id = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ picks, flags, done: mode === "result" }));
    } catch {
      /* storage unavailable */
    }
  }, [picks, flags, mode]);

  const score = useMemo(() => quiz.filter((q, i) => picks[i] === q.answer).length, [picks]);
  const q = quiz[index];
  const answered = Object.keys(picks).length;
  const pct = Math.round(((index + 1) / quiz.length) * 100);
  const toggleFlag = () => setFlags((f) => (f.includes(index) ? f.filter((n) => n !== index) : [...f, index]));

  return (
    <Shell variant="study" subtitle="Тақырып тесті" flush>
      <div className="qz-ctx">
        <div className="qz-ctx__info">
          <p className="qz-ctx__crumbs">
            <span>3-бөлім: Теңдеулер</span>
            <Icon name="chevron_right" size={12} />
            <span>3.3 Виет теоремасы</span>
            <Icon name="chevron_right" size={12} />
            <em>Тақырып тесті</em>
          </p>
          <h1>3.3 Виет теоремасы — Тақырыптық сынақ тест</h1>
          <p className="qz-ctx__note">Келесі тақырыпты (<b>«3.4 Модуль бар теңдеулер»</b>) ашу үшін кемінде 70% (7/10) жинау қажет.</p>
        </div>
        <div className="qz-toggle">
          <button type="button" className={mode === "quiz" ? "on" : ""} onClick={() => setMode("quiz")}>
            <Icon name="edit_note" size={15} />Тест тапсыру
          </button>
          <button type="button" className={mode === "result" ? "on" : ""} onClick={() => setMode("result")}>
            <Icon name="workspace_premium" size={14} />Нәтижелер көрінісі
          </button>
        </div>
      </div>

      <div className="qz">
        {mode === "result" ? (
          <div className="qz-res">
            <article className="qz-card qz-res__score">
              <div className={score >= 7 ? "qz-res__ring ok" : "qz-res__ring"}>
                <b>{score}<em>/10</em></b>
                <small>{score * 10}%</small>
              </div>
              <div>
                <h2>{score >= 7 ? "Тест сәтті тапсырылды!" : "Шекке әлі жетпеді"}</h2>
                <p>{score >= 7 ? "«3.4 Модуль бар теңдеулер» тақырыбы ашылды." : "Келесі тақырыпты ашу үшін кемінде 7 дұрыс жауап қажет. Қатемен жұмыс жасап, қайта тапсырыңыз."}</p>
                <div className="qz-res__acts">
                  <button
                    type="button"
                    className="qz-next"
                    onClick={() => {
                      setPicks({});
                      setFlags([]);
                      setIndex(0);
                      setMode("quiz");
                    }}
                  >
                    Қайта тапсыру<Icon name="arrow_forward" size={16} />
                  </button>
                  <Link to="/lesson" className="qz-prev"><Icon name="arrow_back" size={16} />Сабаққа оралу</Link>
                </div>
              </div>
            </article>
            <article className="qz-card">
              <h3 className="qz-res__title">Жауаптар талдауы</h3>
              <ol className="qz-review">
                {quiz.map((item, i) => {
                  const ok = picks[i] === item.answer;
                  return (
                    <li key={item.prompt} className={ok ? "ok" : "bad"}>
                      <span className="qz-review__n">{ok ? <Icon name="check" size={16} /> : <Icon name="close" size={16} />}</span>
                      <div>
                        <p>{i + 1}. {item.prompt}</p>
                        <small>Жауабыңыз: <b>{picks[i] || "—"}</b> · Дұрысы: <b>{item.answer}</b> · {item.hint}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </article>
          </div>
        ) : (
          <div className="qz-grid">
            <div className="qz-main">
              <article className="qz-card qz-status">
                <div className="qz-status__prog">
                  <div>
                    <b><Icon name="quiz" size={18} />Сұрақ: {index + 1} / {quiz.length}</b>
                    <span>{pct}% аяқталды</span>
                  </div>
                  <i><s style={{ width: `${pct}%` }} /></i>
                </div>
                <div className="qz-status__chips">
                  <span className="qz-timer"><Icon name="schedule" size={20} color="#9d4300" />{fmt(left)}</span>
                  <span className="qz-limit"><b>Шек: 70%</b><small>7/10 дұрыс</small></span>
                </div>
              </article>

              <article className="qz-card qz-q">
                <header>
                  <div>
                    <span className="chip">{index + 1}-сұрақ</span>
                    <span className={`chip lvl ${levelTone(q.level)}`}>{q.level}</span>
                    <span className="chip gray">1 балл</span>
                  </div>
                  <button type="button" className={flags.includes(index) ? "qz-flag on" : "qz-flag"} onClick={toggleFlag}>
                    <Icon name="bookmark" size={16} fill={flags.includes(index)} />Белгілеу
                  </button>
                </header>
                <p className="qz-q__text">{mathify(q.prompt)}</p>
                <div className="qz-eq">
                  <b>x² + px + q = 0</b>
                  <span>мұндағы: <i>{q.hint}</i></span>
                </div>
                <div className="qz-opts">
                  {q.choices.map((c) => {
                    const on = picks[index] === c.id;
                    return (
                      <button key={c.id} type="button" className={on ? "on" : ""} onClick={() => setPicks({ ...picks, [index]: c.id })}>
                        <span className="qz-opts__l">{c.id}</span>
                        <span className="qz-opts__t">{c.label}</span>
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
                    <button type="button" className="qz-end" onClick={() => setMode("result")}>Тестті аяқтау</button>
                    {index === quiz.length - 1 ? (
                      <button type="button" className="qz-next" onClick={() => setMode("result")}>
                        Нәтижені көру<Icon name="arrow_forward" size={16} />
                      </button>
                    ) : (
                      <button type="button" className="qz-next" onClick={() => setIndex((i) => i + 1)}>
                        Келесі сұрақ<Icon name="arrow_forward" size={16} />
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            </div>

            <aside className="qz-side">
              <article className="qz-card qz-matrix">
                <header>
                  <h3><Icon name="apps" size={18} color="#00236f" />Сұрақтар матрицасы</h3>
                  <small>{quiz.length} сұрақ</small>
                </header>
                <div className="qz-matrix__grid">
                  {quiz.map((_, i) => {
                    const cls = i === index ? "cur" : flags.includes(i) ? "flag" : picks[i] ? "ans" : "";
                    return (
                      <button key={i} type="button" className={cls} onClick={() => setIndex(i)}>
                        {i + 1}
                        {cls === "flag" && <i />}
                      </button>
                    );
                  })}
                </div>
                <ul>
                  <li><i className="ans" />Жауап берілді ({answered})</li>
                  <li><i className="cur" />Ағымдағы (1)</li>
                  <li><i className="flag" />Белгіленген ({flags.length})</li>
                  <li><i />Ашылмаған ({Math.max(0, quiz.length - answered - (picks[index] ? 0 : 1))})</li>
                </ul>
              </article>
            </aside>
          </div>
        )}
      </div>
    </Shell>
  );
}
