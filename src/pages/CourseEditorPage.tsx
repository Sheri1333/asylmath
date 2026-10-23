import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { fmtSize, Markdown, normalizeVideoUrl, parseVideo } from "../lib/course";
import type { EditCourse, EditLesson, EditQuestion, EditSection, QuestionLevel } from "../types/course";

const uid = () => crypto.randomUUID();
const letters = "ABCDEFGH";

const blankCourse = (): EditCourse => ({
  title: "",
  slug: "",
  subject: "Математика",
  level: "beginner",
  description: "",
  coverColor: "var(--navy)",
  isFree: false,
  priceTenge: 9990,
  published: false,
  featured: false,
  sequential: true,
  paymentNote: "Kaspi арқылы курс бағасын аударыңыз да, «Төледім» батырмасын басыңыз. Төлем тексерілгеннен кейін курс ашылады.",
  paymentUrl: "",
  sections: [],
});

const blankSection = (n: number): EditSection => ({
  id: uid(),
  title: `Раздел ${n}`,
  description: "",
  lessons: [],
  quiz: { passPercent: 70, timeLimitMinutes: 20, questions: [] },
});

const blankLesson = (): EditLesson => ({
  id: uid(),
  title: "Новый урок",
  summary: "",
  content: "",
  videoUrl: "",
  durationMinutes: 15,
  isPreview: false,
  materials: [],
});

const blankQuestion = (): EditQuestion => ({
  id: uid(),
  prompt: "",
  formula: "",
  choices: ["", "", "", ""],
  answer: 0,
  explanation: "",
  level: "mid",
});

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Bulk question import. Blocks are separated by an empty line:
 *   Текст вопроса
 *   A) вариант
 *   *B) правильный вариант   (или «Ответ: B»)
 *   Пояснение: почему
 */
export function parseQuestions(text: string): { questions: EditQuestion[]; errors: string[] } {
  const questions: EditQuestion[] = [];
  const errors: string[] = [];
  const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  blocks.forEach((block, bi) => {
    const prompt: string[] = [];
    const choices: string[] = [];
    let answer = -1;
    let explanation = "";
    let formula = "";
    for (const raw of block.split("\n")) {
      const line = raw.trim();
      const opt = line.match(/^(\*|\+)?\s*([A-HА-Еa-hа-е])\s*[).:]\s*(.+?)\s*(\*|\+)?$/);
      const ans = line.match(/^(?:ответ|жауап|answer)\s*[:\-–]\s*([A-HА-Еa-hа-е])/i);
      const exp = line.match(/^(?:пояснение|түсіндірме|решение|шешуі|explanation)\s*[:\-–]\s*(.*)/i);
      const frm = line.match(/^(?:формула|formula)\s*[:\-–]\s*(.*)/i);
      if (opt && (choices.length > 0 || prompt.length > 0)) {
        if (opt[1] || opt[4]) answer = choices.length;
        choices.push(opt[3]);
      } else if (ans) {
        const map = "ABCDEFGH";
        const ru = "АБВГДЕ";
        const ch = ans[1].toUpperCase();
        answer = map.includes(ch) ? map.indexOf(ch) : ru.indexOf(ch);
      } else if (exp) explanation = exp[1];
      else if (frm) formula = frm[1];
      else if (choices.length === 0) prompt.push(line);
      else explanation = explanation ? `${explanation} ${line}` : line;
    }
    if (!prompt.length || choices.length < 2) {
      errors.push(`Блок ${bi + 1}: нужен текст вопроса и минимум 2 варианта`);
      return;
    }
    if (answer < 0 || answer >= choices.length) {
      errors.push(`Блок ${bi + 1}: не отмечен правильный ответ (звёздочка * перед вариантом или строка «Ответ: B»)`);
      return;
    }
    questions.push({ id: uid(), prompt: prompt.join(" "), formula, choices, answer, explanation, level: "mid" });
  });
  return { questions, errors };
}

