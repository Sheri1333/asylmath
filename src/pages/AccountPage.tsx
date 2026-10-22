import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";

type Enrollment = Awaited<ReturnType<typeof api.myEnrollments>>["enrollments"][number];


export function AccountPage() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState("");
  const name = user?.name || "Оқушы";

  useEffect(() => {
    api
      .myEnrollments()
      .then((r) => setItems(r.enrollments))
      .catch((e) => setError(e instanceof Error ? e.message : "Курстарды жүктеу мүмкін болмады"));
  }, []);

  return (
    <Shell crumbs={[{ label: "Оқу кеңістігі", to: "/home" }, { label: "Профиль" }]} subtitle="Профиль">
      <div className="cab">
        <section className="cab-hello">
          <div className="acc">
            <span className="acc__ava">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <h1>{name}</h1>
              <p><Icon name="person" size={20} color="#00236f" /><span>{user?.email}</span></p>
            </div>
          </div>
          <div className="cab-hello__pills">
            {isAdmin && (
              <Link to="/admin" className="pace"><Icon name="admin_panel_settings" size={16} />Админ-панель</Link>
            )}
            <button
              type="button"
              className="acc__out"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <Icon name="logout" size={16} />Шығу
            </button>
          </div>
        </section>

        <div className="acc__grid">
          <article className="cab-card">
            <header className="cab-card__head cab-card__head--flat">
              <div>
                <span className="cab-card__ico"><Icon name="menu_book" size={22} /></span>
                <div>
                  <h3>Менің курстарым</h3>
                  <p>Жазылған курстар және өту барысы</p>
                </div>
              </div>
            </header>
            {error && <p className="adm-alert">{error}</p>}
            {!error && items === null && <p className="adm-muted">Жүктелуде…</p>}
            {items && items.length === 0 && (
              <div className="acc__empty">
                <p>Әзірге ешбір курсқа жазылмағансыз. Бағдарламадан бастаңыз: бірінші сабақ бірден ашылады.</p>
                <Link to="/course" className="prog__btn">Бағдарламаны ашу<Icon name="arrow_forward" size={16} /></Link>
              </div>
            )}
            {items && items.length > 0 && (
              <ul className="acc__courses">
                {items.map((e) => (
                  <li key={e.courseId}>
                    <span className="adm-swatch" style={{ background: e.course.coverColor }} />
                    <div>
                      <b>{e.course.title}</b>
                      <i><s style={{ width: `${e.progressPercent}%` }} /></i>
                      <small>{e.completedLessonIds.length} / {e.course.lessonCount} сабақ өтілді</small>
                    </div>
                    <strong>{e.progressPercent}%</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="cab-card">
            <header className="cab-card__head cab-card__head--flat">
              <div>
                <span className="cab-card__ico"><Icon name="quiz" size={22} /></span>
                <div>
                  <h3>Тақырыптық тесттер</h3>
                  <p>Барлық курстар бойынша</p>
                </div>
              </div>
            </header>
            {(() => {
              const results = (items ?? []).flatMap((e) => Object.values(e.quizResults));
              if (results.length === 0)
                return (
                  <div className="acc__empty">
                    <p>Әзірге тест тапсырылмаған. Бөлімнің сабақтарын өткен соң тест ашылады.</p>
                    <Link to="/tests" className="prog__btn">Келесі тест<Icon name="arrow_forward" size={16} /></Link>
                  </div>
                );
              const passedN = results.filter((r) => r.passed).length;
              return (
                <div className="acc__score">
                  <b className={passedN === results.length ? "ok" : ""}>{passedN}<em>/{results.length}</em></b>
                  <p>{passedN === results.length ? "Тапсырылған тесттердің бәрі өтті." : "Кейбір тесттер шекке жетпеді: оларды кабинеттегі «Әлсіз тақырыптар» блогынан қайталаңыз."}</p>
                  <Link to="/home">Кабинетке өту<Icon name="arrow_forward" size={16} /></Link>
                </div>
              );
            })()}
          </article>
        </div>
        <PasswordCard />
      </div>
    </Shell>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Құпиясөз өзгертілді" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Құпиясөзді өзгерту мүмкін болмады" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="cab-card">
      <header className="cab-card__head cab-card__head--flat">
        <div>
          <span className="cab-card__ico"><Icon name="lock" size={22} /></span>
          <div>
            <h3>Құпиясөзді өзгерту</h3>
            <p>Жаңа құпиясөз кемінде 8 таңба</p>
          </div>
        </div>
      </header>
      <form className="adm-grant" onSubmit={submit}>
        <label>Ағымдағы құпиясөз<input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
        <label>Жаңа құпиясөз<input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <button type="submit" className="qz-next" disabled={busy}>{busy ? "Сақталуда…" : "Өзгерту"}</button>
      </form>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-alert"} role="status">{msg.text}</p>}
    </article>
  );
}
