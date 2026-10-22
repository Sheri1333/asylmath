import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { PageState } from "../components/PageState";
import { useAuth } from "../auth/AuthContext";
import { nextLesson, nextQuiz, sectionDone, sectionEmpty, useMainCourse } from "../lib/course";

/** Days until the main ҰБТ session (around 20 May). */
function daysToUbt(): number {
  const now = new Date();
  let target = new Date(now.getFullYear(), 4, 20);
  if (target.getTime() < now.getTime()) target = new Date(now.getFullYear() + 1, 4, 20);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function CabinetPage() {
  const { user } = useAuth();
  const { view, error, reload } = useMainCourse();
  const name = user?.name?.split(" ")[0] || "Оқушы";

  if (!view) {
    return (
      <Shell subtitle="Жеке кабинет">
        <PageState error={error} onRetry={reload} />
      </Shell>
    );
  }

  const { course, outline, enrollment, access } = view;
  const lessons = outline.flatMap((s) => s.lessons);
  const doneCount = lessons.filter((l) => l.completed).length;
  const progress = enrollment?.progressPercent ?? 0;
  const next = nextLesson(outline);
  const quizNext = nextQuiz(outline);
  const tested = outline.filter((s) => s.quiz?.result);
  const passed = outline.filter((s) => s.quiz?.result?.passed).length;
  const quizTotal = outline.filter((s) => s.quiz).length;
  const weak = tested
    .map((s) => ({ s, pct: Math.round((s.quiz!.result!.best / s.quiz!.result!.total) * 100) }))
    .filter((w) => w.pct < (w.s.quiz!.passPercent ?? 70))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);
  const current = outline.find((s) => s.open && !sectionEmpty(s) && !sectionDone(s));

  // Chart: best score per tested section, as a percentage.
  const pts = tested.map((s) => ({ label: `${s.order}-бөлім`, pct: Math.round((s.quiz!.result!.best / s.quiz!.result!.total) * 100) }));
  const W = 576;
  const step = pts.length > 1 ? 480 / (pts.length - 1) : 0;
  const xy = pts.map((p, i) => [53 + (pts.length > 1 ? i * step : 240), 193 - (p.pct / 100) * 168] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const goalY = 193 - 0.7 * 168;

  return (
    <Shell subtitle="Жеке кабинет">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>Сәлем, {name}! <span>👋</span></h1>
            <p>
              <Icon name="hourglass_bottom" size={20} color="#00236f" />
              <span>ҰБТ-ға <b>{daysToUbt()} күн</b> қалды</span>
              <i />
              <span className="gray">{course.title}</span>
            </p>
          </div>
          <div className="cab-hello__pills">
            {access ? (
              <span className="goal"><Icon name="flag" size={16} fill />Курс {progress}% өтілді</span>
            ) : (
              <Link to="/course" className="pace"><Icon name="lock" size={16} />{enrollment?.status === "pending" ? "Төлем тексерілуде" : "Курсқа қолжетімділік жоқ"}</Link>
            )}
          </div>
        </section>

        <div className="cab-grid">
          <div className="cab-col">
            <article className="cab-hero">
              <i className="cab-hero__blob" />
              <svg className="cab-hero__art" viewBox="0 0 220 180" aria-hidden>
                <path d="M110 20 L20 160 L200 160 Z" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="6 6" />
                <line x1="110" y1="20" x2="110" y2="160" stroke="#fff" strokeWidth="2" />
                <circle cx="110" cy="20" r="8" fill="#fff" />
                <circle cx="20" cy="160" r="8" fill="#fff" />
                <circle cx="200" cy="160" r="8" fill="#fff" />
              </svg>
              {!access ? (
                <>
                  <span className="cab-hero__tag"><i />{enrollment?.status === "pending" ? "Тексерілуде" : "Бастау"}</span>
                  <h2>{enrollment?.status === "pending" ? "Төлеміңіз тексерілуде" : "Курсты ашыңыз"}</h2>
                  <p className="cab-hero__text">
                    {enrollment?.status === "pending"
                      ? "Әкімші төлемді растағаннан кейін барлық сабақтар мен тесттер осында ашылады."
                      : "Тегін сабақтарды қазір көре аласыз. Толық курс Kaspi арқылы төлегеннен кейін ашылады."}
                  </p>
                  <Link to="/course" className="cab-hero__cta"><Icon name="play_arrow" size={12} fill />Курс бағдарламасы</Link>
                </>
              ) : next ? (
                <>
                  <span className="cab-hero__tag"><i />{doneCount ? "Жалғастыру" : "Бастау"}</span>
                  <p className="cab-hero__sec">{next.section.order}-бөлім · {next.section.title}</p>
                  <h2>{next.lesson.title}</h2>
                  {next.lesson.summary && <p className="cab-hero__text">{next.lesson.summary}</p>}
                  <div className="cab-hero__prog">
                    <div>
                      <span>Осы бөлімнің орындалуы</span>
                      <b>{Math.round((next.section.lessons.filter((l) => l.completed).length / next.section.lessons.length) * 100)}%</b>
                    </div>
                    <i><s style={{ width: `${(next.section.lessons.filter((l) => l.completed).length / next.section.lessons.length) * 100}%` }} /></i>
                  </div>
                  <Link to={`/lesson/${next.lesson.id}`} className="cab-hero__cta"><Icon name="play_arrow" size={12} fill />{doneCount ? "Сабақты жалғастыру" : "Бірінші сабақты бастау"}</Link>
                </>
              ) : quizNext ? (
                <>
                  <span className="cab-hero__tag"><i />Тест</span>
                  <p className="cab-hero__sec">{quizNext.order}-бөлім · {quizNext.title}</p>
                  <h2>Бөлімнің сабақтары өтілді</h2>
                  <p className="cab-hero__text">Келесі бөлімді ашу үшін тақырыптық тестті тапсырыңыз.</p>
                  <Link to={`/tests/${quizNext.id}`} className="cab-hero__cta"><Icon name="play_arrow" size={12} fill />Тестке өту</Link>
                </>
              ) : (
                <>
                  <span className="cab-hero__tag"><i />Дайын</span>
                  <h2>Барлық ашық сабақтар өтілді</h2>
                  <p className="cab-hero__text">Жаңа сабақтар қосылғанда осында шығады. Әзірге тесттерді қайталап, нәтижеңізді жақсартыңыз.</p>
                  <Link to="/course" className="cab-hero__cta"><Icon name="play_arrow" size={12} fill />Курс бағдарламасы</Link>
                </>
              )}
            </article>

            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="monitoring" size={22} /></span>
                  <div>
                    <h3>Менің нәтижелерім</h3>
                    <p>Тақырыптық тесттердегі үздік нәтиже</p>
                  </div>
                </div>
                {quizNext && <Link to={`/tests/${quizNext.id}`}>Келесі тест <Icon name="arrow_forward" size={16} /></Link>}
              </header>
              {pts.length === 0 ? (
                <div className="acc__empty">
                  <p>Алғашқы тақырыптық тесттен кейін нәтиже графигі осында пайда болады.</p>
                </div>
              ) : (
                <div className="cab-chart">
                  <svg viewBox={`0 0 ${W} 224`} role="img" aria-label="Тест нәтижелері бөлімдер бойынша">
                    <defs>
                      <linearGradient id="cabArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1e3a8a" stopOpacity=".25" />
                        <stop offset="1" stopColor="#1e3a8a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[25, 81, 137, 193].map((y) => (
                      <line key={y} x1="32" x2="555" y1={y} y2={y} stroke="#e2e8ff" strokeWidth="1.16" />
                    ))}
                    <line x1="32" x2="555" y1={goalY} y2={goalY} stroke="#fd761a" strokeWidth="2.3" strokeDasharray="7 6" opacity=".85" />
                    <text x="555" y={goalY - 7} textAnchor="end" className="goal">Өту шегі 70%</text>
                    {xy.length > 1 && <path d={`${line} L${xy[xy.length - 1][0]} 193 L${xy[0][0]} 193 Z`} fill="url(#cabArea)" />}
                    {xy.length > 1 && <path d={line} fill="none" stroke="#00236f" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
                    {xy.map(([x, y], i) => (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill={pts[i].pct >= 70 ? "#fff" : "#fd761a"} stroke="#00236f" strokeWidth="2.9" />
                        <text x={x} y={y - 12} textAnchor="middle" className="val">{pts[i].pct}%</text>
                      </g>
                    ))}
                  </svg>
                  <div className="cab-chart__x" style={{ gridTemplateColumns: `repeat(${pts.length}, 1fr)` }}>
                    {pts.map((p, i) => (
                      <span key={i} className={i === pts.length - 1 ? "now" : ""}>{p.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            <article className="cab-card">
              <header className="cab-card__head cab-card__head--flat">
                <div>
                  <span className="cab-card__ico"><Icon name="map" size={22} /></span>
                  <div>
                    <h3>Курс картасы</h3>
                    <p>Жалпы {outline.length} бөлімнен тұратын бағдарлама</p>
                  </div>
                </div>
                <Link to="/course">Курсқа өту <Icon name="arrow_forward" size={16} /></Link>
              </header>
              <div className="cab-map">
                <i className="cab-map__line" />
                {outline.map((s) => {
                  const state = sectionEmpty(s) ? "soon" : !s.open ? "lock" : sectionDone(s) ? "done" : s.id === current?.id ? "now" : "open";
                  return (
                    <Link key={s.id} to="/course" className={`cab-map__step ${state}`} title={`${s.order}. ${s.title}`}>
                      <span>
                        {state === "done" && <Icon name="check" size={18} />}
                        {state === "now" && <Icon name="play_circle" size={20} />}
                        {state === "lock" && <Icon name="lock" size={16} />}
                        {state === "open" && <Icon name="play_circle" size={20} />}
                        {state === "soon" && <Icon name="schedule" size={16} />}
                      </span>
                      <b>{s.order}</b>
                    </Link>
                  );
                })}
              </div>
            </article>
          </div>

          <div className="cab-col cab-col--side">
            <div className="cab-kpis">
              <article>
                <div className="cab-ring">
                  <svg viewBox="0 0 48 48" aria-hidden>
                    <circle cx="24" cy="24" r="21" fill="none" stroke="#e2e7ff" strokeWidth="4.67" />
                    <circle cx="24" cy="24" r="21" fill="none" stroke="#004942" strokeWidth="4.67" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 21 * (progress / 100)} 999`} transform="rotate(-90 24 24)" />
                  </svg>
                  <b>{progress}%</b>
                </div>
                <small>курс<br />өтілді</small>
              </article>
              <article>
                <span className="cab-kpis__ico peach"><Icon name="play_lesson" size={20} color="#9d4300" /></span>
                <strong>{doneCount}<em>/{lessons.length}</em></strong>
                <small>сабақ</small>
              </article>
              <article>
                <span className="cab-kpis__ico"><Icon name="verified" size={24} color="#00236f" /></span>
                <strong>{passed}<em>/{quizTotal}</em></strong>
                <small>тест өтті</small>
              </article>
            </div>

            <article className="cab-card cab-test">
              <header>
                <h4>Келесі тест</h4>
                <Icon name="event_available" size={22} color="#9d4300" />
              </header>
              {quizNext && quizNext.quiz ? (
                <>
                  <div className="cab-test__box">
                    <div>
                      <strong>{quizNext.order}-бөлім тесті</strong>
                    </div>
                    <p>{quizNext.title}</p>
                    <p>{quizNext.quiz.questionCount} сұрақ · өту шегі {quizNext.quiz.passPercent}%</p>
                  </div>
                  {quizNext.quiz.timeLimitMinutes > 0 && (
                    <div className="cab-test__count">
                      <Icon name="timer" size={20} color="#00236f" />
                      <span>Уақыты: <b>{quizNext.quiz.timeLimitMinutes} минут</b></span>
                    </div>
                  )}
                  <Link to={`/tests/${quizNext.id}`} className="cab-test__btn on"><Icon name="play_arrow" size={16} />Тестті бастау</Link>
                </>
              ) : (
                <div className="acc__empty">
                  <p>{access ? "Ашық тесттердің бәрі тапсырылды. Келесі бөлімнің сабақтарын жалғастырыңыз." : "Тесттер курс ашылғаннан кейін қолжетімді."}</p>
                </div>
              )}
            </article>

            <article className="cab-card cab-weak">
              <header>
                <div>
                  <span className="cab-weak__ico"><Icon name="priority_high" size={20} /></span>
                  <h4>Әлсіз{" "}<br />тақырыптар</h4>
                </div>
                <small>{weak.length}{" "}<br />тақырып</small>
              </header>
              <p>Тест нәтижесі өту шегінен төмен бөлімдер</p>
              {weak.length === 0 ? (
                <div className="acc__empty">
                  <p>{tested.length ? "Тапсырылған тесттердің бәрі шекке жетті." : "Тест тапсырғаннан кейін қайталау керек тақырыптар осында шығады."}</p>
                </div>
              ) : (
                weak.map(({ s, pct }) => (
                  <div key={s.id} className="cab-weak__row">
                    <div><span>{s.title}</span><b style={{ color: pct < 50 ? "#ba1a1a" : "#9d4300" }}>{pct}%</b></div>
                    <i><s style={{ width: `${pct}%`, background: pct < 50 ? "#ba1a1a" : "#9d4300" }} /></i>
                    <Link to={`/tests/${s.id}`}>Қайталау</Link>
                  </div>
                ))
              )}
            </article>
          </div>
        </div>
      </div>
    </Shell>
  );
}
