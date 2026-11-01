import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Teacher-facing chart block. Written inside a fenced block:
 *
 *   ```график
 *   title: Парабола
 *   fn: x^2 - 4
 *   from: -4
 *   to: 4
 *   ```
 *
 * or as points (line or bars):
 *
 *   ```график
 *   type: bar
 *   x: 2019, 2020, 2021
 *   y: 12, 18, 31
 *   ```
 */

export type ChartSpec =
  | { kind: "fn"; title: string; fn: string; from: number; to: number; xlabel: string; ylabel: string }
  | { kind: "line" | "bar"; title: string; x: string[]; y: number[]; xlabel: string; ylabel: string };

export function parseChart(raw: string): ChartSpec | null {
  const map: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([a-zA-Zа-яА-Яәғқңөұүһі]+)\s*:\s*(.*)$/);
    if (m) map[m[1].toLowerCase()] = m[2].trim();
  }
  const title = map.title ?? map["тақырып"] ?? "";
  const xlabel = map.xlabel ?? "";
  const ylabel = map.ylabel ?? "";
  if (map.fn) {
    const from = Number(map.from ?? -5);
    const to = Number(map.to ?? 5);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return null;
    return { kind: "fn", title, fn: map.fn, from, to, xlabel, ylabel };
  }
  if (map.x && map.y) {
    const xs = map.x.split(",").map((s) => s.trim()).filter(Boolean);
    const ys = map.y.split(",").map((s) => Number(s.trim()));
    if (xs.length === 0 || xs.length !== ys.length || ys.some((v) => !Number.isFinite(v))) return null;
    const type = /bar|бағана/i.test(map.type ?? "") ? "bar" : "line";
    return { kind: type, title, x: xs, y: ys, xlabel, ylabel };
  }
  return null;
}

// ── Safe expression parser for y = f(x): numbers, x, + − × ÷ ^, parentheses, a few functions ──

type Node = { t: "num"; v: number } | { t: "x" } | { t: "neg"; a: Node } | { t: "bin"; op: string; a: Node; b: Node } | { t: "call"; f: string; a: Node };

const CONST: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E };
const FUNCS: Record<string, (v: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  ln: Math.log, log: Math.log10, exp: Math.exp,
};

export function parseFn(src: string): ((x: number) => number) | null {
  const s = src.replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\s+/g, "").replace(/\^/g, "^");
  // Implicit multiplication as teachers write it: 2x, 3(x+1), 2sin(x), x(x-1).
  const withMul = s
    .replace(/(\d|\))(?=[x(π]|pi|sqrt|sin|cos|tan|ln|log|exp|abs)/g, "$1*")
    .replace(/(x)(?=\(|x|\d)/g, "$1*");
  const toks: string[] = withMul.match(/\d+\.?\d*|[a-zA-Zπ]+|\*\*|[-+*/^(),]/g) ?? [];
  let p = 0;
  const peek = () => toks[p];
  const eat = (t?: string) => {
    const cur = toks[p++];
    if (t && cur !== t) throw new Error("expected " + t);
    return cur;
  };
  const primary = (): Node => {
    const t = eat();
    if (t === undefined) throw new Error("eof");
    if (/^\d/.test(t)) return { t: "num", v: Number(t) };
    if (t === "(") {
      const n = expr();
      eat(")");
      return n;
    }
    if (t === "x") return { t: "x" };
    if (CONST[t] !== undefined) return { t: "num", v: CONST[t] };
    if (FUNCS[t] && peek() === "(") {
      eat("(");
      const a = expr();
      eat(")");
      return { t: "call", f: t, a };
    }
    throw new Error("bad token " + t);
  };
  const power = (): Node => {
    const base = primary();
    if (peek() === "^") {
      eat("^");
      return { t: "bin", op: "^", a: base, b: unary() };
    }
    return base;
  };
  const unary = (): Node => (peek() === "-" ? (eat(), { t: "neg", a: unary() }) : power());
  const term = (): Node => {
    let n = unary();
    while (peek() === "*" || peek() === "/") {
      const op = eat();
      n = { t: "bin", op: op!, a: n, b: unary() };
    }
    return n;
  };
  const expr = (): Node => {
    let n = term();
    while (peek() === "+" || peek() === "-") {
      const op = eat();
      n = { t: "bin", op: op!, a: n, b: term() };
    }
    return n;
  };
  let ast: Node;
  try {
    ast = expr();
    if (p !== toks.length) return null;
  } catch {
    return null;
  }
  const ev = (n: Node, x: number): number => {
    switch (n.t) {
      case "num": return n.v;
      case "x": return x;
      case "neg": return -ev(n.a, x);
      case "call": return FUNCS[n.f](ev(n.a, x));
      case "bin": {
        const a = ev(n.a, x), b = ev(n.b, x);
        if (n.op === "+") return a + b;
        if (n.op === "-") return a - b;
        if (n.op === "*") return a * b;
        if (n.op === "/") return a / b;
        return Math.pow(a, b);
      }
    }
  };
  return (x) => ev(ast, x);
}

