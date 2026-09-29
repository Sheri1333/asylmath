import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { useAuth } from "../auth/AuthContext";
import { weeks } from "../data/content";

export function CabinetPage() {
  const { user } = useAuth();
  const name = user?.name?.split(" ")[0] || "Айбек";
  const max = 50;
  const w = 520;
  const h = 160;
  const pts = weeks
    .map((v, i) => {
      const x = 24 + (i * (w - 48)) / (weeks.length - 1);
      const y = h - 24 - (v / max) * (h - 48);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Shell>
      <section className="hello">
        <div>
          <h1>Сәлем, {name}! 👋</h1>
          <p>ҰБТ-ға 187 күн қалды · Күнделікті жоспар: 1 сағ 30 мин</p>
        </div>
        <div className="pills">
          <span>Мақсатың: 45 балл</span>
          <span>5 күндік қарқын</span>
        </div>
      </section>

      <div className="dash">
        <div className="dash-main">
          <article className="hero-card">
            <span className="tag">Жалғастыру</span>
            <p>3-бөлім · Теңдеулер мен теңсіздіктер</p>
            <h2>Виет теоремасы</h2>
            <p>Квадраттық теңдеулер түбірлерінің қасиеттері мен күрделі параметрлік есептерді шығару тәсілдері.</p>
            <div className="row-between">
              <span>Осы тараудың орындалуы</span>
              <b>60%</b>
            </div>
            <div className="bar light"><i style={{ width: "60%" }} /></div>
            <Link to="/lesson" className="btn btn-orange">Сабақты жалғастыру</Link>
          </article>

          <article className="card">
            <div className="row-between">
              <div>
                <h3>Менің нәтижелерім</h3>
                <p>Апталық сынақ нәтижелерінің динамикасы</p>
              </div>
              <Link to="/tests">Барлық нәтижелер →</Link>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Апталық балл динамикасы">
              <line x1="24" y1={h - 24 - (45 / max) * (h - 48)} x2={w - 16} y2={h - 24 - (45 / max) * (h - 48)} className="goal" />
              <polyline points={pts} />
              {weeks.map((v, i) => {
                const x = 24 + (i * (w - 48)) / (weeks.length - 1);
                const y = h - 24 - (v / max) * (h - 48);
                return <circle key={v + i} cx={x} cy={y} r={i === weeks.length - 1 ? 5 : 4} />;
              })}
            </svg>
            <div className="weeks">
              {weeks.map((_, i) => (
                <span key={i}>{i + 1}-апта</span>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="row-between">
              <div>
                <h3>Курс картасы</h3>
                <p>Жалпы 11 бөлімнен тұратын ҰБТ толық бағдарламасы</p>
              </div>
              <Link to="/course">Курсқа өту →</Link>
            </div>
            <div className="map">
              {Array.from({ length: 11 }, (_, i) => (
                <Link key={i} to={i === 4 ? "/lesson" : "/course"} className={i < 4 ? "done" : i === 4 ? "now" : "lock"}>
                  {i + 1}
                </Link>
              ))}
            </div>
          </article>
        </div>

        <aside className="dash-side">
          <div className="kpis">
            <article><b>34%</b><span>4 / 11 бөлім</span></article>
            <article><b>5 күн</b><span>қатарынан</span></article>
            <article><b>31/50</b><span>+4 балл</span></article>
          </div>
          <article className="card">
            <h3>Апталық сынақ тест</h3>
            <p><b>Сынақ тест №6</b><br />Сенбі, 10:00</p>
            <p>40 тапсырма · 50 балл · ҰБТ нақты форматы</p>
            <p>Тесттің ашылуына: 2 күн 14 сағат</p>
            <Link to="/tests" className="btn btn-soft">Тестті бастау</Link>
          </article>
          <article className="card">
            <h3>Әлсіз тақырыптар</h3>
            <p>3 тақырып қайталауды қажет етеді</p>
            {[
              ["Логарифм", 45],
              ["Модульді теңдеулер", 52],
              ["Мәтінді есептер", 58],
            ].map(([label, value]) => (
              <div key={String(label)} className="weak">
                <div className="row-between"><span>{label}</span><b>{value}%</b></div>
                <div className="bar"><i style={{ width: `${value}%` }} /></div>
                <Link to="/lesson">Қайталау</Link>
              </div>
            ))}
          </article>
        </aside>
      </div>
    </Shell>
  );
}
