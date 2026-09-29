import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { lessons } from "../data/content";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StudyLessonPage() {
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(8 * 60 + 42);
  const total = 14 * 60 + 15;
  const [active, setActive] = useState(3);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setSec((v) => Math.min(total, v + 1)), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <Shell crumbs="Басты бет › Курс модульдері">
      <p className="crumbs">3-бөлім: Алгебралық теңдеулер › 3.3 Виет теоремасы › 3-сабақ: Кері Виет теоремасы</p>
      <div className="lesson">
        <aside className="card lesson-side">
          <p className="eyebrow">Тарау сабақтары</p>
          <h2>3.3 Виет теоремасы</h2>
          <div className="row-between"><span>Тарау меңгерілуі</span><b>66%</b></div>
          <div className="bar"><i style={{ width: "66%" }} /></div>
          <p>Барлығы 1 файл · ұзақтығы 41 мин</p>
          <ol>
            {lessons.map((l) => (
              <li key={l.id}>
                <button type="button" className={active === l.id ? "on" : "ok"} onClick={() => setActive(l.id)}>
                  <span>{l.id}</span>
                  {l.title}
                  <small>{l.minutes} мин</small>
                </button>
              </li>
            ))}
            <li className="locked">Тақырып тесті · 10 сұрақ · сабақтан кейін</li>
          </ol>
        </aside>

        <div>
          <article className="player" style={{ ["--p" as string]: `${(sec / total) * 100}%` }}>
            <div className="player-stage">
              <p>MATH ASYL HD · 3.3 Сабақ: Квадрат теңдеу құру</p>
              <h2>Кері Виет теоремасы</h2>
              <p className="formula">x² + px + q = 0</p>
              <p>x₁ + x₂ = −p · x₁ · x₂ = q</p>
              <button type="button" className="play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Тоқтату" : "Ойнату"}>
                {playing ? "❚❚" : "▶"}
              </button>
            </div>
            <div className="player-bar">
              <button type="button" onClick={() => setPlaying((v) => !v)}>{playing ? "Тоқта" : "Ойна"}</button>
              <div className="bar"><i /></div>
              <span>{fmt(sec)} / {fmt(total)}</span>
            </div>
          </article>

          <div className="row-between lesson-title">
            <div>
              <p>14 мин · 3 / 3 сабақ</p>
              <h1>3.3 Кері Виет теоремасы — квадрат теңдеуді түбірлері бойынша құру</h1>
            </div>
          </div>
          <p>
            Бұл сабақта берілген екі сан бойынша квадрат теңдеу құру жолын, яғни кері Виет
            теоремасын үйренеміз. Бұл әдіс ҰБТ есептерінде жауап нұсқалары арқылы есепті небәрі
            30 секундта тексеруге және параметрлі теңдеулерді оңай шығаруға мүмкіндік береді.
          </p>
          <div className="lesson-nav">
            <button type="button" className="btn btn-soft" onClick={() => setActive(2)}>Алдыңғы сабақ: 2. Қолдану</button>
            <Link to="/tests" className="btn btn-orange">Тақырып тестіне өту</Link>
          </div>

          <article className="card">
            <h3>Бұл сабақта үйренесің:</h3>
            <ul>
              <li>Кері Виет теоремасының тұжырымдамасы мен қолданылу шарттары: түбірлердің қосындысы мен көбейтіндісі арқылы теңдеу құру.</li>
              <li>Түбірлері белгілі болғанда келтірілген және толық квадрат теңдеулерді құрудың 3 қадамдық жедел алгоритмі.</li>
              <li>ҰБТ-да уақыт үнемдейтін тәсілдер: тестілеу нұсқаларымен кері жұмыс істеу.</li>
            </ul>
          </article>

          <article className="card">
            <div className="row-between">
              <h3>Есте сақтауға міндетті формулалар</h3>
              <span>Шпаргалка №14</span>
            </div>
            <div className="formulas">
              <div><b>x₁ + x₂ = −p</b><span>түбірлер қосындысы</span></div>
              <div><b>x₁ · x₂ = q</b><span>түбірлер көбейтіндісі</span></div>
              <div><b>x² − (x₁+x₂)x + x₁x₂ = 0</b><span>құрылған теңдеу</span></div>
            </div>
            <p>
              Лайфхак: түбірлері 3 және −5 болса, қосындысы −2, көбейтіндісі −15. Теңдеу:
              <b> x² + 2x − 15 = 0</b>.
            </p>
          </article>

          <article className="card file">
            <div>
              <strong>Конспект — Кері Виет теоремасы.pdf</strong>
              <p>1.2 MB · қысқаша шпаргалка</p>
            </div>
            <a className="btn btn-soft" href="/assets/konspekt.txt" download>Жүктеу</a>
          </article>
        </div>
      </div>
    </Shell>
  );
}
