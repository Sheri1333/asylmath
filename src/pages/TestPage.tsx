import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
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
    const done = mode === "result";
    localStorage.setItem(KEY, JSON.stringify({ picks, flags, done }));
  }, [picks, flags, mode]);

  const score = useMemo(
    () => quiz.filter((q, i) => picks[i] === q.answer).length,
    [picks],
  );
  const q = quiz[index];
  const answered = Object.keys(picks).length;

  return (
    <Shell crumbs="Басты бет › Курс модульдері">
      <p className="crumbs">3-бөлім: Теңдеулер › 3.3 Виет теоремасы › Тақырып тесті</p>
      <div className="row-between quiz-head">
        <div>
          <h1>3.3 Виет теоремасы — тақырыптық сынақ тест</h1>
          <p>Келесі тақырыпты («3.4 Модуль бар теңдеулер») ашу үшін кемінде 70% (7/10) жинау қажет.</p>
        </div>
        <div className="hero-actions">
          <button type="button" className={mode === "quiz" ? "btn btn-blue" : "btn btn-soft"} onClick={() => setMode("quiz")}>Тест тапсыру</button>
          <button type="button" className={mode === "result" ? "btn btn-blue" : "btn btn-soft"} onClick={() => setMode("result")}>Нәтижелер көрінісі</button>
        </div>
      </div>

      {mode === "result" ? (
        <article className="card result">
          <h2>{score} / 10</h2>
          <p>{score >= 7 ? "Шек өтті. Келесі тақырып ашылды." : "Шек 70%. Қайта тапсырып көріңіз."}</p>
          <div className="bar"><i style={{ width: `${score * 10}%` }} /></div>
          <ol className="review">
            {quiz.map((item, i) => (
              <li key={item.prompt} className={picks[i] === item.answer ? "ok" : "bad"}>
                <b>{i + 1}.</b> {item.prompt}
                <span>Жауабыңыз: {picks[i] || "—"} · Дұрысы: {item.answer}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-orange"
            onClick={() => {
              setPicks({});
              setFlags([]);
              setIndex(0);
              setMode("quiz");
            }}
          >
            Қайта бастау
          </button>
        </article>
      ) : (
        <div className="quiz">
          <article className="card">
            <div className="row-between">
              <b>Сұрақ: {index + 1} / 10</b>
              <span>{answered * 10}% аяқталды · {fmt(left)} · шек 70%</span>
            </div>
            <div className="bar"><i style={{ width: `${((index + 1) / 10) * 100}%` }} /></div>
            <div className="row-between">
              <span>{index + 1}-сұрақ · {q.level} · 1 балл</span>
              <button type="button" className="linkish" onClick={() => setFlags((f) => f.includes(index) ? f.filter((n) => n !== index) : [...f, index])}>
                {flags.includes(index) ? "Белгі алынды" : "Белгілеу"}
              </button>
            </div>
            <h2>{q.prompt}</h2>
            <p className="hint">{q.hint}</p>
            <div className="choices">
              {q.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={picks[index] === c.id ? "on" : ""}
                  onClick={() => setPicks({ ...picks, [index]: c.id })}
                >
                  <b>{c.id}</b>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="lesson-nav">
              <button type="button" className="btn btn-soft" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Алдыңғы сұрақ</button>
              {index === quiz.length - 1 ? (
                <button type="button" className="btn btn-orange" onClick={() => setMode("result")}>Тестті аяқтау</button>
              ) : (
                <button type="button" className="btn btn-blue" onClick={() => setIndex((i) => i + 1)}>Келесі сұрақ</button>
              )}
            </div>
          </article>
          <aside className="card matrix">
            <h3>Сұрақтар матрицасы</h3>
            <p>10 сұрақ</p>
            <div>
              {quiz.map((_, i) => {
                const cls = i === index ? "cur" : flags.includes(i) ? "flag" : picks[i] ? "ans" : "";
                return (
                  <button key={i} type="button" className={cls} onClick={() => setIndex(i)}>{i + 1}</button>
                );
              })}
            </div>
            <ul>
              <li>Жауап берілді ({answered})</li>
              <li>Ағымдағы (1)</li>
              <li>Белгіленген ({flags.length})</li>
              <li>Ашылмаған ({10 - answered - (picks[index] ? 0 : 1)})</li>
            </ul>
            <Link to="/lesson">Сабаққа оралу</Link>
          </aside>
        </div>
      )}
    </Shell>
  );
}
