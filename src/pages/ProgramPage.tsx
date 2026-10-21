import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { modules } from "../data/content";

export function ProgramPage() {
  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Курс бағдарламасы" }]} subtitle="Курс">
      <div className="cab">
        <section className="cab-hello">
          <div>
            <h1>Курс бағдарламасы</h1>
            <p><Icon name="menu_book" size={20} color="#00236f" /><span>11 бөлім · <b>4 бөлім</b> меңгерілді</span></p>
          </div>
          <div className="cab-hello__pills">
            <span className="goal"><Icon name="flag" size={16} fill />Мақсатың: 45 балл</span>
          </div>
        </section>
        <div className="prog">
          {modules.map((m) => {
            const state = m.id < 3 ? "done" : m.id === 3 ? "now" : "lock";
            return (
              <article key={m.id} className={`prog__item ${state}`}>
                <span className="prog__n">
                  {state === "done" ? <Icon name="check" size={18} /> : state === "lock" ? <Icon name="lock" size={16} /> : m.id}
                </span>
                <div>
                  <h3>{m.id}. {m.title}</h3>
                  <p>{m.text}</p>
                  <small>{m.meta}</small>
                </div>
                {state === "now" ? (
                  <Link to="/lesson" className="prog__btn">Сабақты ашу<Icon name="arrow_forward" size={16} /></Link>
                ) : state === "done" ? (
                  <span className="prog__tag">Меңгерілді</span>
                ) : (
                  <span className="prog__tag lock">Жабық</span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