// ── Scales and ticks ──

function niceStep(span: number, n = 5): number {
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

function ticks(a: number, b: number): number[] {
  const s = niceStep(b - a);
  const out: number[] = [];
  for (let v = Math.ceil(a / s) * s; v <= b + s * 1e-6; v += s) out.push(Number(v.toFixed(10)));
  return out;
}

const fmt = (v: number) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(1) : String(Number(v.toFixed(2))));

const W = 640;
const H = 360;
const PL = 56;
const PR = 24;
const PT = 24;
const PB = 48;

export function Chart({ raw }: { raw: string }) {
  const spec = parseChart(raw);
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!spec) {
    return <p className="chart-error">График: не удалось прочитать описание. Проверьте формат блока ```график.</p>;
  }

  let body: ReactNode;
  let caption = spec.title;

  if (spec.kind === "fn") {
    const f = parseFn(spec.fn);
    if (!f) return <p className="chart-error">График: формула «{spec.fn}» не распознана.</p>;
    const N = 240;
    const pts: Array<[number, number] | null> = [];
    for (let i = 0; i <= N; i++) {
      const x = spec.from + ((spec.to - spec.from) * i) / N;
      const y = f(x);
      pts.push(Number.isFinite(y) && Math.abs(y) < 1e6 ? [x, y] : null);
    }
    const valid = pts.filter((p): p is [number, number] => p !== null);
    if (valid.length < 2) return <p className="chart-error">График: на этом промежутке функция не определена.</p>;
    let y0 = Math.min(...valid.map((p) => p[1]));
    let y1 = Math.max(...valid.map((p) => p[1]));
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const pad = (y1 - y0) * 0.08;
    y0 = y0 - pad;
    y1 = y1 + pad;
    const x0 = spec.from, x1 = spec.to;
    const sx = (x: number) => PL + ((x - x0) / (x1 - x0)) * (W - PL - PR);
    const sy = (y: number) => H - PB - ((y - y0) / (y1 - y0)) * (H - PT - PB);
    // Break the curve where it jumps (tan, 1/x): keeps the drawing honest.
    const segs: string[] = [];
    let cur = "";
    let prev: [number, number] | null = null;
    for (const p of pts) {
      if (!p) { if (cur) segs.push(cur); cur = ""; prev = null; continue; }
      if (prev && Math.abs(p[1] - prev[1]) > (y1 - y0) * 0.6) { segs.push(cur); cur = ""; }
      cur += `${cur ? "L" : "M"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)} `;
      prev = p;
    }
    if (cur) segs.push(cur);
    body = (
      <>
        <Axes sx={sx} sy={sy} xt={ticks(x0, x1)} yt={ticks(y0, y1)} y0={y0} y1={y1} xlabel={spec.xlabel} ylabel={spec.ylabel} />
        {segs.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="chart-path" fill="none" stroke="#1e6fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: "0s" }} />
        ))}
      </>
    );
    caption = spec.title || `y = ${spec.fn}`;
  } else {
    const ys = spec.y;
    const lo = Math.min(0, ...ys);
    const hi = Math.max(0, ...ys);
    const span = hi - lo || 1;
    const y0 = lo, y1 = hi + span * 0.1;
    const n = spec.x.length;
    const sx = (i: number) => PL + ((i + 0.5) / n) * (W - PL - PR);
    const sy = (y: number) => H - PB - ((y - y0) / (y1 - y0)) * (H - PT - PB);
    const yt = ticks(y0, y1);
    const bw = Math.min(64, ((W - PL - PR) / n) * 0.6);
    if (spec.kind === "bar") {
      body = (
        <>
          <Axes sx={(i) => sx(i - 0.5)} sy={sy} xt={[]} yt={yt} y0={y0} y1={y1} xlabel={spec.xlabel} ylabel={spec.ylabel} />
          {spec.y.map((v, i) => {
            const top = sy(v), base = sy(0);
            return (
              <g key={i}>
                <rect
                  x={sx(i) - bw / 2}
                  y={Math.min(top, base)}
                  width={bw}
                  height={Math.abs(base - top)}
                  rx={6}
                  fill="#1e6fff"
                  className="chart-bar"
                  style={{ "--d": `${i * 0.12}s`, transformOrigin: `${sx(i)}px ${base}px` } as CSSProperties}
                />
                <text x={sx(i)} y={H - PB + 20} textAnchor="middle" className="chart-tick">{spec.x[i]}</text>
                <text x={sx(i)} y={Math.min(top, base) - 8} textAnchor="middle" className="chart-val chart-dot" style={{ "--d": `${0.5 + i * 0.12}s` } as CSSProperties}>{fmt(v)}</text>
              </g>
            );
          })}
        </>
      );
    } else {
      const d = spec.y.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
      body = (
        <>
          <Axes sx={(i) => sx(i)} sy={sy} xt={[]} yt={yt} y0={y0} y1={y1} xlabel={spec.xlabel} ylabel={spec.ylabel} />
          <path d={d} pathLength={1} className="chart-path" fill="none" stroke="#1e6fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {spec.y.map((v, i) => (
            <g key={i}>
              <circle cx={sx(i)} cy={sy(v)} r={5} fill="#fff" stroke="#1e6fff" strokeWidth={3} className="chart-dot" style={{ "--d": `${0.9 + i * 0.12}s` } as CSSProperties} />
              <text x={sx(i)} y={sy(v) - 12} textAnchor="middle" className="chart-val chart-dot" style={{ "--d": `${1 + i * 0.12}s` } as CSSProperties}>{fmt(v)}</text>
              <text x={sx(i)} y={H - PB + 20} textAnchor="middle" className="chart-tick">{spec.x[i]}</text>
            </g>
          ))}
        </>
      );
    }
  }

  return (
    <figure className="chart-figure">
      <div ref={ref} className={on ? "chart chart--on" : "chart"}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption}>
          {body}
        </svg>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Axes({
  sx, sy, xt, yt, y0, y1, xlabel, ylabel,
}: {
  sx: (x: number) => number;
  sy: (y: number) => number;
  xt: number[];
  yt: number[];
  y0: number;
  y1: number;
  xlabel: string;
  ylabel: string;
}) {
  const xTicks = xt.length ? xt : [];
  return (
    <g className="chart-axes">
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={PL} x2={W - PR} y1={sy(v)} y2={sy(v)} className={v === 0 ? "chart-zero" : "chart-grid"} />
          <text x={PL - 10} y={sy(v) + 4} textAnchor="end" className="chart-tick">{fmt(v)}</text>
        </g>
      ))}
      {xTicks.map((v) => (
        <text key={`x${v}`} x={sx(v)} y={H - PB + 20} textAnchor="middle" className="chart-tick">{fmt(v)}</text>
      ))}
      <line x1={PL} x2={W - PR} y1={sy(Math.max(y0, Math.min(0, y1)))} y2={sy(Math.max(y0, Math.min(0, y1)))} className="chart-axis" />
      <line x1={PL} x2={PL} y1={PT} y2={H - PB} className="chart-axis" />
      {xlabel && <text x={W - PR} y={H - 6} textAnchor="end" className="chart-label">{xlabel}</text>}
      {ylabel && <text x={PL} y={PT - 8} className="chart-label">{ylabel}</text>}
    </g>
  );
}
