import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { lessons } from "../data/content";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TOTAL = 14 * 60 + 15;

export function StudyLessonPage() {
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(8 * 60 + 42);
  const [active, setActive] = useState(3);
  const [tab, setTab] = useState<"about" | "files">("about");

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setSec((v) => (v >= TOTAL ? TOTAL : v + 1)), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const played = (sec / TOTAL) * 100;
  const current = lessons.find((l) => l.id === active) ?? lessons[2];

  return (
    <Shell variant="study" subtitle="Курс" flush>
      <div className="les-bar">
        <div className="les-bar__crumbs">
          <span>3-бөлім: Алгебралық теңдеулер</span>
          <Icon name="chevron_right" size={16} />
          <span>3.3 Виет теоремасы</span>
          <Icon name="chevron_right" size={16} />
          <em>3-сабақ: Кері Виет теоремасы</em>
        </div>
        <div className="les-bar__right">
          <span><Icon name="verified" size={20} color="#9d4300" />ҰБT-2025 бағдарламасы</span>
          <button type="button"><Icon name="share" size={18} />Бөлісу</button>
        </div>
      </div>

      <div className="les">
        <aside className="les-side">
          <article className="les-over">
            <small>Тарау сабақтары</small>
            <h2>3.3 Виет теоремасы</h2>
            <div className="les-over__row"><span>Тарау меңгерілуі</span><b>66%</b></div>
            <i className="les-over__bar"><s style={{ width: "66%" }} /></i>
          </article>

          <article className="les-list">
            <header><b>Барлығы 1 файл</b><span>Ұзақтығы: 41 мин</span></header>
            {lessons.map((l) => {
              const on = l.id === active;
              return (
                <button key={l.id} type="button" className={on ? "les-item on" : "les-item"} onClick={() => setActive(l.id)}>
                  <span className="les-item__ico">
                    {on ? <Icon name="play_arrow" size={18} fill /> : <Icon name="check" size={18} />}
                  </span>
                  <span className="les-item__body">
                    <strong>{l.id}. {l.title}</strong>
                    <small>
                      {on ? <Icon name="graphic_eq" size={20} color="#9d4300" /> : <Icon name="play_circle" size={20} />}
                      {l.minutes} мин
                    </small>
                  </span>
                </button>
              );
            })}
            <Link to="/tests" className="les-item les-item--lock">
              <span className="les-item__ico"><Icon name="lock" size={18} /></span>
              <span className="les-item__body">
                <strong>Тақырып тесті</strong>
                <small>
                  <Icon name="quiz" size={20} />10<br />сұрақ
                  <span className="dot">•</span>
                  <em>Сабақтардан кейін<br />ашылады 🔒</em>
                </small>
              </span>
            </Link>
          </article>
        </aside>

        <div className="les-main">
          <div className="player">
            <svg className="player__grid" aria-hidden>
              <defs>
                <pattern id="bp" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M32 0H0V32" fill="none" stroke="#dae2fd" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#bp)" />
            </svg>
            <div className="player__stage">
              <span className="player__chip"><Icon name="functions" size={16} />Кері Виет теоремасы</span>
              <p className="player__formula">x² + px + q = 0</p>
              <div className="player__pair">
                <span>x₁ + x₂ = −p</span>
                <b>•</b>
                <span>x₁ • x₂ = q</span>
              </div>
              <p className="player__cap">Егер x₁ және x₂ сандары берілсе, олар x² − (x₁ + x₂)x + x₁x₂ = 0<br />теңдеуінің түбірлері болады.</p>
            </div>
            <div className="player__top">
              <div>
                <span className="player__hd">MATH ASYL HD</span>
                <strong>3.3 Сабақ: Квадрат теңдеу құру</strong>
              </div>
              <div>
                <button type="button" aria-label="Бетбелгі"><Icon name="bookmark" size={20} /></button>
                <button type="button" aria-label="Баптаулар"><Icon name="settings" size={22} /></button>
              </div>
            </div>
            {!playing && (
              <button type="button" className="player__play" onClick={() => setPlaying(true)} aria-label="Ойнату">
                <Icon name="play_arrow" size={36} fill />
              </button>
            )}
            <div className="player__ctrl">
              <div
                className="player__scrub"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setSec(Math.round(((e.clientX - r.left) / r.width) * TOTAL));
                }}
              >
                <i style={{ width: "78%" }} />
                <s style={{ width: `${played}%` }}><b /></s>
              </div>
              <div className="player__row">
                <div>
                  <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Тоқтату" : "Ойнату"}>
                    <Icon name={playing ? "pause" : "play_arrow"} size={22} fill />
                  </button>
                  <button type="button" onClick={() => setSec((v) => Math.max(0, v - 10))} aria-label="10 секунд артқа"><Icon name="replay_10" size={22} /></button>
                  <button type="button" onClick={() => setSec((v) => Math.min(TOTAL, v + 10))} aria-label="10 секунд алға"><Icon name="forward_10" size={22} /></button>
                  <span className="player__vol"><Icon name="volume_up" size={20} /><i><s /></i></span>
                  <span className="player__time">{fmt(sec)}<em> / {fmt(TOTAL)}</em></span>
                </div>
                <div>
                  <span className="player__speed">1.0x</span>
                  <button type="button" aria-label="Субтитр"><Icon name="closed_caption" size={22} /></button>
                  <button type="button" aria-label="Толық экран"><Icon name="fullscreen" size={24} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="les-head">
            <div className="les-head__chips">
              <span className="dark"><Icon name="schedule" size={18} />{current.minutes} мин</span>
              <span>{active} / 3 сабақ</span>
            </div>
            <h1>
              {active === 3 ? (
                <>3.3 Кері Виет теоремасы — Квадрат<br />теңдеуді түбірлері бойынша құру</>
              ) : (
                <>3.3 {current.title}</>
              )}
            </h1>
          </div>

          <div className="les-tabs">
            <button type="button" className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>
              <Icon name="description" size={20} />Сипаттама
            </button>
            <button type="button" className={tab === "files" ? "on" : ""} onClick={() => setTab("files")}>
              <Icon name="folder" size={22} />Материалдар мен файлдар (1)
            </button>
          </div>

          {tab === "about" && (
            <div className="les-body">
              <p className="les-intro">
                Бұл сабақта берілген екі сан бойынша квадрат теңдеу құру жолын, яғни <b>кері Виет теоремасын</b> үйренеміз. Бұл әдіс ҰБТ есептерінде жауап нұсқалары арқылы есепті небәрі <em>30 секундта</em> тексеруге және параметрлі теңдеулерді оңай шығаруға мүмкіндік береді.
              </p>

              <article className="les-card">
                <h3><Icon name="school" size={24} color="#9d4300" />Бұл сабақта үйренесің:</h3>
                <ul className="les-out">
                  <li><span><Icon name="check" size={14} /></span><p><b>Кері Виет теоремасының тұжырымдамасы мен қолданылу шарттары:</b> түбірлердің қосындысы мен көбейтіндісі арқылы теңдеу құру.</p></li>
                  <li><span><Icon name="check" size={14} /></span><p><b>Түбірлері белгілі болғанда:</b> келтірілген және толық квадрат теңдеулерді құрудың 3 қадамдық жедел алгоритмі.</p></li>
                  <li><span><Icon name="check" size={14} /></span><p><b>ҰБТ-да уақыт үнемдейтін тәсілдер:</b> тестілеу нұсқаларымен кері жұмыс істеу және күрделі параметрлік мысалдарды шешу.</p></li>
                </ul>
              </article>

              <article className="les-formulas">
                <header>
                  <div>
                    <span className="les-formulas__sig">∑</span>
                    <div>
                      <small>Есте сақтауға міндетті формулалар</small>
                      <h4>Кері Виет теоремасы формулалары:</h4>
                    </div>
                  </div>
                  <span className="les-formulas__tag">Шпаргалка №14</span>
                </header>
                <div className="les-formulas__grid">
                  <div><small>Түбірлер қосындысы</small><b>x₁ + x₂ = −p</b><span>екінші коэффициент<br />кері таңбамен</span></div>
                  <div><small>Түбірлер көбейтіндісі</small><b>x₁ • x₂ = q</b><span>бос мүше өз<br />таңбасымен</span></div>
                  <div><small>Құрылған теңдеу<br />моделі</small><b className="brown">x² − (x₁+x₂)x +<br />(x₁x₂) = 0</b><span>келтірілген теңдеу<br />қалыбы</span></div>
                </div>
                <p className="les-formulas__tip">
                  <Icon name="lightbulb" size={22} color="#9d4300" />
                  <span><b>Лайфхак:</b> Егер ҰБТ сұрағында түбірлері 3 және −5 болатын теңдеу сұралса: қосындысы 3 + (-5) = -2 (яғни +2x), ал көбейтіндісі 3 • (-5) = -15. Теңдеу бірден шығады: <code>x² + 2x - 15 = 0</code>.</span>
                </p>
              </article>

              <Files />
            </div>
          )}

          {tab === "files" && (
            <div className="les-body">
              <Files />
            </div>
          )}
        </div>
      </div>

      <div className="les-foot">
        <button type="button" className="les-foot__prev" onClick={() => setActive((a) => Math.max(1, a - 1))}>
          <Icon name="arrow_back" size={18} />Алдыңғы сабақ: 2. Қолдану
        </button>
        <span className="les-foot__mid"><i />3-сабақ соңы • Сынаққа дайынсыз ба?</span>
        <Link to="/tests" className="les-foot__cta">Тақырып тестіне өту<Icon name="arrow_forward" size={18} /></Link>
      </div>
    </Shell>
  );
}

function Files() {
  return (
    <section className="les-files">
      <header>
        <h3><Icon name="link" size={22} color="#00236f" />Сабақ материалдары</h3>
        <small>Барлығы 1 файл</small>
      </header>
      <article>
        <div>
          <span className="les-files__ico"><Icon name="picture_as_pdf" size={24} /></span>
          <div>
            <strong>Конспект — Кері Виет теоремасы.pdf</strong>
            <small>1.2 MB • Қысқаша шпаргалка</small>
          </div>
        </div>
        <a href="/assets/konspekt.txt" download><Icon name="download" size={18} />Жүктеу</a>
      </article>
    </section>
  );
}
