import { uid } from "./id";
import type { EditExamQuestion, QuestionLevel } from "../types/course";

const choiceRe = /^\s*(?:([A-La-lА-Да-дӘә])[).:\]]|\(([A-La-lА-Да-дӘә])\)|([1-9]|1[0-2])[).])\s*(.+?)\s*$/u;
const qStartRe = /^\s*(?:(?:Сұрақ|Вопрос)\s*)?(\d{1,3})[).:\-]?\s+(.+)$/u;
const answerRe = /^\s*(?:Жауап|Дұрыс|Ответ|Answer)\s*[:：\-–]?\s*([A-La-lА-Да-дӘә]|1[0-2]|[1-9])\s*$/iu;
const levelRe = /^\s*(?:Деңгей|Сложность|Level)\s*[:：\-–]?\s*(easy|mid|hard|жеңіл|лёгкий|легкий|орташа|средний|күрделі|сложный)\s*$/iu;

const letterMap: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 10, l: 11,
  а: 0, ә: 0, б: 1, в: 2, г: 3, д: 4,
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8, "10": 9, "11": 10, "12": 11,
};

function letterIndex(raw: string): number {
  return letterMap[raw.toLowerCase()] ?? -1;
}

function levelOf(raw: string): QuestionLevel {
  const s = raw.toLowerCase();
  if (/easy|жеңіл|лёгк|легк/.test(s)) return "easy";
  if (/hard|күрделі|сложн/.test(s)) return "hard";
  return "mid";
}

type Draft = {
  prompt: string;
  descriptionLines: string[];
  choices: string[];
  answer: number;
  level: QuestionLevel;
};

function flush(d: Draft | null, out: EditExamQuestion[]) {
  if (!d || !d.prompt.trim()) return;
  const choices = d.choices.map((c) => c.trim()).filter(Boolean);
  const padded = choices.length >= 2 ? choices : ["", "", "", ""].map((c, i) => choices[i] ?? c);
  out.push({
    id: uid(),
    prompt: d.prompt.trim(),
    description: d.descriptionLines.join("\n").trim(),
    imageUrl: "",
    choices: padded.slice(0, 6),
    answer: Math.max(0, Math.min(d.answer, padded.length - 1)),
    explanation: "",
    reviewVideoUrl: "",
    level: d.level,
  });
}

/** Parse a pasted UNT-style exam into structured questions. */
export function parseExamText(raw: string): EditExamQuestion[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: EditExamQuestion[] = [];
  let cur: Draft | null = null;
  let mode: "prompt" | "desc" | "choices" = "prompt";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (cur && mode === "prompt" && cur.prompt) mode = "desc";
      continue;
    }

    const ans = trimmed.match(answerRe);
    if (ans && cur) {
      const idx = letterIndex(ans[1]);
      if (idx >= 0) cur.answer = idx;
      continue;
    }

    const lvl = trimmed.match(levelRe);
    if (lvl && cur) {
      cur.level = levelOf(lvl[1]);
      continue;
    }

    const q = trimmed.match(qStartRe);
    if (q && (!cur || mode === "choices" || cur.choices.length > 0 || cur.prompt)) {
      flush(cur, out);
      cur = { prompt: q[2].trim(), descriptionLines: [], choices: [], answer: 0, level: "mid" };
      mode = "prompt";
      continue;
    }

    const ch = trimmed.match(choiceRe);
    if (ch && cur) {
      const mark = ch[1] || ch[2] || ch[3];
      let text = (ch[4] || "").trim();
      let isAnswer = false;
      if (/\*\s*$/.test(text) || /\(дұрыс\)|\(верно\)|\(correct\)/i.test(text)) {
        isAnswer = true;
        text = text.replace(/\*\s*$/, "").replace(/\s*\((дұрыс|верно|correct)\)\s*$/i, "").trim();
      }
      const idx = letterIndex(mark);
      if (idx >= 0) {
        while (cur.choices.length < idx) cur.choices.push("");
        cur.choices[idx] = text;
        if (isAnswer) cur.answer = idx;
      } else {
        cur.choices.push(text);
      }
      mode = "choices";
      continue;
    }

    if (!cur) {
      cur = { prompt: trimmed, descriptionLines: [], choices: [], answer: 0, level: "mid" };
      mode = "prompt";
      continue;
    }

    if (mode === "choices") {
      // Continuation of last choice
      const last = cur.choices.length - 1;
      if (last >= 0) cur.choices[last] = `${cur.choices[last]} ${trimmed}`.trim();
      continue;
    }

    if (mode === "prompt" && !cur.prompt.includes("\n") && cur.prompt.length < 20) {
      cur.prompt = `${cur.prompt} ${trimmed}`.trim();
    } else if (mode === "prompt") {
      mode = "desc";
      cur.descriptionLines.push(trimmed);
    } else {
      cur.descriptionLines.push(trimmed);
    }
  }

  flush(cur, out);
  return out;
}
