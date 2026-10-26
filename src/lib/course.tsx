import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";
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
export { Formula, MathText, FormulaOrText } from "./math";

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

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...formatPlain(text.slice(last, m.index), k * 100));
    const display = m[1] != null;
    out.push(<Formula key={`m${k}`} tex={(display ? m[1] : m[2]).trim()} display={display} />);
    k += 1;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...formatPlain(text.slice(last), k * 100));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("$$")) {
      let body = trimmed.slice(2);
      if (body.endsWith("$$")) {
        body = body.slice(0, -2);
        i += 1;
      } else {
        const buf = [body];
        i += 1;
        while (i < lines.length && !lines[i].includes("$$")) {
          buf.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) {
          buf.push(lines[i].replace("$$", ""));
          i += 1;
        }
        body = buf.join("\n");
      }
      blocks.push(<Formula key={k++} tex={body.trim()} display />);
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)/);
    if (h) {
      blocks.push(h[1].length === 2 ? <h3 key={k++}>{inline(h[2])}</h3> : <h4 key={k++}>{inline(h[2])}</h4>);
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ""));
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={k++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|\s*[-*]\s|\s*\d+[.)]\s|\$\$)/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length === 1 && /\\[a-zA-Z]+/.test(para[0]) && !para[0].includes("$")) {
      blocks.push(<Formula key={k++} tex={para[0].trim()} display />);
      continue;
    }
    blocks.push(
      <p key={k++}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{blocks}</div>;
}
