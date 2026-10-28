import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";
import { parseLesson } from "./lessonText";
import { Formula } from "./math";
import type { CourseView, OutlineLesson, OutlineSection, QuizResultSummary } from "../types/course";

let featuredSlug: string | null = null;

/** The course the cabinet is built around (the one marked "main" in the admin). */
export async function mainSlug(): Promise<string> {
  if (!featuredSlug) featuredSlug = (await api.featured()).slug;
  return featuredSlug;
}

export function useMainCourse() {
  const [view, setView] = useState<CourseView | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const load = useCallback(async () => {
    try {
      const slug = await mainSlug();
      setView(await api.course(slug));
      setError(null);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Қате", status: e instanceof ApiError ? e.status : 0 });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { view, error, reload: load };
}

/** First lesson the student can open and has not finished. */
export function nextLesson(outline: OutlineSection[]): { section: OutlineSection; lesson: OutlineLesson } | null {
  for (const section of outline) {
    for (const lesson of section.lessons) {
      if (!lesson.locked && !lesson.completed) return { section, lesson };
    }
  }
  return null;
}

export interface QuizStop {
  id: string;
  to: string;
  title: string;
  heading: string;
  order: number;
  questionCount: number;
  passPercent: number;
  timeLimitMinutes: number;
  locked: boolean;
  result: QuizResultSummary | null;
}

/** Lesson tests first, then the section test. Order follows the course. */
export function quizStops(outline: OutlineSection[]): QuizStop[] {
  const out: QuizStop[] = [];
  for (const s of outline) {
    s.lessons.forEach((l, i) => {
      if (!l.quiz) return;
      out.push({
        id: l.id,
        to: `/tests/lesson/${l.id}`,
        title: l.title,
        heading: `${s.order}.${i + 1} сабақ тесті`,
        order: s.order,
        questionCount: l.quiz.questionCount,
        passPercent: l.quiz.passPercent,
        timeLimitMinutes: l.quiz.timeLimitMinutes,
        locked: l.quiz.locked,
        result: l.quiz.result,
      });
    });
    if (s.quiz) {
      out.push({
        id: s.id,
        to: `/tests/${s.id}`,
        title: s.title,
        heading: `${s.order}-бөлім тесті`,
        order: s.order,
        questionCount: s.quiz.questionCount,
        passPercent: s.quiz.passPercent,
        timeLimitMinutes: s.quiz.timeLimitMinutes,
        locked: s.quiz.locked,
        result: s.quiz.result,
      });
    }
  }
  return out;
}

/** Next test the student can open and has not passed. */
export function nextQuiz(outline: OutlineSection[]): QuizStop | null {
  return quizStops(outline).find((q) => !q.locked && !q.result?.passed) ?? null;
}

/** Nothing to study yet: no lessons and no test. */
export function sectionEmpty(s: OutlineSection): boolean {
  return s.lessons.length === 0 && !s.quiz;
}

export function sectionDone(s: OutlineSection): boolean {
  if (sectionEmpty(s)) return false;
  const lessonQuizzesOk = s.lessons.every((l) => !l.quiz || Boolean(l.quiz.result?.passed));
  if (s.quiz) return Boolean(s.quiz.result?.passed) && lessonQuizzesOk;
  return s.lessons.length > 0 && s.lessons.every((l) => l.completed) && lessonQuizzesOk;
}

export function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtMoney(n: number | null): string {
  return n ? `${n.toLocaleString("ru-RU").replace(/,/g, " ")} ₸` : "Тегін";
}

// ── Video: see ./video ──

export { parseVideo, VideoFrame, normalizeVideoUrl } from "./video";
export type { Video } from "./video";
export { Formula, MathText, FormulaOrText, ChoiceMath } from "./math";

// ── Lesson text: a small, safe Markdown subset ──

function formatPlain(text: string, keyBase: number): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={keyBase + k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<code key={keyBase + k++}>{t.slice(1, -1)}</code>);
    else {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(
        <a key={keyBase + k++} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer">
          {label}
        </a>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function inline(text: string, plain: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...formatPlain(text.slice(last, m.index), k * 100));
    const display = m[1] != null;
    const tex = (display ? m[1] : m[2]).trim();
    out.push(
      plain ? (
        <Formula key={`m${k}`} tex={tex} display={display} />
      ) : display ? (
        <div key={`m${k}`} className="math-frame">
          <Formula tex={tex} display />
        </div>
      ) : (
        <span key={`m${k}`} className="math-frame math-frame--inline">
          <Formula tex={tex} />
        </span>
      ),
    );
    k += 1;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...formatPlain(text.slice(last), k * 100));
  return out;
}

function Board({ tex, caption, plain }: { tex: string; caption?: string; plain?: boolean }) {
  if (plain) {
    return (
      <div className="quiz-formula">
        {caption && <div>{caption}</div>}
        <Formula tex={tex} display />
      </div>
    );
  }
  return (
    <figure className="math-frame">
      {caption && <figcaption>{caption}</figcaption>}
      <Formula tex={tex} display />
    </figure>
  );
}

export function Markdown({ text, plain = false }: { text: string; plain?: boolean }) {
  const blocks = parseLesson(text).map((block, k) => {
    if (block.kind === "board") return <Board key={k} tex={block.tex} caption={block.caption} plain={plain} />;
    if (block.kind === "heading") {
      return block.level === 2 ? <h3 key={k}>{inline(block.text, plain)}</h3> : <h4 key={k}>{inline(block.text, plain)}</h4>;
    }
    if (block.kind === "list") {
      return (
        <ul key={k}>
          {block.items.map((it, j) => (
            <li key={j}>{inline(it, plain)}</li>
          ))}
        </ul>
      );
    }
    if (block.kind === "table") {
      return (
        <div key={k} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {block.header.map((cell, j) => (
                  <th key={j} scope="col">{inline(cell, plain)}</th>
                ))}
              </tr>
            </thead>
            {block.rows.length > 0 && (
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, j) => (
                      <td key={j}>{inline(cell, plain)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );
    }
    if (block.kind === "mistake") {
      return (
        <aside key={k} className="md-mistake">
          {inline(block.text, plain)}
        </aside>
      );
    }
    return <p key={k}>{inline(block.text, plain)}</p>;
  });
  return <div className={plain ? "md md--quiz" : "md"}>{blocks}</div>;
}
