import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { API_BASE } from "../api/client";
import { Icon } from "../components/Icon";
import { modules } from "../data/content";

const WHATSAPP = "https://wa.me/77771234567";
const PHONE = "+7 (777) 123-45-67";

const tries = [
  {
    topic: "Квадрат теңдеулер",
    q: "x² − 5x + 6 = 0 теңдеуінің түбірлерінің қосындысы неге тең?",
    options: ["5", "−5", "6", "−6"],
    answer: 0,
    why: "Виет теоремасы бойынша x₁ + x₂ = −p. Мұнда p = −5, сондықтан қосынды 5.",
  },
  {
    topic: "Кері Виет теоремасы",
    q: "Түбірлері 3 және −5 болатын келтірілген квадрат теңдеу қайсы?",
    options: ["x² + 2x − 15 = 0", "x² − 2x − 15 = 0", "x² + 2x + 15 = 0", "x² − 8x + 15 = 0"],
    answer: 0,
    why: "Қосынды 3 + (−5) = −2, демек p = 2. Көбейтінді 3 · (−5) = −15, демек q = −15.",
  },
  {
    topic: "Виет теоремасы",
    q: "x² + x − 12 = 0 теңдеуінің түбірлерінің көбейтіндісі неге тең?",
    options: ["12", "−12", "1", "−1"],
    answer: 1,
    why: "Көбейтінді бос мүшеге тең: x₁ · x₂ = q = −12. Таңбасы өзгермейді.",
  },
];

const why = [
  { icon: "play_lesson", title: "Түсінікті видеосабақтар", text: "Нөлден бастап: формуланы жаттамай, мағынасын түсіндіреміз." },
  { icon: "fact_check", title: "Әр сұраққа талдау", text: "Тесттен кейін әр қатенің түсіндірмесі бар: қайда, неге қателестің." },
  { icon: "timer", title: "ҰБТ форматындағы тест", text: "Уақыт шектеулі тақырыптық тесттер нағыз емтиханға үйретеді." },
  { icon: "monitoring", title: "Жеке кабинет", text: "Прогресс, нәтижелер графигі және қайталауды қажет ететін тақырыптар." },
];

const steps = [
  { icon: "person", title: "Тіркел", text: "Аккаунт ашып, курсты төлеңіз. Расталған соң барлық сабақтар ашылады." },
  { icon: "play_circle", title: "Сабақты көр", text: "Видео мен конспект: әр тақырып қарапайым тілде." },
  { icon: "quiz", title: "Тест тапсыр", text: "Әр сабақтан кейін тест білімді бекітеді." },
  { icon: "emoji_events", title: "Балыңды көтер", text: "Қателерді талда, әлсіз тақырыптарды қайтала." },
  { icon: "videocam", title: "Пробный сынақ", text: "Әр 10 күн сайын толық пробный тест және қателермен жұмыс видеосы." },
];

const perks = [
  "13 бөлім бойынша барлық видеосабақтар",
  "Әр видеосабақтан кейін ҰБТ форматындағы тест",
  "Жеке кабинет және әлсіз тақырыптар аналитикасы",
  "Сынақ тесттері әр 10 күн сайын, видео шешімі бар",
];

function Brand() {
  return (
    <Link to="/" className="lp-brand" aria-label="MATH ASYL, басты бет">
      <img src="/assets/logo.png" alt="" />
      <span>
        MATH ASYL
        <small>ҰБТ математика</small>
      </span>
    </Link>
  );
}

