import { useState } from "react";
import { Link } from "react-router-dom";
import { faqs, modules, steps } from "../data/content";

export function LandingPage() {
  const [open, setOpen] = useState(0);

  return (
    <div className="land">
      <header className="land-nav">
        <Link to="/" className="brand">
          <img src="/assets/logo.png" alt="MATH ASYL" />
        </Link>
        <nav>
          <a href="#program">Бағдарлама</a>
          <a href="#cabinet">Кабинет</a>
          <a href="#price">Баға</a>
          <a href="#faq">Сұрақтар</a>
        </nav>
        <Link to="/login" className="btn btn-ghost">
          Кіру
        </Link>
      </header>

      <section className="hero">
        <div className="marks" aria-hidden>
          <span>∫</span>
          <span>Σ</span>
        </div>
        <h1>
          ҰБТ Математикасынан <em>50 баллға</em> бірге жетеміз!
        </h1>
        <p>
          Нөлден бастап 50 балға дейін: түсінікті видеосабақтар, апта сайынғы
          сынақ тесттер және интерактивті жеке өсім аналитикасы.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-blue">
            Курсқа жазылу
          </Link>
          <a href="#program" className="btn btn-soft">
            Бағдарламаны көру
          </a>
        </div>
      </section>

      <section className="stats">
        <article>
          <h3>11 бөлім</h3>
          <p>ҰБТ-ның барлық тақырыптары нөлден жүйелі түрде қарастырылады.</p>
        </article>
        <article>
          <h3>Әр сұраққа қатемен жұмыс</h3>
          <p>Әрбір тапсырма бойынша толық талдау, қателерді анықтау және қайта пысықтау жүйесі.</p>
        </article>
        <article>
          <h3>Апталық тест</h3>
          <p>Нағыз ҰБТ форматындағы сынақ және қатемен жеке жұмыс алгоритмі.</p>
        </article>
      </section>

      <section className="block">
        <p className="eyebrow">Оқу форматы</p>
        <h2>Курс қалай өтеді?</h2>
        <p className="lead">ҰБТ-да максималды балл жинауға арналған 4 қарапайым әрі тиімді қадам</p>
        <div className="steps">
          {steps.map((s) => (
            <article key={s.n}>
              <b>{s.n}</b>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="block" id="program">
        <p className="eyebrow">11 кезең</p>
        <h2>Курс бағдарламасы</h2>
        <p className="lead">Ұлттық бірыңғай тестілеу талаптарына толық сәйкес келетін қадамдық оқу жоспары</p>
        <div className="mods">
          {modules.map((m) => (
            <article key={m.id}>
              <h3>
                {m.id}. {m.title}
              </h3>
              <p>{m.text}</p>
              <small>{m.meta}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="block" id="cabinet">
        <p className="eyebrow">Платформа артықшылығы</p>
        <h2>Интерактивті жеке кабинет</h2>
        <p className="lead">
          Оқу процесін, өсім графигін және әлсіз тұстарыңызды нақты алгоритммен бақылаңыз
        </p>
        <div className="preview">
          <div>
            <strong>Айсұлтан Қайратұлы</strong>
            <p>Мақсат: МУИТ / Назарбаев Университеті гранты</p>
            <p>14 күн үзіліссіз оқу</p>
            <div className="mini-bars" aria-hidden>
              {[32, 37, 41, 45, 48].map((n) => (
                <span key={n} style={{ height: `${n}%` }} />
              ))}
            </div>
            <p>+16 балл · 32 → 48</p>
          </div>
          <div>
            <strong>Жалпы курс бағдарламасы</strong>
            <p>68% толық меңгерілді</p>
            <div className="bar"><i style={{ width: "68%" }} /></div>
            <p>Әлсіз тақырыптар: тригонометрия 62%, стереометрия 55%</p>
          </div>
        </div>
      </section>

      <section className="block teacher">
        <p className="eyebrow">Тәлімгер</p>
        <h2>Сіздің басты тәлімгеріңіз</h2>
        <div className="teacher-card">
          <img src="/assets/teacher.png" alt="Асылбек Серікұлы" />
          <div>
            <p className="eyebrow">ҰБТ сарапшысы • 8 жыл тәжірибе</p>
            <h3>Асылбек Серікұлы</h3>
            <p>MATH ASYL жетекші оқытушысы & математик</p>
            <p>
              Назарбаев Университетінің түлегі. Күрделі математикалық абстрактілі ұғымдарды
              визуалды әдіспен және өмірлік мысалдармен түсіндірудің авторлық жүйесін жасақтаған.
              Оның әдістемесімен 1,500-ден астам оқушы республикалық грант иегері атанды.
            </p>
            <ul>
              <li><b>1,500+</b> Оқушы дайындады</li>
              <li><b>46.8 / 50</b> Орташа балл</li>
              <li><b>94%</b> Грантқа түсті</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="block price" id="price">
        <p className="eyebrow">MATH ASYL — ең тиімді таңдау</p>
        <h2>6 айлық толық кешенді курс</h2>
        <div className="price-grid">
          <ul>
            <li>11 бөлім бойынша барлық толық видеосабақтар (100+ дәріс)</li>
            <li>Әр сабаққа арналған жүктелмелі конспектілер мен формулалар шпаргалкасы</li>
            <li>24 апталық ҰБТ форматындағы нақты сынақ тесттер</li>
            <li>MATH ASYL жеке кабинеті және әлсіз тақырыптар аналитикасы</li>
            <li>Мұғаліммен және жеке куратормен чатта тікелей байланыс</li>
            <li>2026 жылғы ҰБТ аяқталғанға дейін шексіз қолжетімділік</li>
          </ul>
          <aside>
            <p>Шектеулі орын: 45 қалды</p>
            <p className="old">19 900 ₸</p>
            <p className="now">9 990 <small>₸</small></p>
            <span className="off">−50% жеңілдік</span>
            <p>Бір реттік төлем немесе Kaspi Red арқылы 3 айға 3 330 ₸-ден бөліп төлеу</p>
            <Link to="/register" className="btn btn-blue">
              Kaspi QR арқылы төлеу
            </Link>
            <small>100% қауіпсіз төлем • Чек дереу поштаңызға жіберіледі</small>
          </aside>
        </div>
      </section>

      <section className="block" id="faq">
        <p className="eyebrow">Анықтама</p>
        <h2>Жиі қойылатын сұрақтар</h2>
        <div className="faq">
          {faqs.map((item, i) => (
            <button key={item.q} type="button" className={open === i ? "open" : ""} onClick={() => setOpen(open === i ? -1 : i)}>
              <strong>{item.q}</strong>
              {open === i && <span>{item.a}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="cta">
        <h2>MATH ASYL-мен ҰБТ-ға дайындықты баста!</h2>
        <p>Мемлекеттік грант иегері болу мүмкіндігін жіберіп алмаңыз. Орындар саны шектеулі.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-blue">Курсқа жазылу</Link>
          <a className="btn btn-soft" href="https://wa.me/77771234567" target="_blank" rel="noreferrer">
            WhatsApp-та сұрау
          </a>
        </div>
      </section>

      <footer className="land-foot">
        <div>
          <img src="/assets/logo.png" alt="" />
          <p>ҰБТ математикасына сенімді дайындық курсы</p>
        </div>
        <a href="tel:+77771234567">+7 (777) 123-45-67</a>
        <p>© 2026 MATH ASYL. Барлық құқықтар қорғалған.</p>
      </footer>
    </div>
  );
}