export function CourseEditorPage() {
  const { id = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState<EditCourse | null>(isNew ? blankCourse() : null);
  const [saved, setSaved] = useState<string>(isNew ? "" : "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [openQuiz, setOpenQuiz] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setSaved(JSON.stringify(blankCourse()));
      return;
    }
    api
      .adminGetCourse(id)
      .then(({ course }) => {
        const f: EditCourse = {
          title: course.title,
          slug: course.slug,
          subject: course.subject,
          level: course.level,
          description: course.description,
          coverColor: course.coverColor,
          isFree: course.isFree,
          priceTenge: course.priceTenge,
          published: course.published,
          featured: course.featured,
          sequential: course.sequential,
          paymentNote: course.paymentNote,
          paymentUrl: course.paymentUrl,
          sections: course.sections.map((s) => ({
            ...s,
            lessons: s.lessons.map((l) => ({ ...l, videoUrl: l.videoUrl ?? "", materials: l.materials ?? [] })),
            quiz: { ...s.quiz, questions: s.quiz.questions.map((q) => ({ ...q, formula: q.formula ?? "" })) },
          })),
        };
        setForm(f);
        setSaved(JSON.stringify(f));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Курс не найден"));
  }, [id, isNew]);

  const dirty = form !== null && JSON.stringify(form) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!form) {
    return (
      <Shell crumbs={[{ label: "Админ-панель", to: "/admin?tab=courses" }, { label: "Курс" }]}>
        <div className="cab">{error ? <p className="adm-alert">{error}</p> : <p className="adm-muted">Загрузка…</p>}</div>
      </Shell>
    );
  }

  const set = (patch: Partial<EditCourse>) => setForm({ ...form, ...patch });
  const setSection = (si: number, patch: Partial<EditSection>) =>
    set({ sections: form.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const setLesson = (si: number, li: number, patch: Partial<EditLesson>) =>
    setSection(si, { lessons: form.sections[si].lessons.map((l, i) => (i === li ? { ...l, ...patch } : l)) });

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const { course } = await api.adminSaveCourse(form, isNew ? undefined : id);
      const fresh: EditCourse = { ...form, slug: course.slug };
      setForm(fresh);
      setSaved(JSON.stringify(fresh));
      setNotice("Сохранено");
      if (isNew) navigate(`/admin/courses/${course.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const totals = {
    lessons: form.sections.reduce((n, s) => n + s.lessons.length, 0),
    questions: form.sections.reduce((n, s) => n + s.quiz.questions.length, 0),
    noVideo: form.sections.reduce((n, s) => n + s.lessons.filter((l) => !l.videoUrl).length, 0),
  };

  return (
    <Shell crumbs={[{ label: "Админ-панель", to: "/admin?tab=courses" }, { label: form.title || "Новый курс" }]} subtitle="Редактор курса">
      <div className="cab ced">
        <div className="ced-bar">
          <Link
            to="/admin?tab=courses"
            className="qz-prev"
            onClick={(e) => {
              if (dirty && !confirm("Есть несохранённые изменения. Уйти без сохранения?")) e.preventDefault();
            }}
          >
            <Icon name="arrow_back" size={16} />К курсам
          </Link>
          <div className="ced-bar__title">
            <strong>{form.title || "Новый курс"}</strong>
            <small>
              {form.sections.length} разделов · {totals.lessons} уроков · {totals.questions} вопросов
              {totals.noVideo > 0 && ` · без видео: ${totals.noVideo}`}
            </small>
          </div>
          <span className={dirty ? "ced-bar__state dirty" : "ced-bar__state"}>{dirty ? "Есть изменения" : isNew ? "Новый" : "Всё сохранено"}</span>
          {!isNew && form.published && (
            <a className="qz-prev" href="/course" target="_blank" rel="noreferrer"><Icon name="link" size={16} />Как видит ученик</a>
          )}
          <button type="button" className="qz-next" disabled={saving || (!dirty && !isNew)} onClick={save}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>

        {error && <p className="adm-alert" role="alert">{error}</p>}
        {notice && <p className="adm-ok" role="status"><Icon name="check_circle" size={18} />{notice}</p>}

        <article className="cab-card">
          <header className="cab-card__head cab-card__head--flat">
            <div>
              <span className="cab-card__ico"><Icon name="settings" size={22} /></span>
              <div><h3>Основное</h3><p>Название, цена, публикация и оплата</p></div>
            </div>
          </header>
          <div className="adm-fields">
            <label className="wide">Название курса<input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="ҰБТ математика: 6 айлық толық курс" required /></label>
            <label className="wide">Описание<textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
            <label>Адрес (slug)<input value={form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="создастся из названия" /></label>
            <label>Предмет<input value={form.subject} onChange={(e) => set({ subject: e.target.value })} /></label>
            <label>Цена, ₸
              <input type="number" min={0} step={10} disabled={form.isFree} value={form.priceTenge ?? 0} onChange={(e) => set({ priceTenge: Number(e.target.value) || null })} />
            </label>
            <label>Цвет обложки<input type="color" value={form.coverColor} onChange={(e) => set({ coverColor: e.target.value })} /></label>
            <label className="adm-check"><input type="checkbox" checked={form.isFree} onChange={(e) => set({ isFree: e.target.checked })} />Бесплатный курс (доступ сразу)</label>
            <label className="adm-check"><input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />Опубликован (виден ученикам)</label>
            <label className="adm-check"><input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />Основной курс (открывается в кабинете)</label>
            <label className="adm-check"><input type="checkbox" checked={form.sequential} onChange={(e) => set({ sequential: e.target.checked })} />Открывать разделы по очереди (после сдачи теста)</label>
            {!form.isFree && (
              <>
                <label className="wide">Инструкция по оплате (видит ученик)<textarea rows={2} value={form.paymentNote} onChange={(e) => set({ paymentNote: e.target.value })} /></label>
                <label className="wide">Ссылка на оплату Kaspi (необязательно)<input value={form.paymentUrl} onChange={(e) => set({ paymentUrl: e.target.value })} placeholder="https://pay.kaspi.kz/pay/…" /></label>
              </>
            )}
          </div>
        </article>

        <div className="ced-sections">
          <header className="ced-sections__head">
            <h2>Разделы курса</h2>
            <button
              type="button"
              className="qz-prev"
              onClick={() => {
                const s = blankSection(form.sections.length + 1);
                set({ sections: [...form.sections, s] });
                setOpenSection(s.id!);
              }}
            >
              <Icon name="add" size={18} />Добавить раздел
            </button>
          </header>

          {form.sections.length === 0 && (
            <div className="acc__empty">
              <p>Разделов пока нет. Раздел — это тема курса (например, «Тригонометрия»): в нём уроки и тест в конце.</p>
            </div>
          )}

          {form.sections.map((s, si) => {
            const isOpen = openSection === s.id;
            return (
              <article key={s.id} className={isOpen ? "ced-sec open" : "ced-sec"}>
                <header>
                  <button type="button" className="ced-sec__toggle" aria-expanded={isOpen} onClick={() => setOpenSection(isOpen ? null : s.id!)}>
                    <span className="ced-sec__n">{si + 1}</span>
                    <span>
                      <strong>{s.title || "Без названия"}</strong>
                      <small>
                        {s.lessons.length} уроков · {s.quiz.questions.length ? `тест ${s.quiz.questions.length} вопр.` : "без теста"}
                      </small>
                    </span>
                    <Icon name="expand_more" size={24} className="prog__chev" />
                  </button>
                  <div className="adm-acts">
                    <button type="button" aria-label="Раздел выше" disabled={si === 0} onClick={() => set({ sections: move(form.sections, si, si - 1) })}><Icon name="arrow_drop_up" size={24} /></button>
                    <button type="button" aria-label="Раздел ниже" disabled={si === form.sections.length - 1} onClick={() => set({ sections: move(form.sections, si, si + 1) })}><Icon name="expand_more" size={20} /></button>
                    <button
                      type="button"
                      className="danger"
                      aria-label="Удалить раздел"
                      onClick={() => {
                        if (!confirm(`Удалить раздел «${s.title}» со всеми уроками и тестом?`)) return;
                        set({ sections: form.sections.filter((_, i) => i !== si) });
                      }}
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </header>

                {isOpen && (
                  <div className="ced-sec__body">
                    <div className="adm-fields">
                      <label className="wide">Название раздела<input value={s.title} onChange={(e) => setSection(si, { title: e.target.value })} /></label>
                      <label className="wide">Краткое описание<textarea rows={2} value={s.description} onChange={(e) => setSection(si, { description: e.target.value })} /></label>
                    </div>

                    <h4 className="adm-sub">Уроки <small>{s.lessons.length}</small></h4>
                    <ul className="ced-lessons">
                      {s.lessons.map((l, li) => {
                        const key = l.id!;
                        const editing = openLesson === key;
                        return (
                          <li key={key} className={editing ? "editing" : ""}>
                            <div className="ced-lesson">
                              <span className="ced-lesson__n">{li + 1}</span>
                              <button type="button" className="ced-lesson__title" onClick={() => setOpenLesson(editing ? null : key)}>
                                <strong>{l.title || "Без названия"}</strong>
                                <small>
                                  {l.durationMinutes} мин
                                  {l.videoUrl ? " · видео" : " · без видео"}
                                  {(l.materials?.length ?? 0) > 0 && ` · файлов: ${l.materials!.length}`}
                                  {l.isPreview && " · бесплатный"}
                                </small>
                              </button>
                              <div className="adm-acts">
                                <button type="button" aria-label="Выше" disabled={li === 0} onClick={() => setSection(si, { lessons: move(s.lessons, li, li - 1) })}><Icon name="arrow_drop_up" size={24} /></button>
                                <button type="button" aria-label="Ниже" disabled={li === s.lessons.length - 1} onClick={() => setSection(si, { lessons: move(s.lessons, li, li + 1) })}><Icon name="expand_more" size={20} /></button>
                                <button type="button" aria-label="Редактировать урок" onClick={() => setOpenLesson(editing ? null : key)}><Icon name="edit" size={18} /></button>
                                <button
                                  type="button"
                                  className="danger"
                                  aria-label="Удалить урок"
                                  onClick={() => {
                                    if (!confirm(`Удалить урок «${l.title}»?`)) return;
                                    setSection(si, { lessons: s.lessons.filter((_, i) => i !== li) });
                                  }}
                                >
                                  <Icon name="delete" size={18} />
                                </button>
                              </div>
                            </div>
                            {editing && <LessonEditor lesson={l} onChange={(patch) => setLesson(si, li, patch)} />}
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      className="adm-add"
                      onClick={() => {
                        const l = blankLesson();
                        setSection(si, { lessons: [...s.lessons, l] });
                        setOpenLesson(l.id!);
                      }}
                    >
                      <Icon name="add" size={18} />Добавить урок
                    </button>

                    <div className="ced-quiz-head">
                      <h4 className="adm-sub">Тест раздела <small>{s.quiz.questions.length} вопр.</small></h4>
                      <button type="button" className="qz-prev" onClick={() => setOpenQuiz(openQuiz === s.id ? null : s.id!)}>
                        <Icon name={openQuiz === s.id ? "expand_more" : "edit"} size={18} />{openQuiz === s.id ? "Свернуть" : "Редактировать тест"}
                      </button>
                    </div>
                    {openQuiz === s.id && <QuizEditor section={s} onChange={(quiz) => setSection(si, { quiz })} />}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {dirty && (
          <div className="ced-float">
            <span>Есть несохранённые изменения</span>
            <button type="button" className="qz-next" disabled={saving} onClick={save}>{saving ? "Сохранение…" : "Сохранить"}</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function LessonEditor({ lesson, onChange }: { lesson: EditLesson; onChange: (patch: Partial<EditLesson>) => void }) {
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState("");
  const [upErr, setUpErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const video = parseVideo(lesson.videoUrl);
  const materials = lesson.materials ?? [];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUpErr("");
    const added = [];
    for (const f of Array.from(files)) {
      setUploading(f.name);
      try {
        added.push(await api.adminUpload(f));
      } catch (e) {
        setUpErr(`${f.name}: ${e instanceof Error ? e.message : "ошибка"}`);
      }
    }
    setUploading("");
    if (added.length) onChange({ materials: [...materials, ...added] });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="ced-edit">
      <div className="adm-fields">
        <label className="wide">Название урока<input value={lesson.title} onChange={(e) => onChange({ title: e.target.value })} /></label>
        <label className="wide">Кратко (1–2 предложения под заголовком)<input value={lesson.summary} onChange={(e) => onChange({ summary: e.target.value })} /></label>
        <label className="wide">
          Видео: ссылка YouTube (или Vimeo, Kinescope, .mp4)
          <input
            value={lesson.videoUrl ?? ""}
            onChange={(e) => onChange({ videoUrl: e.target.value })}
            onBlur={(e) => {
              const clean = normalizeVideoUrl(e.target.value);
              if (clean !== (lesson.videoUrl ?? "")) onChange({ videoUrl: clean });
            }}
            placeholder="https://www.youtube.com/watch?v=… или https://youtu.be/…"
          />
          {video?.kind === "youtube" ? (
            <span className="ced-video">
              <img src={video.thumb} alt="" />
              <span>
                <b>YouTube-видео распознано</b>
                <small>ID {video.id}{video.start ? `, старт с ${Math.floor(video.start / 60)}:${String(video.start % 60).padStart(2, "0")}` : ""}</small>
                <small>Ученик увидит обложку и кнопку воспроизведения прямо в уроке. Видео должно быть «Доступ по ссылке» или «Открытый» и с разрешённым встраиванием.</small>
                <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">Открыть на YouTube</a>
              </span>
            </span>
          ) : (
            <span className={video ? (video.kind === "link" ? "ced-hint warn" : "ced-hint ok") : "ced-hint"}>
              {!video
                ? "Вставьте ссылку на YouTube в любом виде: watch, youtu.be, shorts, live или код встраивания <iframe>."
                : video.kind === "iframe"
                  ? `Видео ${video.provider} встроится в плеер урока.`
                  : video.kind === "file"
                    ? "Файл откроется во встроенном плеере."
                    : "Ссылка не распознана как видео: проверьте, что это ссылка на конкретное видео YouTube, а не на канал или плейлист."}
            </span>
          )}
        </label>
        <label>Длительность, мин<input type="number" min={0} max={600} value={lesson.durationMinutes} onChange={(e) => onChange({ durationMinutes: Number(e.target.value) || 0 })} /></label>
        <label className="adm-check"><input type="checkbox" checked={Boolean(lesson.isPreview)} onChange={(e) => onChange({ isPreview: e.target.checked })} />Бесплатный пробный урок (виден без оплаты)</label>
      </div>

      <div className="ced-content">
        <div className="ced-content__head">
          <span>Текст урока</span>
          <div className="qz-toggle">
            <button type="button" className={!preview ? "on" : ""} onClick={() => setPreview(false)}>Редактор</button>
            <button type="button" className={preview ? "on" : ""} onClick={() => setPreview(true)}>Как увидит ученик</button>
          </div>
        </div>
        {preview ? (
          <div className="les-card les-md ced-preview">{lesson.content ? <Markdown text={lesson.content} /> : <p className="adm-muted">Пусто</p>}</div>
        ) : (
          <>
            <textarea className="ced-md" rows={10} value={lesson.content} onChange={(e) => onChange({ content: e.target.value })} placeholder={"## Подзаголовок\n\nОбычный текст абзаца.\n\n- пункт списка\n- **жирный текст**\n\n1. шаг первый\n2. шаг второй"} />
            <small className="ced-hint">Оформление: «## » — подзаголовок, «- » — список, «1. » — нумерация, **жирный**, `формула`, [текст](https://ссылка).</small>
          </>
        )}
      </div>

      <div className="ced-files">
        <div className="ced-content__head">
          <span>Материалы урока (PDF, картинки, документы до 20 МБ)</span>
          <label className="qz-prev ced-upload">
            <Icon name="add" size={18} />{uploading ? `Загрузка: ${uploading}` : "Загрузить файлы"}
            <input ref={fileRef} type="file" multiple hidden disabled={Boolean(uploading)} onChange={(e) => void upload(e.target.files)} />
          </label>
        </div>
        {upErr && <p className="adm-alert">{upErr}</p>}
        {materials.length === 0 ? (
          <p className="adm-muted">Файлов нет.</p>
        ) : (
          <ul className="ced-file-list">
            {materials.map((m, i) => (
              <li key={m.id}>
                <Icon name={/\.pdf$/i.test(m.url) ? "picture_as_pdf" : "description"} size={20} />
                <input value={m.name} aria-label="Название файла" onChange={(e) => onChange({ materials: materials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <small>{fmtSize(m.size)}</small>
                <a href={m.url} target="_blank" rel="noreferrer" aria-label="Открыть файл"><Icon name="link" size={18} /></a>
                <button type="button" className="adm-del" aria-label="Убрать файл" onClick={() => onChange({ materials: materials.filter((_, j) => j !== i) })}><Icon name="delete" size={18} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuizEditor({ section, onChange }: { section: EditSection; onChange: (quiz: EditSection["quiz"]) => void }) {
  const quiz = section.quiz;
  const [bulk, setBulk] = useState(false);
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseQuestions(text) : null), [text]);
  const setQ = (qi: number, patch: Partial<EditQuestion>) =>
    onChange({ ...quiz, questions: quiz.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });

  return (
    <div className="ced-quiz">
      <div className="adm-fields">
        <label>Проходной балл, %<input type="number" min={1} max={100} value={quiz.passPercent} onChange={(e) => onChange({ ...quiz, passPercent: Number(e.target.value) || 70 })} /></label>
        <label>Время на тест, мин (0 — без ограничения)<input type="number" min={0} max={300} value={quiz.timeLimitMinutes} onChange={(e) => onChange({ ...quiz, timeLimitMinutes: Number(e.target.value) || 0 })} /></label>
      </div>

      <ol className="ced-qs">
        {quiz.questions.map((q, qi) => (
          <li key={q.id} className="ced-q">
            <header>
              <b>Вопрос {qi + 1}</b>
              <select value={q.level} aria-label="Сложность" onChange={(e) => setQ(qi, { level: e.target.value as QuestionLevel })}>
                <option value="easy">Лёгкий</option>
                <option value="mid">Средний</option>
                <option value="hard">Сложный</option>
              </select>
              <div className="adm-acts">
                <button type="button" aria-label="Выше" disabled={qi === 0} onClick={() => onChange({ ...quiz, questions: move(quiz.questions, qi, qi - 1) })}><Icon name="arrow_drop_up" size={24} /></button>
                <button type="button" aria-label="Ниже" disabled={qi === quiz.questions.length - 1} onClick={() => onChange({ ...quiz, questions: move(quiz.questions, qi, qi + 1) })}><Icon name="expand_more" size={20} /></button>
                <button type="button" className="danger" aria-label="Удалить вопрос" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, i) => i !== qi) })}><Icon name="delete" size={18} /></button>
              </div>
            </header>
            <div className="adm-fields">
              <label className="wide">Текст вопроса<textarea rows={2} value={q.prompt} onChange={(e) => setQ(qi, { prompt: e.target.value })} /></label>
              <label className="wide">Формула под вопросом (необязательно)<input value={q.formula ?? ""} onChange={(e) => setQ(qi, { formula: e.target.value })} placeholder="x² + px + q = 0" /></label>
            </div>
            <fieldset className="ced-choices">
              <legend>Варианты ответа — отметьте правильный</legend>
              {q.choices.map((c, ci) => (
                <div key={ci} className={q.answer === ci ? "ced-choice ok" : "ced-choice"}>
                  <input type="radio" name={`ans-${q.id}`} checked={q.answer === ci} onChange={() => setQ(qi, { answer: ci })} aria-label={`Правильный ответ ${letters[ci]}`} />
                  <b>{letters[ci]}</b>
                  <input value={c} onChange={(e) => setQ(qi, { choices: q.choices.map((x, j) => (j === ci ? e.target.value : x)) })} placeholder={`Вариант ${letters[ci]}`} />
                  {q.choices.length > 2 && (
                    <button
                      type="button"
                      className="adm-del"
                      aria-label="Убрать вариант"
                      onClick={() => setQ(qi, { choices: q.choices.filter((_, j) => j !== ci), answer: q.answer === ci ? 0 : q.answer > ci ? q.answer - 1 : q.answer })}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
              ))}
              {q.choices.length < 6 && (
                <button type="button" className="adm-link" onClick={() => setQ(qi, { choices: [...q.choices, ""] })}><Icon name="add" size={16} />Вариант</button>
              )}
            </fieldset>
            <label className="ced-exp">Пояснение (ученик увидит после теста)<textarea rows={2} value={q.explanation} onChange={(e) => setQ(qi, { explanation: e.target.value })} /></label>
          </li>
        ))}
      </ol>
      {quiz.questions.length === 0 && <p className="adm-muted">Вопросов нет. Раздел без вопросов не блокирует следующий.</p>}

      <div className="ced-quiz__add">
        <button type="button" className="adm-add" onClick={() => onChange({ ...quiz, questions: [...quiz.questions, blankQuestion()] })}>
          <Icon name="add" size={18} />Добавить вопрос
        </button>
        <button type="button" className="adm-add" onClick={() => setBulk(!bulk)}>
          <Icon name="description" size={18} />Вставить вопросы текстом
        </button>
      </div>

      {bulk && (
        <div className="ced-bulk">
          <p className="ced-hint">
            Каждый вопрос — отдельный блок через пустую строку. Правильный вариант отметьте звёздочкой или строкой «Ответ: B». Строка «Пояснение:» — по желанию.
          </p>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"x² − 5x + 6 = 0 теңдеуінің түбірлерінің қосындысы?\nA) 5\nB) −5\nC) 6\nD) −6\nОтвет: A\nПояснение: x₁ + x₂ = −p = 5\n\nТүбірлері 2 және 7 болатын теңдеу?\nA) x² + 9x + 14 = 0\n*B) x² − 9x + 14 = 0\nC) x² − 9x − 14 = 0"}
          />
          {parsed && (
            <p className={parsed.errors.length ? "adm-alert" : "ced-hint ok"}>
              Распознано вопросов: {parsed.questions.length}
              {parsed.errors.length > 0 && <>. {parsed.errors.join(". ")}</>}
            </p>
          )}
          <button
            type="button"
            className="qz-next"
            disabled={!parsed || parsed.questions.length === 0}
            onClick={() => {
              if (!parsed) return;
              onChange({ ...quiz, questions: [...quiz.questions, ...parsed.questions] });
              setText("");
              setBulk(false);
            }}
          >
            Добавить {parsed?.questions.length ?? 0} вопр.
          </button>
        </div>
      )}
    </div>
  );
}
