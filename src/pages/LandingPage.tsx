import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";
import { faqs, modules } from "../data/content";

const stats = [
  { icon: "view_timeline", title: "11 бөлім", text: "ҰБТ-ның барлық тақырыптары нөлден жүйелі\nтүрде қарастырылады." },
  { icon: "fact_check", title: "Әр сұраққа қатемен жұмыс", text: "Әрбір тапсырма бойынша толық талдау,\nқателерді анықтау және қайта пысықтау жүйесі." },
  { icon: "assignment_turned_in", title: "Апталық тест", text: "Нағыз ҰБТ форматындағы сынақ және қатемен\nжеке жұмыс алгоритмі." },
];

const steps = [
  { n: 1, title: "Тіркел және төле", text: "Платформаға бір сәтте\nқолжетімділік алып, оқуды бірден\nбастаңыз. Ешқандай кідіріссіз." },
  { n: 2, title: "Видеосабақты көр", text: "Әр тақырып қарапайым тілде,\nформулаларды жаттамай,\nмағынасын түсіндіру арқылы\nөтеді." },
  { n: 3, title: "Мини-тест тапсыр", text: "Геймификация жүйесі білімді\nбекітіп, тәртіпке баулиды — келесі\nсабақ тапсырмадан соң ашылады.", accent: true },
  { n: 4, title: "Сынақ ҰБТ тапсыр", text: "Апта сайын нақты уақытпен\nжаттығып, емтихан стрессіне\nқарсы психологиялық тұрғыда\nдайын боласыз." },
];

const chapterIcons = ["menu_book", "menu_book", "play_lesson", "play_lesson", "description", "quiz", "analytics", "architecture", "view_in_ar", "calculate", "fact_check"];

const bars = [
  { v: 32, w: "1-апта" },
  { v: 37, w: "2-апта" },
  { v: 41, w: "3-апта" },
  { v: 45, w: "4-апта", dim: true },
  { v: 48, w: "5-апта", now: true },
];

const perks = [
  "11 бөлім бойынша барлық толық видеосабақтар (100+\nдәріс)",
  "Әр сабаққа арналған жүктелмелі конспектілер мен\nформулалар шпаргалкасы",
  "24 апталық ҰБТ форматындағы нақты сынақ тесттер",
  "MATH ASYL жеке кабинеті және әлсіз тақырыптар\nаналитикасы",
  "Мұғаліммен және жеке куратормен чатта тікелей\nбайланыс",
  "2026 жылғы ҰБТ аяқталғанға дейін шексіз\nқолжетімділік",
];

function Brand() {
  return (
    <Link to="/" className="ln-brand">
      <img src="/assets/logo.png" alt="" />
      <span>
        MATH <em>ASYL</em>
      </span>
    </Link>
  );
}

