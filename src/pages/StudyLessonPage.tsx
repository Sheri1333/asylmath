import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PageState } from "../components/PageState";
import { fmtSize, mainSlug, Markdown, MathText, nextLesson, useMainCourse, VideoFrame } from "../lib/course";
import type { LessonView, Material } from "../types/course";

/** /lesson without an id: continue where the student stopped. */
export function LessonRedirect() {
  const { view, error, reload } = useMainCourse();
  if (view) {
    const target = nextLesson(view.outline)?.lesson ?? view.outline.flatMap((s) => s.lessons).find((l) => !l.locked);
    return <Navigate to={target ? `/lesson/${target.id}` : "/course"} replace />;
  }
  return (
    <Shell variant="study" flush>
      <PageState error={error} onRetry={reload} />
    </Shell>
  );
}

export function StudyLessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<LessonView | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [tab, setTab] = useState<"about" | "files" | "lessons">("about");
  const [saving, setSaving] = useState(false);
  /** Lesson explanation first; optional ҰБТ problems video swaps the player only. */
  const [clip, setClip] = useState<"lesson" | "practice">("lesson");

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.lesson(await mainSlug(), lessonId));
      setTab("about");
      setClip("lesson");
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Қате", status: e instanceof ApiError ? e.status : 0 });
    }
  }, [lessonId]);

  useEffect(() => {
    setData(null);
    setClip("lesson");
    void load();
    window.scrollTo(0, 0);
  }, [load]);

  if (!data) {
    return (
      <Shell variant="study" flush>
        {error?.status === 403 ? (
          <div className="pstate pstate--err">
            <Icon name="lock" size={28} />
            <h2>Сабақ әлі жабық</h2>
            <p>{error.message}</p>
            <div className="pstate__acts"><Link to="/course" className="qz-next">Курс бағдарламасы</Link></div>
          </div>
        ) : (
          <PageState error={error} onRetry={load} />
        )}
      </Shell>
    );
  }

  const { course, section, lesson, navigation, outline, enrollment } = data;
  const active = enrollment?.status === "active";
  const sec = outline.find((s) => s.id === section.id)!;
  const pos = sec.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const secDone = sec.lessons.filter((l) => l.completed).length;
  const secPct = sec.lessons.length ? Math.round((secDone / sec.lessons.length) * 100) : 0;
  const lastInSection = pos === sec.lessons.length;
  const lessonQuiz = sec.lessons.find((l) => l.id === lesson.id)?.quiz ?? null;
  const quizOpen = sec.quiz && !sec.quiz.locked;

  async function markDone() {
    if (!active || lesson.completed) return;
    setSaving(true);
    try {
      await api.completeLesson(course.id, lesson.id);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function go(to: string) {
    if (active && !lesson.completed) {
      try {
        await api.completeLesson(course.id, lesson.id);
      } catch {
        /* moving on matters more than the tick */
      }
    }
    navigate(to);
  }

  const hasPractice = Boolean(lesson.practiceVideoUrl);
  const onPractice = hasPractice && clip === "practice";
  const videoUrl = onPractice ? lesson.practiceVideoUrl : lesson.videoUrl;
  const videoTitle = onPractice ? "ҰБТ Есептері" : lesson.title;

  const next = lessonQuiz && !lessonQuiz.result?.passed
    ? { to: `/tests/lesson/${lesson.id}`, label: "Сабақ тестіне өту" }
    : lastInSection && quizOpen
      ? { to: `/tests/${section.id}`, label: "Тақырып тестіне өту" }
      : navigation.nextLessonId
        ? { to: `/lesson/${navigation.nextLessonId}`, label: "Келесі сабақ" }
        : { to: "/course", label: "Курс бағдарламасы" };

  function openPractice() {
    setClip("practice");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const list = (
    <article className="les-list">
      <header><b>{sec.lessons.length} сабақ</b><span>Ұзақтығы: {sec.lessons.reduce((n, l) => n + l.durationMinutes, 0)} мин</span></header>
      {sec.lessons.map((l, i) => {
        const on = l.id === lesson.id;
        const cls = `les-item${on ? " on" : ""}${l.locked ? " les-item--lock" : ""}${!l.completed && !on && !l.locked ? " todo" : ""}`;
        const body = (
          <>
            <span className="les-item__ico">
              {on ? <Icon name="play_arrow" size={18} fill /> : l.locked ? <Icon name="lock" size={16} /> : l.completed ? <Icon name="check" size={18} /> : <span className="les-item__num">{i + 1}</span>}
            </span>
            <span className="les-item__body">
              <strong>{i + 1}. {l.title}</strong>
              <small>
                {on ? <Icon name="graphic_eq" size={18} color="var(--brown)" /> : <Icon name="play_circle" size={18} />}
                {l.durationMinutes} мин
              </small>
            </span>
          </>
        );
        return (
          <Fragment key={l.id}>
            {l.locked ? <div className={cls}>{body}</div> : <Link to={`/lesson/${l.id}`} className={cls}>{body}</Link>}
            {l.quiz && (
              l.quiz.locked ? (
                <div className="les-item les-item--lock sub">
                  <span className="les-item__ico"><Icon name="lock" size={16} /></span>
                  <span className="les-item__body"><strong>Сабақ тесті</strong><small><Icon name="quiz" size={18} />{l.quiz.questionCount} сұрақ</small></span>
                </div>
              ) : (
                <Link to={`/tests/lesson/${l.id}`} className={l.quiz.result?.passed ? "les-item sub" : "les-item sub todo"}>
                  <span className="les-item__ico">{l.quiz.result?.passed ? <Icon name="check" size={18} /> : <Icon name="quiz" size={16} />}</span>
                  <span className="les-item__body">
                    <strong>Сабақ тесті</strong>
                    <small><Icon name="quiz" size={18} />{l.quiz.result ? `Үздік нәтиже ${l.quiz.result.best} / ${l.quiz.result.total}` : `${l.quiz.questionCount} сұрақ`}</small>
                  </span>
                </Link>
              )
            )}
          </Fragment>
        );
      })}
      {sec.quiz && (
        sec.quiz.locked ? (
          <div className="les-item les-item--lock">
            <span className="les-item__ico"><Icon name="lock" size={16} /></span>
            <span className="les-item__body"><strong>Тақырып тесті</strong><small><Icon name="quiz" size={18} />{sec.quiz.questionCount} сұрақ</small></span>
          </div>
        ) : (
          <Link to={`/tests/${sec.id}`} className={sec.quiz.result?.passed ? "les-item" : "les-item todo"}>
            <span className="les-item__ico">{sec.quiz.result?.passed ? <Icon name="check" size={18} /> : <Icon name="quiz" size={16} />}</span>
            <span className="les-item__body">
              <strong>Тақырып тесті</strong>
              <small><Icon name="quiz" size={18} />{sec.quiz.result ? `Үздік нәтиже ${sec.quiz.result.best} / ${sec.quiz.result.total}` : `${sec.quiz.questionCount} сұрақ`}</small>
            </span>
          </Link>
        )
      )}
    </article>
  );

  const files = <Files items={lesson.materials} />;
  const body = (
    <>
      {lesson.summary && !lesson.content && <p className="les-intro"><MathText text={lesson.summary} /></p>}
      {lesson.content ? (
        <article className="les-md"><Markdown text={lesson.content} /></article>
      ) : (
        <p className="adm-muted">Сабақтың сипаттамасы әлі қосылмаған.</p>
      )}
      {lessonQuiz && !lessonQuiz.locked && (
        <article className="les-quiz">
          <div>
            <strong>Сабақ тесті</strong>
            <small>
              {lessonQuiz.questionCount} сұрақ · өту шегі {lessonQuiz.passPercent}%
              {lessonQuiz.result ? ` · үздік нәтиже ${lessonQuiz.result.best}/${lessonQuiz.result.total}` : ""}
            </small>
          </div>
          <Link to={`/tests/lesson/${lesson.id}`} className="qz-next">
            {lessonQuiz.result?.passed ? "Тестті қайталау" : "Тестті бастау"}
            <Icon name="arrow_forward" size={16} />
          </Link>
        </article>
      )}
    </>
  );

  return (
    <Shell variant="study" flush crumbs={[{ label: "Курс", to: "/course" }, { label: `${section.order}-бөлім` }]}>
      {/* Phone layout — frame 1:158 */}
      <div className="lm">
        <div className="lm-top">
          <Link to="/course" className="lm-back"><Icon name="arrow_back" size={16} />{section.order}. {section.title}</Link>
          <span className="lm-streak">{pos} / {sec.lessons.length}</span>
        </div>
        <div className="lm-player lm-player--real">
          <VideoFrame key={`${clip}-${videoUrl ?? ""}`} url={videoUrl} title={videoTitle} caption={!onPractice} />
        </div>
        <div className="lm-meta">
          <div className="lm-chips">
            <span className="ubt">{section.order}-бөлім</span>
            {onPractice ? <span className="alg">ҰБТ сұрағы</span> : null}
            <span><Icon name="schedule" size={14} />{lesson.durationMinutes} мин</span>
            {lesson.completed && <span className="alg"><Icon name="check_circle" size={14} fill />Өтілді</span>}
          </div>
          <h1>{lesson.title}</h1>
        </div>
        <div className="lm-actions">
          {onPractice ? (
            <button type="button" className="lm-prev" onClick={() => setClip("lesson")}><Icon name="chevron_left" size={18} />Сабақ</button>
          ) : navigation.prevLessonId ? (
            <Link to={`/lesson/${navigation.prevLessonId}`} className="lm-prev"><Icon name="chevron_left" size={18} />Алдыңғы</Link>
          ) : (
            <Link to="/course" className="lm-prev"><Icon name="chevron_left" size={18} />Курс</Link>
          )}
          {hasPractice && !onPractice ? (
            <button type="button" className="lm-next" onClick={openPractice}>ҰБТ сұрағы<Icon name="arrow_forward" size={16} /></button>
          ) : (
            <button type="button" className="lm-next" onClick={() => go(next.to)}>{next.label}<Icon name="arrow_forward" size={16} /></button>
          )}
        </div>
        <div className="lm-seg">
          <button type="button" className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>Сипаттама</button>
          <button type="button" className={tab === "files" ? "on" : ""} onClick={() => setTab("files")}>Материалдар<b className="brown">({lesson.materials.length})</b></button>
          <button type="button" className={tab === "lessons" ? "on" : ""} onClick={() => setTab("lessons")}>Сабақтар <b>({sec.lessons.length})</b></button>
        </div>
        <div className="lm-body">
          {tab === "about" && body}
          {tab === "files" && files}
          {tab === "lessons" && list}
          {active && tab === "about" && (
            <button type="button" className={lesson.completed ? "les-done on" : "les-done"} disabled={lesson.completed || saving} onClick={markDone}>
              <Icon name="check_circle" size={20} fill={lesson.completed} />{lesson.completed ? "Сабақ өтілді" : "Сабақты аяқтадым"}
            </button>
          )}
        </div>
      </div>

      <div className="les-bar">
        <div className="les-bar__crumbs">
          <Link to="/course">{section.order}-бөлім: {section.title}</Link>
          <Icon name="chevron_right" size={16} />
          <em>{pos}-сабақ: {lesson.title}</em>
        </div>
        <div className="les-bar__right">
          <span><Icon name="verified" size={20} color="var(--brown)" />{course.title}</span>
        </div>
      </div>

      <div className="les">
        <aside className="les-side">
          <article className="les-over">
            <small>{section.order}-бөлім сабақтары</small>
            <h2>{section.title}</h2>
            <div className="les-over__row"><span>Бөлімнің меңгерілуі</span><b>{secPct}%</b></div>
            <i className="les-over__bar"><s style={{ width: `${secPct}%` }} /></i>
          </article>
          {list}
        </aside>

        <div className="les-main">
          <div className="player player--real">
            <VideoFrame key={`${clip}-${videoUrl ?? ""}`} url={videoUrl} title={videoTitle} caption={!onPractice} />
          </div>
          <div className="les-head">
            <div className="les-head__chips">
              <span className="dark"><Icon name="schedule" size={18} />{lesson.durationMinutes} мин</span>
              <span>{pos} / {sec.lessons.length} сабақ</span>
              {onPractice && <span className="free">ҰБТ сұрағы</span>}
              {lesson.isPreview && !active && <span className="free">Тегін сабақ</span>}
            </div>
            <h1>{lesson.title}</h1>
          </div>
          <div className="les-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab !== "files"} className={tab !== "files" ? "on" : ""} onClick={() => setTab("about")}>
              <Icon name="description" size={20} />Сипаттама
            </button>
            <button type="button" role="tab" aria-selected={tab === "files"} className={tab === "files" ? "on" : ""} onClick={() => setTab("files")}>
              <Icon name="folder" size={22} />Материалдар мен файлдар ({lesson.materials.length})
            </button>
          </div>
          <div className="les-body">{tab === "files" ? files : body}</div>
        </div>
      </div>

      <div className="les-foot">
        {onPractice ? (
          <button type="button" className="les-foot__prev" onClick={() => setClip("lesson")}><Icon name="arrow_back" size={18} />Сабаққа оралу</button>
        ) : navigation.prevLessonId ? (
          <Link to={`/lesson/${navigation.prevLessonId}`} className="les-foot__prev"><Icon name="arrow_back" size={18} />Алдыңғы сабақ</Link>
        ) : (
          <Link to="/course" className="les-foot__prev"><Icon name="arrow_back" size={18} />Курс бағдарламасы</Link>
        )}
        {active ? (
          <button type="button" className={lesson.completed ? "les-done on" : "les-done"} disabled={lesson.completed || saving} onClick={markDone}>
            <Icon name="check_circle" size={20} fill={lesson.completed} />{lesson.completed ? "Сабақ өтілді" : "Сабақты аяқтадым"}
          </button>
        ) : (
          <span className="les-foot__mid"><i />Толық курс төлемнен кейін ашылады</span>
        )}
        {hasPractice && !onPractice ? (
          <button type="button" className="les-foot__cta" onClick={openPractice}>ҰБТ сұрағы<Icon name="arrow_forward" size={18} /></button>
        ) : (
          <button type="button" className="les-foot__cta" onClick={() => go(next.to)}>{next.label}<Icon name="arrow_forward" size={18} /></button>
        )}
      </div>
    </Shell>
  );
}

function Files({ items }: { items: Material[] }) {
  if (items.length === 0) return <p className="adm-muted">Бұл сабаққа файл қосылмаған.</p>;
  return (
    <section className="les-files">
      <header>
        <h3><Icon name="link" size={22} color="var(--navy)" />Сабақ материалдары</h3>
        <small>Барлығы {items.length} файл</small>
      </header>
      {items.map((m) => {
        const pdf = /\.pdf$/i.test(m.url);
        return (
          <article key={m.id}>
            <div>
              <span className="les-files__ico"><Icon name={pdf ? "picture_as_pdf" : "description"} size={24} /></span>
              <div>
                <strong>{m.name}</strong>
                <small>{fmtSize(m.size) || "Файл"}</small>
              </div>
            </div>
            <a href={m.url} target="_blank" rel="noreferrer" download><Icon name="download" size={18} />Жүктеу</a>
          </article>
        );
      })}
    </section>
  );
}
