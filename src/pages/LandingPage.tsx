import { useState } from "react";
import { Link } from "react-router-dom";
import { faqs, modules } from "../data/content";

const stats = [
  { title: "11 бөлім", text: "ҰБТ-ның барлық тақырыптары нөлден жүйелі түрде қарастырылады." },
  { title: "24 апта", text: "6 айлық кезең-кезеңімен құрылған интенсивті әрі тыңғылықты дайындық." },
  { title: "Апталық тест", text: "Нағыз ҰБТ форматындағы сынақ және қатемен жеке жұмыс алгоритмі." },
  { title: "Kaspi QR төлем", text: "Ыңғайлы, жылдам және Kaspi Red арқылы бөліп төлеу мүмкіндігі бар." },
];

const steps = [
  { n: "1", ghost: "01", tone: "dark", title: "Тіркел және төле", text: "Платформаға бір сәтте қолжетімділік алып, оқуды бірден бастаңыз. Ешқандай кідіріссіз." },
  { n: "2", ghost: "02", tone: "blue", title: "Видеосабақты көр", text: "Әр тақырып қарапайым тілде, формулаларды жаттамай, мағынасын түсіндіру арқылы өтеді." },
  { n: "3", ghost: "03", tone: "blue", title: "Мини-тест тапсыр", text: "Геймификация жүйесі білімді бекітіп, тәртіпке баулиды — келесі сабақ тапсырмадан соң ашылады." },
  { n: "4", ghost: "04", tone: "dark", title: "Сынақ ҰБТ тапсыр", text: "Апта сайын нақты уақытпен жаттығып, емтихан стрессіне қарсы психологиялық тұрғыда дайын боласыз." },
];

