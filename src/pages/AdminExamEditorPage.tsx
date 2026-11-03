import { useCallback, useEffect, useState, type ClipboardEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { ChoiceMath, Markdown, normalizeVideoUrl } from "../lib/course";
import { uid } from "../lib/id";
import type { EditExam, EditExamQuestion, QuestionLevel } from "../types/course";

const letters = "ABCDEF";

const blankQ = (): EditExamQuestion => ({
  id: uid(),
  prompt: "",
  description: "",
  imageUrl: "",
  choices: ["", "", "", ""],
  answer: 0,
  explanation: "",
  level: "mid",
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const blankExam = (): EditExam => ({
  title: "",
  date: today(),
  description: "",
  passPercent: 70,
  timeLimitMinutes: 40,
  published: false,
  reviewVideoUrl: "",
  questions: [blankQ()],
});

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

async function uploadImage(file: File): Promise<string> {
  const m = await api.adminUpload(file);
  return m.url;
}

export function AdminExamEditorPage() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<EditExam>(blankExam);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const { exam } = await api.adminExam(id);
      setForm({
        title: exam.title,
        date: exam.date,
        description: exam.description,
        passPercent: exam.passPercent,
        timeLimitMinutes: exam.timeLimitMinutes,
        published: exam.published,
        reviewVideoUrl: exam.reviewVideoUrl ?? "",
        questions: exam.questions.map((q) => ({
          ...q,
          id: q.id || uid(),
          description: q.description ?? "",
          imageUrl: q.imageUrl ?? "",
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить тест");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  function set(patch: Partial<EditExam>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function setQ(qi: number, patch: Partial<EditExamQuestion>) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)),
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body: EditExam = {
        ...form,
        reviewVideoUrl: normalizeVideoUrl(form.reviewVideoUrl) || form.reviewVideoUrl.trim(),
        questions: form.questions.filter((q) => q.prompt.trim() && q.choices.filter((c) => c.trim()).length >= 2),
      };
      if (!body.title.trim()) throw new Error("Укажите название теста");
      if (!body.date) throw new Error("Укажите дату теста");
      if (body.questions.length === 0) throw new Error("Добавьте хотя бы один вопрос с вариантами");
      const { exam } = await api.adminSaveExam(isNew ? null : id, body);
      setNotice("Сохранено");
      if (isNew) navigate(`/admin/exams/${exam.id}`, { replace: true });
      else setForm({
        title: exam.title,
        date: exam.date,
        description: exam.description,
        passPercent: exam.passPercent,
        timeLimitMinutes: exam.timeLimitMinutes,
        published: exam.published,
        reviewVideoUrl: exam.reviewVideoUrl ?? "",
        questions: exam.questions.map((q) => ({
          ...q,
          id: q.id || uid(),
          description: q.description ?? "",
          imageUrl: q.imageUrl ?? "",
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell crumbs={[{ label: "Админ", to: "/admin" }, { label: "Тест" }]} subtitle="Админ">
        <p className="adm-muted">Жүктелуде…</p>
      </Shell>
    );
  }

  return (
    <Shell
      crumbs={[{ label: "Админ", to: "/admin?tab=exams" }, { label: isNew ? "Новый тест" : form.title || "Тест" }]}
      subtitle="Админ"
    >
      <form className="cab adm" onSubmit={save}>
        <section className="cab-hello">
          <div>
            <h1>{isNew ? "Новый датированный тест" : "Редактирование теста"}</h1>
            <p><Icon name="quiz" size={20} color="var(--navy)" /><span>Дата, вопросы, фото и YouTube-разбор ошибок</span></p>
          </div>
          <div className="cab-hello__pills">
            <Link to="/admin?tab=exams" className="pace"><Icon name="arrow_back" size={16} />К списку</Link>
            <button type="submit" className="qz-next" disabled={busy}>{busy ? "Сақталуда…" : "Сохранить"}</button>
          </div>
        </section>

        {error && <p className="adm-alert">{error}</p>}
        {notice && <p className="adm-ok" role="status"><Icon name="check_circle" size={18} />{notice}</p>}

        <article className="cab-card">
          <div className="adm-fields">
            <label className="wide">Название<input value={form.title} onChange={(e) => set({ title: e.target.value })} required placeholder="Мысалы: Апталық сынақ №3" /></label>
            <label>Дата теста<input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} required /></label>
            <label>Проходной балл, %<input type="number" min={1} max={100} value={form.passPercent} onChange={(e) => set({ passPercent: Number(e.target.value) || 70 })} /></label>
            <label>Время, мин (0 — без лимита)<input type="number" min={0} max={300} value={form.timeLimitMinutes} onChange={(e) => set({ timeLimitMinutes: Number(e.target.value) || 0 })} /></label>
            <label className="adm-check"><input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />Опубликован — виден ученикам</label>
            <label className="wide">Краткое описание<textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Что это за тест и что повторить перед ним" /></label>
            <label className="wide">
              Работа над ошибками — ссылка YouTube
              <input
                value={form.reviewVideoUrl}
                onChange={(e) => set({ reviewVideoUrl: e.target.value })}
                placeholder="https://youtu.be/… или https://www.youtube.com/watch?v=…"
              />
            </label>
            <p className="adm-muted wide">После сдачи всего теста ученик увидит это видео вместе с разбором вопросов.</p>
          </div>
        </article>

        <article className="cab-card">
          <header className="cab-card__head cab-card__head--flat">
            <div>
              <span className="cab-card__ico"><Icon name="help" size={22} /></span>
              <div>
                <h3>Вопросы</h3>
                <p>{form.questions.length} вопрос(ов)</p>
              </div>
            </div>
            <button type="button" className="qz-next" onClick={() => set({ questions: [...form.questions, blankQ()] })}>
              <Icon name="add" size={18} />Вопрос
            </button>
          </header>

          <ol className="ced-qs">
            {form.questions.map((q, qi) => (
              <li key={q.id || qi} className="ced-q">
                <header>
                  <b>Вопрос {qi + 1}</b>
                  <select value={q.level} aria-label="Сложность" onChange={(e) => setQ(qi, { level: e.target.value as QuestionLevel })}>
                    <option value="easy">Лёгкий</option>
                    <option value="mid">Средний</option>
                    <option value="hard">Сложный</option>
                  </select>
                  <div className="adm-acts">
                    <button type="button" aria-label="Выше" disabled={qi === 0} onClick={() => set({ questions: move(form.questions, qi, qi - 1) })}><Icon name="arrow_drop_up" size={24} /></button>
                    <button type="button" aria-label="Ниже" disabled={qi === form.questions.length - 1} onClick={() => set({ questions: move(form.questions, qi, qi + 1) })}><Icon name="expand_more" size={20} /></button>
                    <button type="button" className="danger" aria-label="Удалить" disabled={form.questions.length <= 1} onClick={() => set({ questions: form.questions.filter((_, i) => i !== qi) })}><Icon name="delete" size={18} /></button>
                  </div>
                </header>
                <div className="ced-q__grid">
                  <div className="ced-q__task">
                    <label>
                      Вопрос
                      <textarea rows={3} value={q.prompt} onChange={(e) => setQ(qi, { prompt: e.target.value })} placeholder="Текст вопроса. Можно $формулы$" />
                    </label>
                    <label>
                      Описание
                      <textarea rows={2} value={q.description} onChange={(e) => setQ(qi, { description: e.target.value })} placeholder="Подсказка или условие под вопросом (необязательно)" />
                    </label>
                    <div className="ced-exam-photo">
                      <span>Фото к вопросу</span>
                      {q.imageUrl ? (
                        <div className="ced-exam-photo__preview">
                          <img src={q.imageUrl} alt="" />
                          <button type="button" className="adm-del" onClick={() => setQ(qi, { imageUrl: "" })}><Icon name="delete" size={16} />Убрать</button>
                        </div>
                      ) : (
                        <label className="qz-prev ced-upload">
                          <Icon name="photo_camera" size={18} />Загрузить фото
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              void uploadImage(f)
                                .then((url) => setQ(qi, { imageUrl: url }))
                                .catch((err) => alert(err instanceof Error ? err.message : "Ошибка загрузки"));
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <fieldset className="ced-choices">
                      <legend>Ответы — отметьте правильный</legend>
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="ced-choice-col">
                          <div className={q.answer === ci ? "ced-choice ok" : "ced-choice"}>
                            <input type="radio" name={`ans-${q.id}`} checked={q.answer === ci} onChange={() => setQ(qi, { answer: ci })} aria-label={`Правильный ${letters[ci]}`} />
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
                          {/[\\$^_]/.test(c) && <div className="ced-choice__math quiz-math"><ChoiceMath text={c} /></div>}
                        </div>
                      ))}
                      {q.choices.length < 6 && (
                        <button type="button" className="adm-link" onClick={() => setQ(qi, { choices: [...q.choices, ""] })}><Icon name="add" size={16} />Вариант</button>
                      )}
                    </fieldset>
                  </div>
                  <label className="ced-exp">
                    Решение / пояснение (после сдачи)
                    <textarea
                      rows={10}
                      value={q.explanation}
                      onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                        const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
                        if (!item) return;
                        const file = item.getAsFile();
                        if (!file) return;
                        e.preventDefault();
                        void uploadImage(file)
                          .then((url) => setQ(qi, { explanation: `${q.explanation.trimEnd()}\n\n![](${url})\n` }))
                          .catch((err) => alert(err instanceof Error ? err.message : "Ошибка"));
                      }}
                      onChange={(e) => setQ(qi, { explanation: e.target.value })}
                      placeholder="Разбор решения. Можно вставить фото через Ctrl+V."
                    />
                    {q.explanation.trim() && (
                      <div className="ced-math-preview">
                        <small>Как увидит ученик</small>
                        <Markdown text={q.explanation} plain />
                      </div>
                    )}
                  </label>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <div className="ced-bar">
          <Link to="/admin?tab=exams" className="qz-prev"><Icon name="arrow_back" size={16} />Назад</Link>
          <button type="submit" className="qz-next" disabled={busy}>{busy ? "Сақталуда…" : "Сохранить тест"}</button>
        </div>
      </form>
    </Shell>
  );
}