function Title({ badge, title, sub, left }: { badge: string; title: string; sub: string; left?: boolean }) {
  return (
    <div className={left ? "ln-title ln-title--left" : "ln-title"}>
      <span className="ln-pill">{badge}</span>
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(-1);
  const cabinet = user ? "/home" : "/login";

  return (
    <div className="land">
      <header className="ln-head">
        <div className="ln-head__row">
          <Brand />
          <div className="ln-head__actions">
            <Link to={cabinet} className="ln-login">{user ? "Кабинет" : "Кіру"}</Link>
            <Link to={cabinet} className="ln-avatar" aria-label="Профиль">
              <Icon name="person" size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="ln-main">
        <div className="ln-marks" aria-hidden>
          <span className="m1">∫</span>
          <span className="m2">Σ</span>
          <span className="m3">√x</span>
          <span className="m4">π</span>
          <span className="m5">sin(x)</span>
        </div>

        <section className="ln-hero">
          <div className="ln-hero__left">
            <h1>
              ҰБТ Математикасынан <em>50</em>
              <br />
              <em>баллға</em> бірге жетеміз!
            </h1>
            <p>
              Нөлден бастап 50 балға дейін: түсінікті видеосабақтар, апта
              <br />
              сайынғы сынақ тесттер және интерактивті жеке өсім
              <br />
              аналитикасы.
            </p>
            <div className="ln-cta">
              <Link to="/register" className="ln-btn ln-btn--blue">
                Курсқа жазылу <Icon name="arrow_forward" size={13} />
              </Link>
              <a href="#program" className="ln-btn ln-btn--soft">Бағдарламаны көру</a>
            </div>
          </div>
          <i className="ln-blob ln-blob--a" />
          <i className="ln-blob ln-blob--b" />
        </section>

        <section className="ln-stats">
          {stats.map((s) => (
            <article key={s.title} className="ln-card">
              <span className="ln-ico"><Icon name={s.icon} size={24} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </section>

        <section className="ln-sec">
          <Title badge="Оқу форматы" title="Курс қалай өтеді?" sub="ҰБТ-да максималды балл жинауға арналған 4 қарапайым әрі тиімді қадам" />
          <div className="ln-steps">
            {steps.map((s) => (
              <article key={s.n} className="ln-card">
                <b className={s.accent ? "accent" : ""}>{s.n}</b>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
                <span>0{s.n}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="ln-sec ln-sec--tint" id="program">
          <Title left badge="11 кезең" title="Курс бағдарламасы" sub="Ұлттық бірыңғай тестілеу талаптарына толық сәйкес келетін қадамдық оқу жоспары" />
          <div className="ln-mods">
            {modules.map((m, i) => (
              <article key={m.id} className="ln-card">
                <div>
                  <h3>{m.id}. {m.title}</h3>
                  <p>{m.text}</p>
                </div>
                <small className={i < 2 ? "hot" : ""}>
                  <Icon name={chapterIcons[i]} size={16} />
                  {m.meta}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="ln-sec">
          <Title badge="Платформа артықшылығы" title="Интерактивті жеке кабинет" sub={"Оқу процесін, өсім графигін және әлсіз тұстарыңызды нақты алгоритммен\nбақылаңыз"} />
          <div className="ln-mock">
            <header>
              <div className="ln-mock__who">
                <span className="ln-mock__ava">АҚ</span>
                <div>
                  <strong>Айсұлтан Қайратұлы <Icon name="verified" size={18} color="#1e6fff" /></strong>
                  <small>Мақсат: МУИТ / Назарбаев Университеті гранты</small>
                </div>
              </div>
              <span className="ln-streak"><Icon name="local_fire_department" size={18} />14 күн үзіліссіз оқу</span>
            </header>
            <div className="ln-mock__grid">
              <div className="ln-mock__left">
                <div className="ln-chart">
                  <div className="ln-chart__top">
                    <strong>Сынақ тесттер динамикасы</strong>
                    <em>+16 балл</em>
                  </div>
                  <p>Соңғы 5 аптадағы ресми балл өсімі:</p>
                  <div className="ln-bars">
                    {bars.map((b) => (
                      <div key={b.w} className={b.now ? "now" : b.dim ? "dim" : ""}>
                        <b>{b.v}</b>
                        <i />
                        <span>{b.w}</span>
                      </div>
                    ))}
                  </div>
                  <p className="ln-chart__path">32 → 37 → 41 → 45 → <b>48 балл</b></p>
                </div>
                <div className="ln-sum">
                  <Icon name="donut_large" size={28} color="#00236f" />
                  <div>
                    <strong>Жалпы курс бағдарламасы</strong>
                    <span>68% толық меңгерілді</span>
                  </div>
                  <em>68%</em>
                </div>
              </div>
              <div className="ln-mock__right">
                <div className="ln-weak">
                  <h5><Icon name="warning" size={20} />Әлсіз тақырыптар анықталды</h5>
                  <p>AI жүйесі соңғы сынақ нәтижесі бойынша<br />2 тақырыпты бекітуді ұсынады:</p>
                  {[
                    ["Тригонометриялық теңдеулер", 62],
                    ["Стереометрия теоремалары", 55],
                  ].map(([t, v]) => (
                    <div key={t} className="ln-weak__item">
                      <div><span>{t}</span><b>{v}%</b></div>
                      <i><s style={{ width: `${v}%` }} /></i>
                    </div>
                  ))}
                </div>
                <div className="ln-rec">
                  <h5><Icon name="psychology" size={22} color="#fd761a" />Жеке ұсыныс</h5>
                  <p>Тек осы қателескен сұрақтар бойынша<br />арнайы 15 минуттық жаттықтыру жинағы<br />дайын.</p>
                  <Link to={cabinet} className="ln-rec__btn">
                    <span>Қатемен жұмыс тест<br />тапсырмасын бастау</span>
                    <Icon name="play_arrow" size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ln-sec ln-sec--tint4" id="teacher">
          <Title badge="Тәлімгер" title="Сіздің басты тәлімгеріңіз" sub="Математиканы формула жаттамай, жүйемен түсінуді үйрететін кәсіби ұстаз" />
          <div className="ln-teacher">
            <div className="ln-teacher__photo">
              <figure>
                <img src="/assets/teacher.png" alt="Асылбек Серікұлы" />
                <figcaption>ҰБТ сарапшысы • 8 жыл<br />тәжірибе</figcaption>
              </figure>
            </div>
            <div className="ln-teacher__bio">
              <h3>Асылбек Серікұлы</h3>
              <p className="role">MATH ASYL жетекші оқытушысы &amp; математик</p>
              <p>
                Назарбаев Университетінің түлегі. Күрделі математикалық абстрактілі ұғымдарды визуалды әдіспен және өмірлік мысалдармен түсіндірудің авторлық жүйесін жасақтаған. Оның әдістемесімен 1,500-ден астам оқушы республикалық грант иегері атанды.
              </p>
              <ul>
                <li><b>1,500+</b><span>Оқушы дайындады</span></li>
                <li><b>46.8 / 50</b><span>Орташа балл</span></li>
                <li><b className="blue">94%</b><span>Грантқа түсті</span></li>
              </ul>
              <small><Icon name="verified" size={16} color="#004942" />ҚР Білім беру ісінің үздік тәлімгері сертификаты</small>
            </div>
          </div>
        </section>

        <section className="ln-price-sec" id="price">
          <div className="ln-price">
            <header>
              <div>
                <span className="ln-price__badge">MATH ASYL — ең тиімді таңдау</span>
                <small>Шектеулі орын: 45 қалды</small>
              </div>
              <span className="ln-price__guar"><Icon name="verified" size={18} />Толық сүйемелдеу кепілдігі</span>
            </header>
            <div className="ln-price__body">
              <div className="ln-price__info">
                <h3>6 айлық толық кешенді курс</h3>
                <p>MATH ASYL әдістемесімен нөлден бастап 50 балға дейінгі толық<br />сүйемелдеу</p>
                <ul>
                  {perks.map((p) => (
                    <li key={p}><Icon name="check_circle" size={20} />{p}</li>
                  ))}
                </ul>
              </div>
              <aside className="ln-price__box">
                <small>Бағасы</small>
                <div className="ln-price__nums">
                  <strong>9 990<br />₸</strong>
                  <s>19 900<br />₸</s>
                </div>
                <span className="ln-price__off">-50% жеңілдік</span>
                <p>Бір реттік төлем немесе <b>Kaspi Red</b><br />арқылы 3 айға 3 330 ₸-ден бөліп<br />төлеу</p>
                <Link to="/register" className="ln-price__pay"><Icon name="qr_code_scanner" size={24} />Kaspi QR арқылы төлеу</Link>
                <span className="ln-price__safe"><Icon name="lock" size={14} />100% қауіпсіз төлем • Чек дереу<br />поштаңызға жіберіледі</span>
              </aside>
            </div>
          </div>
        </section>

        <section className="ln-sec" id="faq">
          <Title badge="Анықтама" title="Жиі қойылатын сұрақтар" sub="Оқушылар мен ата-аналар тарапынан жиі қойылатын сұрақтарға жауаптар" />
          <div className="ln-faq">
            {faqs.map((f, i) => (
              <button key={f.q} type="button" className={open === i ? "open" : ""} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>
                  <strong>{f.q}</strong>
                  <Icon name="expand_more" size={24} />
                </span>
                {open === i && <p>{f.a}</p>}
              </button>
            ))}
          </div>
        </section>

        <section className="ln-final-sec">
          <div className="ln-final">
            <i className="ln-final__blob" />
            <span className="ln-final__mark" aria-hidden>50</span>
            <div>
              <h2>MATH ASYL-мен ҰБТ-ға<br />дайындықты баста!</h2>
              <p>Мемлекеттік грант иегері болу мүмкіндігін жіберіп алмаңыз.<br />Орындар саны шектеулі.</p>
            </div>
            <div className="ln-cta">
              <Link to="/register" className="ln-btn ln-btn--blue ln-btn--glow">
                Курсқа жазылу <Icon name="arrow_forward" size={13} />
              </Link>
              <a className="ln-btn ln-btn--glass" href="https://wa.me/77771234567" target="_blank" rel="noreferrer">
                <Icon name="chat" size={20} />WhatsApp-та сұрау
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ln-foot">
        <div className="ln-foot__row">
          <div>
            <Brand />
            <p>ҰБТ математикасына сенімді дайындық курсы</p>
          </div>
          <div className="ln-foot__right">
            <a href="tel:+77771234567"><Icon name="call" size={18} />+7 (777) 123-45-67</a>
            <div>
              <a href="https://wa.me/77771234567" aria-label="WhatsApp"><Icon name="chat" size={20} /></a>
              <a href="https://t.me/" aria-label="Telegram"><Icon name="send" size={19} /></a>
              <a href="https://instagram.com/" aria-label="Instagram"><Icon name="photo_camera" size={20} /></a>
            </div>
          </div>
        </div>
        <p className="ln-copy">© 2026 MATH ASYL. Барлық құқықтар қорғалған.</p>
      </footer>
    </div>
  );
}
