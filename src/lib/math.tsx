import { Fragment, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function Formula({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex.trim(), {
    throwOnError: false,
    displayMode: display,
    strict: "ignore",
    output: "html",
  });
  return <span className={display ? "math math--block" : "math"} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Text with `$inline$` and `$$block$$` formulas. Everything else stays as written. */
export function MathText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<Fragment key={`t${k}`}>{text.slice(last, m.index)}</Fragment>);
    const display = m[1] != null;
    nodes.push(<Formula key={`m${k}`} tex={(display ? m[1] : m[2]).trim()} display={display} />);
    k += 1;
    last = m.index + m[0].length;
  }
  if (k === 0) return <>{text}</>;
  if (last < text.length) nodes.push(<Fragment key="tail">{text.slice(last)}</Fragment>);
  return <>{nodes}</>;
}

/** A formula field: LaTeX when it looks like math, otherwise the text as typed. */
export function FormulaOrText({ text, display = false }: { text: string; display?: boolean }) {
  const raw = text.trim();
  if (!raw) return null;
  const block = raw.match(/^\$\$([\s\S]+)\$\$$/);
  const inline = raw.match(/^\$(.+)\$$/);
  const tex = (block?.[1] ?? inline?.[1] ?? raw).trim();
  if (block || inline || /[\\^_]/.test(raw)) return <Formula tex={tex} display={display || Boolean(block)} />;
  return <>{raw}</>;
}
