import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { weeks } from "../data/content";

const xs = [54, 150, 246, 342, 438, 534];
const yOf = (v: number) => 233 - v * 3.68;

const weak = [
  { t: "Логарифм", v: 45, c: "#ba1a1a" },
  { t: "Модульді теңдеулер", v: 52, c: "#9d4300" },
  { t: "Мәтінді есептер", v: 58, c: "#9d4300" },
];

export function CabinetPage() {
  const { user } = useAuth();
  const name = user?.name?.split(" ")[0] || "Айбек";
  const pts = weeks.map((v, i) => [xs[i], yOf(v)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <Shell subtitle="Жеке кабинет">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>Сәлем, {name}! <span>👋</span></h1>
            <p>
              <Icon name="hourglass_bottom" size={20} color="#00236f" />
              <span>ҰБТ-ға <b>187 күн</b> қалды</span>
              <i />
              <span className="gray">Күнделікті жоспар: 1 сағ 30 мин</span>
            </p>
          </div>
          <div className="cab-hello__pills">
            <span className="goal"><Icon name="flag" size={16} fill />Мақсатың: 45 балл</span>
            <span className="pace"><Icon name="local_fire_department" size={16} fill color="#9d4300" />5 күндік қарқын</span>
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
              <span className="cab-hero__tag"><i />Жалғастыру</span>
              <p className="cab-hero__sec">3-бөлім · Теңдеулер мен теңсіздіктер</p>
              <h2>Виет теоремасы</h2>
              <p className="cab-hero__text">Квадраттық теңдеулер түбірлерінің қасиеттері мен күрделі{" "}<br />параметрлік есептерді шығару тәсілдері.</p>
              <div className="cab-hero__prog">
                <div><span>Осы тараудың орындалуы</span><b>60%</b></div>
                <i><s style={{ width: "60%" }} /></i>
              </div>
              <Link to="/lesson" className="cab-hero__cta"><Icon name="play_arrow" size={12} fill />Сабақты жалғастыру</Link>
            </article>

            <article className="cab-card">
              <header className="cab-card__head">
                <div>
                  <span className="cab-card__ico"><Icon name="monitoring" size={22} /></span>
                  <div>
                    <h3>Менің нәтижелерім</h3>
                    <p>Апталық сынақ нәтижелерінің динамикасы</p>
                  </div>
                </div>
                <Link to="/tests">Барлық нәтижелер <Icon name="arrow_forward" size={16} /></Link>
              </header>
              <div className="cab-chart">
                <svg viewBox="0 0 576 224" role="img" aria-label="Апталық балл динамикасы">
                  <defs>
                    <linearGradient id="cabArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#1e3a8a" stopOpacity=".25" />
                      <stop offset="1" stopColor="#1e3a8a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[25, 81, 137, 193].map((y) => (
                    <line key={y} x1="32" x2="555" y1={y} y2={y} stroke="#e2e8ff" strokeWidth="1.16" />
                  ))}
                  <line x1="32" x2="555" y1="47" y2="47" stroke="#fd761a" strokeWidth="2.3" strokeDasharray="7 6" opacity=".85" />
                  <text x="555" y="40" textAnchor="end" className="goal">Мақсат: 45 балл</text>
                  <path d={`${line} L${last[0]} 193 L${xs[0]} 193 Z`} fill="url(#cabArea)" />
                  <path d={line} fill="none" stroke="#00236f" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                  {pts.slice(0, -1).map(([x, y], i) => (
                    <g key={x}>
                      <circle cx={x} cy={y} r="5" fill="#fff" stroke="#00236f" strokeWidth="2.9" />
                      <text x={x + 6} y={y - 8} textAnchor="middle" className="val">{weeks[i]}</text>
                    </g>
                  ))}
                  <circle cx={last[0]} cy={last[1]} r="8.5" fill="#fd761a" opacity=".25" />
                  <circle cx={last[0]} cy={last[1]} r="5" fill="#fd761a" stroke="#fff" strokeWidth="2.3" />
                  <rect x={last[0] - 33} y={last[1] - 37} width="64" height="27" rx="6" fill="#00236f" />
                  <text x={last[0] - 1} y={last[1] - 19} textAnchor="middle" className="tip">{weeks[weeks.length - 1]} балл</text>
                </svg>
                <div className="cab-chart__x">
                  {weeks.map((_, i) => (
                    <span key={i} className={i === weeks.length - 1 ? "now" : ""}>{i + 1}-апта</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="cab-card">
              <header className="cab-card__head cab-card__head--flat">
                <div>
                  <span className="cab-card__ico"><Icon name="map" size={22} /></span>
                  <div>
                    <h3>Курс картасы</h3>
                    <p>Жалпы 11 бөлімнен тұратын ҰБТ толық бағдарламасы</p>
                  </div>
                </div>
                <Link to="/course">Курсқа өту <Icon name="arrow_forward" size={16} /></Link>
              </header>
              <div className="cab-map">
                <i className="cab-map__line" />
                {Array.from({ length: 11 }, (_, i) => {
                  const state = i < 4 ? "done" : i === 4 ? "now" : "lock";
                  return (
                    <Link key={i} to={state === "now" ? "/lesson" : "/course"} className={`cab-map__step ${state}`}>
                      <span>
                        {state === "done" && <Icon name="check" size={18} />}
                        {state === "now" && <Icon name="play_circle" size={20} />}
                        {state === "lock" && <Icon name="lock" size={16} />}
                      </span>
                      <b>{i + 1}</b>
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
                    <circle cx="24" cy="24" r="21" fill="none" stroke="#004942" strokeWidth="4.67" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 21 * 0.34} 999`} transform="rotate(-90 24 24)" />
                  </svg>
                  <b>34%</b>
                </div>
                <small>4 / 11{" "}<br />бөлім</small>
              </article>
              <article>
                <span className="cab-kpis__ico peach"><Icon name="local_fire_department" size={20} fill color="#9d4300" /></span>
                <strong>5 күн</strong>
                <small>қатарынан</small>
              </article>
              <article>
                <span className="cab-kpis__ico"><Icon name="verified" size={24} color="#00236f" /></span>
                <strong>31<em>/50</em></strong>
                <small className="up"><Icon name="arrow_drop_up" size={14} />+4 балл</small>
              </article>
            </div>

            <article className="cab-card cab-test">
              <header>
                <h4>Апталық сынақ тест</h4>
                <Icon name="event_available" size={22} color="#9d4300" />
              </header>
              <div className="cab-test__box">
                <div>
                  <strong>Сынақ тест{" "}<br />№6</strong>
                  <small>Сенбі,{" "}<br />10:00</small>
                </div>
                <p>40 тапсырма · 50 балл · ҰБТ{" "}<br />нақты форматы</p>
              </div>
              <div className="cab-test__count">
                <Icon name="timer" size={20} color="#00236f" />
                <span>Тесттің ашылуына: <b>2 күн</b> <b>14 сағат</b></span>
              </div>
              <Link to="/tests" className="cab-test__btn"><Icon name="lock" size={16} />Тестті бастау</Link>
            </article>

            <article className="cab-card cab-weak">
              <header>
                <div>
                  <span className="cab-weak__ico"><Icon name="priority_high" size={20} /></span>
                  <h4>Әлсіз{" "}<br />тақырыптар</h4>
                </div>
                <small>3{" "}<br />тақырып</small>
              </header>
              <p>Соңғы тексерулер бойынша{" "}<br />қайталауды қажет ететін{" "}<br />тақырыптар</p>
              {weak.map((w) => (
                <div key={w.t} className="cab-weak__row">
                  <div><span>{w.t}</span><b style={{ color: w.c }}>{w.v}%</b></div>
                  <i><s style={{ width: `${w.v}%`, background: w.c }} /></i>
                  <Link to="/lesson">Қайталау</Link>
                </div>
              ))}
            </article>
          </div>
        </div>
      </div>
    </Shell>
  );
}