function Head({ pill, children, sub, dark }: { pill: string; children: ReactNode; sub?: string; dark?: boolean }) {
  return (
    <div className={dark ? "lp-head-block dark" : "lp-head-block"} data-reveal>
      <span className={dark ? "lp-pill dark" : "lp-pill"}><i />{pill}</span>
      <h2>{children}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/** A real ҰБТ-style problem in the hero: the fastest way to show what the course teaches. */
function HeroTry({ cta }: { cta: string }) {
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [left, setLeft] = useState(30);
  const t = tries[n];
  const expired = left === 0 && pick === null;
  const done = pick !== null || expired;
  const right = pick === t.answer;

  useEffect(() => {
    if (done || left === 0) return;
    const id = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, done]);

  function next() {
    setN((n + 1) % tries.length);
    setPick(null);
    setLeft(30);
  }

  return (
    <div className="lp-try-wrap">
      <aside className="lp-try" aria-labelledby="try-q">
        <header>
          <span className="lp-try__title"><span className="lp-tile sm"><Icon name="assignment" size={16} /></span>Өзіңді сынап көр</span>
          <span className={left <= 10 && !done ? "lp-try__time low" : "lp-try__time"}><Icon name="timer" size={15} />00:{String(left).padStart(2, "0")}</span>
        </header>
        <p className="lp-try__topic">{t.topic}</p>
        <p id="try-q" className="lp-try__q">{t.q}</p>
        <div className="lp-try__opts" role="group" aria-label="Жауап нұсқалары">
          {t.options.map((o, i) => {
            const state = !done ? "" : i === t.answer ? "ok" : i === pick ? "bad" : "dim";
            return (
              <button key={o} type="button" className={state} disabled={done} onClick={() => setPick(i)}>
                <b>{"АБВГ"[i]}</b>
                {o}
                {done && i === t.answer && <Icon name="check_circle" size={20} fill />}
              </button>
            );
          })}
        </div>
        <div className="lp-try__foot" aria-live="polite">
          {done ? (
            <>
              <p className={right ? "ok" : "bad"}>
                <strong>{expired ? `Уақыт бітті. Дұрыс жауап: ${"АБВГ"[t.answer]}.` : right ? "Дұрыс!" : `Дұрыс жауап: ${"АБВГ"[t.answer]}.`}</strong> {t.why}
              </p>
              <div className="lp-try__acts">
                <button type="button" className="lp-btn lp-btn--ghost sm" onClick={next}>Келесі есеп</button>
                <Link to={cta} className="lp-btn lp-btn--teal sm">Курсқа жазылу<span className="lp-btn__arrow"><Icon name="arrow_forward" size={14} /></span></Link>
              </div>
            </>
          ) : (
            <p className="lp-try__meta"><Icon name="check" size={14} />Есеп {n + 1} / {tries.length}, жауапты таңдаңыз</p>
          )}
        </div>
      </aside>
      <span className="lp-float lp-float--a"><Icon name="monitoring" size={16} />Шешімі бірден</span>
    </div>
  );
}

/** Fade-and-rise for blocks as they scroll into view. Off when the visitor asks for reduced motion. */
function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("is-in"));
      return;
    }
    el.classList.add("lp--reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);
  return root;
}

function tenge(n: number) {
  return `${n.toLocaleString("ru-RU").replace(/\s/g, " ")} ₸`;
}

