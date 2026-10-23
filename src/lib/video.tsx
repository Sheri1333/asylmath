import { useState } from "react";
import { Icon } from "../components/Icon";

export type Video =
  | { kind: "youtube"; id: string; start: number; src: string; thumb: string; canonical: string }
  | { kind: "iframe"; src: string; provider: string }
  | { kind: "file"; src: string }
  | { kind: "link"; src: string };

const YT_ID = /^[\w-]{11}$/;

/** "90", "90s", "1m30s", "1h2m3s" → seconds. */
function parseTime(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Pulls the src out of a pasted <iframe …> embed code; otherwise returns the text as is. */
function unwrapEmbed(input: string): string {
  const src = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return (src ? src[1] : input).trim().replace(/&amp;/g, "&");
}

function toUrl(input: string): URL | null {
  try {
    return new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
}

/** Every shape a YouTube link arrives in: watch, youtu.be, shorts, live, embed, /v/, mobile, music, a bare id. */
export function youtube(input: string): { id: string; start: number } | null {
  const text = unwrapEmbed(input);
  if (YT_ID.test(text)) return { id: text, start: 0 };
  const url = toUrl(text);
  if (!url) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const seg = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v", "e"].includes(seg[0])) id = seg[1] ?? null;
    }
  }
  if (!id || !YT_ID.test(id)) return null;
  const start = parseTime(url.searchParams.get("t") ?? url.searchParams.get("start") ?? url.hash.match(/t=([\w]+)/)?.[1] ?? null);
  return { id, start };
}

export function parseVideo(raw: string | null | undefined): Video | null {
  if (!raw || !raw.trim()) return null;
  const input = unwrapEmbed(raw);
  const yt = youtube(input);
  if (yt) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    if (yt.start) params.set("start", String(yt.start));
    return {
      kind: "youtube",
      id: yt.id,
      start: yt.start,
      src: `https://www.youtube-nocookie.com/embed/${yt.id}?${params}`,
      thumb: `https://i.ytimg.com/vi/${yt.id}/hqdefault.jpg`,
      canonical: `https://youtu.be/${yt.id}${yt.start ? `?t=${yt.start}` : ""}`,
    };
  }
  const vimeo = input.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "iframe", provider: "Vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/kinescope\.io\/(?:embed\/)?[\w-]+/.test(input))
    return { kind: "iframe", provider: "Kinescope", src: input.replace(/kinescope\.io\/(?!embed)/, "kinescope.io/embed/") };
  if (/\.(mp4|webm|m3u8|mov)(\?|$)/i.test(input) || input.startsWith("/api/files/")) return { kind: "file", src: input };
  return { kind: "link", src: input };
}

/** What the admin should store: a short canonical link for YouTube, the input otherwise. */
export function normalizeVideoUrl(raw: string): string {
  const v = parseVideo(raw);
  if (!v) return "";
  if (v.kind === "youtube") return v.canonical;
  return unwrapEmbed(raw);
}

const IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

/**
 * Lesson player. YouTube shows its preview frame first and loads the real player on click:
 * the page stays fast and nothing from YouTube loads until the student presses play.
 */
export function VideoFrame({ url, title }: { url: string | null; title: string }) {
  const v = parseVideo(url);
  const [playing, setPlaying] = useState(false);

  if (!v)
    return (
      <div className="vid vid--empty">
        <span>Бұл сабақтың видеосы жақында қосылады. Әзірге төмендегі конспектті оқыңыз.</span>
      </div>
    );

  if (v.kind === "youtube") {
    if (!playing)
      return (
        <button type="button" className="vid vid--facade" onClick={() => setPlaying(true)} aria-label={`Видеоны қосу: ${title}`}>
          <img src={v.thumb} alt="" />
          <span className="vid__play"><Icon name="play_arrow" size={40} fill /></span>
          <span className="vid__title">{title}</span>
        </button>
      );
    return (
      <div className="vid">
        <iframe
          src={`${v.src}&autoplay=1`}
          title={title}
          allow={IFRAME_ALLOW}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (v.kind === "iframe")
    return (
      <div className="vid">
        <iframe src={v.src} title={title} allow={IFRAME_ALLOW} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
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
