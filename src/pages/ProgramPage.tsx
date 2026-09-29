import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { modules } from "../data/content";

export function ProgramPage() {
  return (
    <Shell crumbs="Басты бет › Курс модульдері">
      <h1>Курс бағдарламасы</h1>
      <p className="lead">11 бөлім. 3-бөлімдегі Виет теоремасы сабағы ашық.</p>
      <div className="mods mods--app">
        {modules.map((m) => (
          <article key={m.id}>
            <h3>
              {m.id}. {m.title}
            </h3>
            <p>{m.text}</p>
            <small>{m.meta}</small>
            <Link to={m.id === 3 ? "/lesson" : "/course"} className="btn btn-soft">
              {m.id === 3 ? "Сабақты ашу" : "Жақында"}
            </Link>
          </article>
        ))}
      </div>
    </Shell>
  );
}
