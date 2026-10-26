/** Lesson script → blocks. Teachers paste speech and board lines, not Markdown math. */

export type LessonBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "board"; tex: string; caption?: string }
  | { kind: "mistake"; text: string };

const CYR = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;

function cyrWords(s: string): number {
  return (s.match(new RegExp(`${CYR.source}{2,}`, "g")) || []).length;
}

function looksLikeMath(body: string): boolean {
  const t = body.trim();
  if (!t) return false;
  if (/\\[a-zA-Z]+|\\[,;!]/.test(t)) {
    const before = t.split(/\\[a-zA-Z]+|\\[,;!]/)[0];
    return cyrWords(before) < 3;
  }
  if (/\{,\}/.test(t)) return true;
  if (t.includes("=") && cyrWords(t) <= 1 && t.length < 220) return true;
  if (/^\d+\s*:\s*\d+/.test(t) && cyrWords(t) === 0) return true;
  return false;
}

function isContinuation(prev: string, next: string): boolean {
  if (/^\\[,;!]/.test(next)) return true;
  const p = prev.trim();
  if (!/^\\/.test(next)) return false;
  return /[:;=+\-]$/.test(p);
}

function isHeading(line: string): { level: 2 | 3; text: string } | null {
  const md = line.match(/^(#{2,3})\s+(.*)$/);
  if (md) return { level: md[1].length === 2 ? 2 : 3, text: md[2].trim() };
  const example = line.match(/^мысал\s+\d+\b.*$/i);
  if (example) return { level: 3, text: line.trim() };
  const numbered = line.match(/^\d+\.\s+\S/);
  if (numbered && !/^\d+\.\d+/.test(line)) return { level: 3, text: line.trim() };
  return null;
}

function isBullet(line: string): boolean {
  return /^\s*[-*]\s+/.test(line) && !/^\s*\*\*/.test(line);
}

function isNoise(line: string): boolean {
  return /^Page \d+ of \d+$/i.test(line) || /сабақ сценарийі\s*$/i.test(line);
}

function boardCaption(line: string): { caption: string; rest: string } | null {
  const m = line.match(/^тақтада\s*:\s*(.*)$/i);
  if (!m) return null;
  return { caption: "Тақтада", rest: m[1].trim() };
}

function dollarBlock(line: string): "open" | "single" | null {
  const t = line.trim();
  if (t === "$" || t === "$$") return "open";
  if (/^\$\$[\s\S]+\$\$$/.test(t) || /^\$[^$]+\$$/.test(t)) return "single";
  if (t.startsWith("$$") || (t.startsWith("$") && !t.endsWith("$"))) return "open";
  return null;
}

function unwrapDollar(line: string): string {
  return line.trim().replace(/^\$\$?/, "").replace(/\$\$?$/, "").trim();
}

function isMistake(line: string): boolean {
  return /^(жиі қате|частая ошибка|работа с ошибками)(?=\s|:|$)/i.test(line.trim());
}

function joinProse(parts: string[]): string {
  let out = "";
  for (const part of parts) {
    const line = part.trim();
    if (!out) {
      out = line;
      continue;
    }
    if (line === "»" || line === "«" || out.endsWith("-") || out.endsWith("«")) out += line;
    else out += ` ${line}`;
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/ +/g, " ").trim();
}

function joinTex(parts: string[]): string {
  let out = parts[0];
  for (let i = 1; i < parts.length; i += 1) {
    out += isContinuation(parts[i - 1], parts[i]) ? ` ${parts[i]}` : ` \\\\ ${parts[i]}`;
  }
  const tex = out.trim();
  return tex.includes("\\\\") ? `\\begin{gathered} ${tex} \\end{gathered}` : tex;
}

export function parseLesson(text: string): LessonBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: LessonBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || isNoise(line)) {
      i += 1;
      continue;
    }

    const dollars = dollarBlock(line);
    if (dollars === "single") {
      blocks.push({ kind: "board", tex: unwrapDollar(line) });
      i += 1;
      continue;
    }
    if (dollars === "open") {
      const buf = [unwrapDollar(line)];
      const opener = line.trim().startsWith("$$") ? "$$" : "$";
      i += 1;
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (cur === opener || cur === "$" || cur === "$$" || cur.endsWith(opener)) {
          const inner = unwrapDollar(cur);
          if (inner) buf.push(inner);
          i += 1;
          break;
        }
        if (!isNoise(cur)) buf.push(cur);
        i += 1;
      }
      const tex = joinTex(buf.filter(Boolean));
      if (tex) blocks.push({ kind: "board", tex });
      continue;
    }

    const heading = isHeading(line);
    if (heading && !looksLikeMath(line)) {
      blocks.push({ kind: "heading", level: heading.level, text: heading.text });
      i += 1;
      continue;
    }

    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ kind: "list", ordered: false, items });
      continue;
    }

    const cap = boardCaption(line);
    if (cap || looksLikeMath(line)) {
      const parts: string[] = [];
      let caption: string | undefined;
      if (cap) {
        caption = cap.caption;
        if (cap.rest && looksLikeMath(cap.rest)) parts.push(cap.rest);
        else if (cap.rest) {
          blocks.push({ kind: "paragraph", text: `${cap.caption}: ${cap.rest}` });
          i += 1;
          continue;
        }
        i += 1;
      }
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) break;
        if (isNoise(cur)) {
          i += 1;
          continue;
        }
        if (boardCaption(cur) || isHeading(cur) || isBullet(cur) || isMistake(cur) || dollarBlock(cur)) break;
        const prev = parts[parts.length - 1];
        if (!looksLikeMath(cur) && !(prev && isContinuation(prev, cur))) break;
        parts.push(cur);
        i += 1;
      }
      const tex = joinTex(parts.filter(Boolean));
      if (tex) blocks.push({ kind: "board", tex, caption });
      else if (caption) blocks.push({ kind: "paragraph", text: caption });
      continue;
    }

    const mistake = isMistake(line);
    const parts = [line];
    i += 1;
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (!cur) break;
      if (isNoise(cur)) {
        i += 1;
        continue;
      }
      if (boardCaption(cur) || isHeading(cur) || isBullet(cur) || dollarBlock(cur) || looksLikeMath(cur) || isMistake(cur)) break;
      parts.push(cur);
      i += 1;
    }
    const text = joinProse(parts);
    blocks.push(mistake ? { kind: "mistake", text } : { kind: "paragraph", text });
  }

  return blocks;
}