export function LandingPage() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [price, setPrice] = useState<number | null | undefined>(20000);
  const join = user ? "/course" : "/register";
  const root = useReveal();

  useEffect(() => {
    document.title = "MATH ASYL — ҰБТ математикасына дайындық";
  }, []);

  useEffect(() => {
    let stop = false;
    fetch(`${API_BASE}/api/courses`)
      .then((r) => r.json())
      .then((d: { courses?: Array<{ priceTenge: number | null; isFree?: boolean; featured?: boolean }> }) => {
        const list = d.courses ?? [];
        const c = list.find((x) => x.featured) ?? list[0];
        if (!stop && c && !c.isFree && c.priceTenge) setPrice(c.priceTenge);
        if (!stop && c?.isFree) setPrice(null);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);

  return (
    <div className="lp" ref={root}>
      <header className="lp-top">
        <div className="lp-top__row">
          <Brand />
          <nav className={menu ? "lp-nav open" : "lp-nav"} aria-label="Бет бөлімдері" onClick={() => setMenu(false)}>
            <a href="#why">Неге біз</a>
            <a href="#program">Бағдарлама</a>
            <a href="#teacher">Мұғалім</a>
            <a href="#price">Бағасы</a>
          </nav>
          <div className="lp-top__acts">
            <Link to={user ? "/home" : "/login"} className="lp-btn lp-btn--ghost sm">{user ? "Кабинет" : "Кіру"}</Link>
            <Link to={join} className="lp-btn lp-btn--coral sm lp-hide-sm">Курсқа жазылу</Link>
            <button type="button" className="lp-burger" aria-label="Мәзір" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon name={menu ? "close" : "apps"} size={22} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero__grid">
            <div className="lp-hero__text" data-reveal>
              <span className="lp-pill"><i />ҰБТ 2026 · математика</span>
              <h1>
                ҰБТ математикасынан <span className="lp-grad">50 баллға</span> бірге жетеміз
              </h1>
              <p>Нөлден бастап 50 балға дейін: түсінікті видеосабақтар, әр тақырыптан кейін тест және жеке өсім аналитикасы.</p>
              <div className="lp-hero__cta">
                <Link to={join} className="lp-btn lp-btn--teal">
                  Курсқа жазылу<span className="lp-btn__arrow"><Icon name="arrow_forward" size={16} /></span>
                </Link>
                <a href="#program" className="lp-btn lp-btn--ghost"><Icon name="menu_book" size={18} />Бағдарламаны көру</a>
              </div>
            </div>
            <div data-reveal className="lp-reveal-late">
              <HeroTry cta={join} />
            </div>
          </div>

          <div className="lp-wrap">
            <div className="lp-stats lp-stats--one" data-reveal>
              <div>
                <span className="lp-tile"><Icon name="group" size={20} /></span>
                <p><b>1 500+</b><small>оқушы дайындалды</small></p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="why">
          <div className="lp-wrap">
            <Head pill="Неге MATH ASYL" sub="Видео, тест және талдау бір жүйеде: не білетініңді және нені қайталау керегін нақты көресің.">
              Бұл жай видео емес, бұл <span className="lp-grad">жүйелі дайындық</span>
            </Head>
            <div className="lp-cards4">
              {why.map((w, i) => (
                <article key={w.title} className="lp-card" data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="lp-tile"><Icon name={w.icon} size={22} /></span>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </article>
              ))}
            </div>
            <p className="lp-note" data-reveal>
              <Icon name="lightbulb" size={20} />
              Алдыңғы бөлімнің тесттері тапсырылмай, келесі бөлім ашылмайды.
            </p>
          </div>
        </section>

        <section className="lp-sec" id="program">
          <div className="lp-wrap">
            <div className="lp-dark" data-reveal>
              <Head dark pill="13 бөлім" sub="Ұлттық бірыңғай тестілеу талаптарына толық сәйкес келетін қадамдық оқу жоспары.">
                Курс <span className="lp-grad lp-grad--light">бағдарламасы</span>
              </Head>
              <ol className="lp-chapters">
                {modules.map((m) => (
                  <li key={m.id}>
                    <span className="lp-chapters__n">{m.id}</span>
                    <div>
                      <strong>{m.title}</strong>
                      <small>{m.meta}</small>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="lp-dark__cta">
                <Link to={join} className="lp-btn lp-btn--coral">Курсқа жазылу<span className="lp-btn__arrow"><Icon name="arrow_forward" size={16} /></span></Link>
                <span>Сабақтар төлем расталғаннан кейін ашылады.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec">
          <div className="lp-wrap">
            <Head pill="Оқу форматы" sub="Тіркелгеннен ҰБТ-ға дейін: әр қадамда не істейтінің түсінікті.">
              Курс <span className="lp-grad">қалай өтеді?</span>
            </Head>
            <div className="lp-cards4 lp-cards5">
              {steps.map((s, i) => (
                <article key={s.title} className="lp-card lp-step" data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className={`lp-tile lp-tile--g${i}`}><Icon name={s.icon} size={22} /></span>
                  <span className="lp-step__n" aria-hidden>{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="teacher">
          <div className="lp-wrap">
            <div className="lp-dark lp-teacher" data-reveal>
              <figure className="lp-teacher__photo">
                <img src="/assets/teacher.jpg" alt="Асылай Арыстанбекова" loading="lazy" />
                <span className="lp-float lp-float--b"><i />ҰБТ сарапшысы</span>
                <span className="lp-float lp-float--c"><Icon name="verified" size={16} />ҰБТ 139 ұпай</span>
              </figure>
              <div className="lp-teacher__text">
                <span className="lp-pill dark"><i />Тәлімгер</span>
                <h2>Асылай <span className="lp-grad lp-grad--light">Арыстанбекова</span></h2>
                <p>Ақпараттар технологиясының ғылым магистрі. Назарбаев Зияткерлік мектебінің және Astana IT University түлегі. Жеке ҰБТ нәтижесі 139 ұпай.</p>
                <ul className="lp-teacher__stats">
                  <li><b>1 500+</b><small>оқушы</small></li>
                  <li><b>40</b><small>орташа балл</small></li>
                </ul>
                <Link to={join} className="lp-btn lp-btn--coral">Сабақты бастау<span className="lp-btn__arrow"><Icon name="arrow_forward" size={16} /></span></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="price">
          <div className="lp-wrap">
            <Head pill="Бағасы" sub="Бір реттік төлем. Kaspi арқылы.">
              6 айлық <span className="lp-grad">толық курс</span>
            </Head>
            <div className="lp-price" data-reveal>
              <ul className="lp-price__list">
                {perks.map((p) => (
                  <li key={p}><span className="lp-check"><Icon name="check" size={14} /></span>{p}</li>
                ))}
              </ul>
              <div className="lp-price__box">
                <p className="lp-price__now">{price === undefined ? "…" : price ? tenge(price) : "Тегін"}</p>
                <p className="lp-price__hint">Бір реттік төлем. Kaspi арқылы</p>
                <Link to={join} className="lp-btn lp-btn--teal wide"><Icon name="qr_code_scanner" size={20} />Kaspi арқылы төлеу</Link>
                <small><Icon name="lock" size={14} />Төлем расталғаннан кейін курс бірден ашылады</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-wrap lp-foot-wrap">
        <div className="lp-foot" data-reveal>
          <div className="lp-foot__brand">
            <Brand />
            <p>ҰБТ математикасына онлайн дайындық курсы: видеосабақтар, тесттер және жеке кабинет.</p>
            <div className="lp-foot__social">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="chat" size={18} /></a>
              <a href="https://t.me/" target="_blank" rel="noreferrer" aria-label="Telegram"><Icon name="send" size={18} /></a>
              <a href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="photo_camera" size={18} /></a>
            </div>
          </div>
          <nav className="lp-foot__menu" aria-label="Мәзір">
            <small>Мәзір</small>
            <a href="#why">Неге біз</a>
            <a href="#program">Бағдарлама</a>
            <a href="#teacher">Мұғалім</a>
            <a href="#price">Бағасы</a>
            <Link to="/login">Кабинетке кіру</Link>
          </nav>
          <div className="lp-foot__contact">
            <small>Байланыс</small>
            <a href="tel:+77771234567" className="lp-foot__phone">{PHONE}</a>
            <span>Күн сайын 9:00–20:00</span>
            <Link to={join} className="lp-btn lp-btn--coral">Курсқа жазылу<span className="lp-btn__arrow"><Icon name="arrow_forward" size={16} /></span></Link>
          </div>
          <p className="lp-foot__copy">© 2026 MATH ASYL. Барлық құқықтар қорғалған.</p>
        </div>
      </footer>

      <a className="lp-wa" href={WHATSAPP} target="_blank" rel="noreferrer">
        <span>Бізге жазыңыз</span>
        <i><Icon name="chat" size={24} /></i>
      </a>
    </div>
  );
}
