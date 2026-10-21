import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { quiz } from "../data/content";

type Enrollment = Awaited<ReturnType<typeof api.myEnrollments>>["enrollments"][number];

function lastQuiz() {
  try {
    const raw = localStorage.getItem("asyl-quiz");
    if (!raw) return null;
    const saved = JSON.parse(raw) as { picks: Record<number, string>; done: boolean };
    if (!saved.done) return null;
    return quiz.filter((q, i) => saved.picks[i] === q.answer).length;
  } catch {
    return null;
  }
}

export function AccountPage() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState("");
  const score = lastQuiz();
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
                  <h3>Соңғы тақырып тесті</h3>
                  <p>3.3 Виет теоремасы</p>
                </div>
              </div>
            </header>
            {score === null ? (
              <div className="acc__empty">
                <p>Тест әлі аяқталмаған. Нәтиже осында сақталады.</p>
                <Link to="/tests" className="prog__btn">Тестті бастау<Icon name="arrow_forward" size={16} /></Link>
              </div>
            ) : (
              <div className="acc__score">
                <b className={score >= 7 ? "ok" : ""}>{score}<em>/{quiz.length}</em></b>
                <p>{score >= 7 ? "Шек өтті: келесі тақырып ашық." : "Өту үшін 7 дұрыс жауап керек. Қатемен жұмыс жасап, қайта тапсырыңыз."}</p>
                <Link to="/tests">Нәтижені ашу<Icon name="arrow_forward" size={16} /></Link>
              </div>
            )}
          </article>
        </div>
      </div>
    </Shell>
  );
}