export function LandingPage() {
  const [open, setOpen] = useState(0);

  return (
    <div className="land">
      <header className="ln-nav">
        <div className="ln-wrap ln-nav__row">
          <Link to="/" className="brand">
            <img src="/assets/logo.png" alt="MATH ASYL" />
          </Link>
          <nav>
            <a href="#program">Бағдарлама</a>
            <a href="#teacher">Мұғалім</a>
            <a href="#price">Бағасы</a>
            <a href="#faq">Сұрақтар</a>
          </nav>
          <div className="ln-nav__actions">
            <Link to="/login" className="ln-login">Кіру</Link>
            <span className="ln-moon" aria-hidden>☾</span>
          </div>
        </div>
      </header>

      <section className="ln-hero">
        <div className="ln-wrap ln-hero__grid">
          <div>
            <p className="ln-badge">★ 4.9/5 рейтинг · 1,200+ түлек грант иегері</p>
            <h1>
              ҰБТ математикасына <em>6 айда</em> дайындал
            </h1>
            <p className="ln-lead">
              Нөлден бастап 50 балға дейін: түсінікті видеосабақтар, апта сайынғы сынақ тесттер және интерактивті жеке өсім аналитикасы.
            </p>
            <div className="ln-cta">
              <Link to="/register" className="btn btn-blue">Курсқа жазылу →</Link>
              <a href="#program" className="btn btn-white">Бағдарламаны көру</a>
            </div>
            <div className="ln-proof">
              <span>АҚ</span><span>ЕМ</span><span>НС</span><span>+1k</span>
              <p>Оқушылар орташа <b>+14 балл</b> қосты</p>
            </div>
          </div>
          <aside className="ln-dash">
            <header>
              <div className="ln-ava">АҚ</div>
              <div>
                <strong>Оқушы кабинеті</strong>
                <small>Айсұлтан Қ. (11 «А» сынып)</small>
              </div>
              <em>Белсенді</em>
            </header>
            <div className="ln-progress">
              <div className="row-between"><span>Жалпы курс прогресі</span><b>68%</b></div>
              <div className="bar"><i style={{ width: "68%" }} /></div>
              <div className="row-between"><small>7 / 11 тарау меңгерілді</small><small>18 күн қалды</small></div>
            </div>
            <div className="ln-score">
              <div className="row-between"><span>Соңғы сынақ тест нәтижесі:</span><em>+14 балл өсім</em></div>
              <p><b>48</b> / 50 балл</p>
              <div className="row-between"><small>Бастапқы: 34 балл</small><small>Қазір: 48 балл</small></div>
              <div className="bar"><i style={{ width: "96%" }} /></div>
            </div>
            <footer>
              <span>Көрсеткіштік теңдеулер</span>
              <em>Меңгерілді ✓</em>
            </footer>
          </aside>
        </div>
      </section>

      <section className="ln-stats">
        <div className="ln-wrap">
          {stats.map((s) => (
            <article key={s.title}>
              <i />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ln-block">
        <p className="eyebrow">Оқу форматы</p>
        <h2>Курс қалай өтеді?</h2>
        <p className="ln-sub">ҰБТ-да максималды балл жинауға арналған 4 қарапайым әрі тиімді қадам</p>
        <div className="ln-steps">
          {steps.map((s) => (
            <article key={s.n}>
              <b className={s.tone}>{s.n}</b>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span>{s.ghost}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ln-block" id="program">
        <p className="eyebrow">11 кезең</p>
        <h2>Курс бағдарламасы</h2>
        <p className="ln-sub">Ұлттық бірыңғай тестілеу талаптарына толық сәйкес келетін қадамдық оқу жоспары</p>
        <div className="ln-mods">
          {modules.map((m) => (
            <article key={m.id}>
              <h3>{m.id}. {m.title}</h3>
              <p>{m.text}</p>
              <small>{m.meta}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="ln-block" id="teacher">
        <p className="eyebrow">Тәлімгер</p>
        <h2>Сіздің басты тәлімгеріңіз</h2>
        <div className="ln-teacher">
          <img src="/assets/teacher.png" alt="Асылбек Серікұлы" />
          <div>
            <p className="eyebrow">ҰБТ сарапшысы • 8 жыл тәжірибе</p>
            <h3>Асылбек Серікұлы</h3>
            <p>MATH ASYL жетекші оқытушысы & математик</p>
            <p>
              Назарбаев Университетінің түлегі. Күрделі ұғымдарды визуалды әдіспен түсіндірудің авторлық жүйесін жасақтаған. Әдістемесімен 1,500-ден астам оқушы грант иегері атанды.
            </p>
            <ul>
              <li><b>1,500+</b> оқушы</li>
              <li><b>46.8 / 50</b> орташа балл</li>
              <li><b>94%</b> грантқа түсті</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ln-block" id="price">
        <p className="eyebrow">MATH ASYL — ең тиімді таңдау</p>
        <h2>6 айлық толық кешенді курс</h2>
        <div className="ln-price">
          <ul>
            <li>11 бөлім бойынша барлық видеосабақтар (100+ дәріс)</li>
            <li>Конспектілер мен формулалар шпаргалкасы</li>
            <li>24 апталық ҰБТ форматындағы сынақ тесттер</li>
            <li>Жеке кабинет және әлсіз тақырыптар аналитикасы</li>
            <li>Мұғаліммен және куратормен тікелей байланыс</li>
            <li>2026 жылғы ҰБТ аяқталғанға дейін қолжетімділік</li>
          </ul>
          <aside>
            <p>Шектеулі орын: 45 қалды</p>
            <p className="old">19 900 ₸</p>
            <p className="now">9 990 <small>₸</small></p>
            <span className="off">−50% жеңілдік</span>
            <p>Kaspi Red арқылы 3 айға 3 330 ₸-ден</p>
            <Link to="/register" className="btn btn-blue">Kaspi QR арқылы төлеу</Link>
          </aside>
        </div>
      </section>

      <section className="ln-block" id="faq">
        <p className="eyebrow">Анықтама</p>
        <h2>Жиі қойылатын сұрақтар</h2>
        <div className="ln-faq">
          {faqs.map((item, i) => (
            <button key={item.q} type="button" className={open === i ? "open" : ""} onClick={() => setOpen(open === i ? -1 : i)}>
              <strong>{item.q}</strong>
              {open === i && <span>{item.a}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="ln-final">
        <div>
          <h2>ҰБТ-ға дайындықты бүгін баста!</h2>
          <p>Мемлекеттік грант иегері болу мүмкіндігін жіберіп алмаңыз. Орындар саны шектеулі.</p>
        </div>
        <div className="ln-cta">
          <Link to="/register" className="btn btn-blue">Курсқа жазылу →</Link>
          <a className="btn btn-ghost-light" href="https://wa.me/77771234567" target="_blank" rel="noreferrer">WhatsApp-та сұрау</a>
        </div>
        <span className="ln-watermark" aria-hidden>50</span>
      </section>

      <footer className="ln-foot">
        <div className="ln-wrap ln-foot__top">
          <div>
            <img src="/assets/logo.png" alt="" />
            <p>ҰБТ математикасына сенімді дайындық курсы</p>
          </div>
          <div className="ln-foot__right">
            <a href="tel:+77771234567">+7 (777) 123-45-67</a>
            <div><span>✉</span><span>▶</span><span>◎</span></div>
          </div>
        </div>
        <p className="ln-copy">© 2026 MATH ASYL. Барлық құқықтар қорғалған.</p>
      </footer>
    </div>
  );
}
