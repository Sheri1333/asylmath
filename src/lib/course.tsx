import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";
import type { CourseView, OutlineLesson, OutlineSection } from "../types/course";

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

/** First open section whose test is not passed yet. */
export function nextQuiz(outline: OutlineSection[]): OutlineSection | null {
  return outline.find((s) => s.quiz && !s.quiz.locked && !s.quiz.result?.passed) ?? null;
}

/** Nothing to study yet: no lessons and no test. */
export function sectionEmpty(s: OutlineSection): boolean {
  return s.lessons.length === 0 && !s.quiz;
}

export function sectionDone(s: OutlineSection): boolean {
  const lessonsDone = s.lessons.length > 0 && s.lessons.every((l) => l.completed);
  return s.quiz ? Boolean(s.quiz.result?.passed) : lessonsDone;
}

export function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtMoney(n: number | null): string {
  return n ? `${n.toLocaleString("ru-RU").replace(/,/g, " ")} ₸` : "Тегін";
}

// ── Video ──

export type Video = { kind: "iframe"; src: string } | { kind: "file"; src: string } | { kind: "link"; src: string };

export function parseVideo(url: string | null | undefined): Video | null {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/kinescope\.io\/(?:embed\/)?[\w-]+/.test(u)) return { kind: "iframe", src: u.replace(/kinescope\.io\/(?!embed)/, "kinescope.io/embed/") };
  if (/\.(mp4|webm|m3u8|mov)(\?|$)/i.test(u) || u.startsWith("/api/files/")) return { kind: "file", src: u };
  return { kind: "link", src: u };
}

export function VideoFrame({ url, title }: { url: string | null; title: string }) {
  const v = parseVideo(url);
  if (!v)
    return (
      <div className="vid vid--empty">
        <span>Бұл сабақтың видеосы жақында қосылады. Әзірге төмендегі конспектті оқыңыз.</span>
      </div>
    );
  if (v.kind === "iframe")
    return (
      <div className="vid">
        <iframe src={v.src} title={title} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
      </div>
    );
  if (v.kind === "file")
    return (
      <div className="vid">
        <video src={v.src} controls preload="metadata" playsInline />
      </div>
    );
  return (
    <div className="vid vid--empty">
      <a href={v.src} target="_blank" rel="noreferrer">Видеоны жаңа бетте ашу</a>
    </div>
  );
}

// ── Lesson text: a small, safe Markdown subset ──

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<b key={k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={k++} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer">{label}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
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
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
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
