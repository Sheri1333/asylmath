import { useState } from "react";
import { api } from "../api/client";
import { fmtMoney } from "../lib/course";
import type { CourseView } from "../types/course";
import { Icon } from "./Icon";

/** What a student without access sees: pay by Kaspi, then ask the admin to open the course. */
export function AccessCard({ view, onChange }: { view: CourseView; onChange: () => void }) {
  const { course, enrollment } = view;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const free = course.isFree || !course.priceTenge;

  async function request() {
    setBusy(true);
    setError("");
    try {
      await api.enroll(course.id, note);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сұранысты жіберу мүмкін болмады");
    } finally {
      setBusy(false);
    }
  }

  if (enrollment?.status === "pending") {
    return (
      <section className="access access--wait" aria-live="polite">
        <span className="access__ico"><Icon name="schedule" size={26} /></span>
        <div>
          <h2>Төлеміңіз тексерілуде</h2>
          <p>Әкімші төлемді растағаннан кейін курс автоматты түрде ашылады. Әдетте бұл 1 сағатқа дейін созылады. Бетті кейінірек жаңартыңыз.</p>
        </div>
        <button type="button" className="qz-prev" onClick={onChange}><Icon name="replay_10" size={16} />Тексеру</button>
      </section>
    );
  }

  if (free) {
    return (
      <section className="access">
        <span className="access__ico"><Icon name="school" size={26} /></span>
        <div>
          <h2>Курс тегін</h2>
          <p>Бір батырманы басыңыз да, бірінші сабақтан бастаңыз.</p>
        </div>
        <button type="button" className="qz-next" disabled={busy} onClick={request}>Курсты бастау<Icon name="arrow_forward" size={16} /></button>
        {error && <p className="adm-alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="access access--pay">
      <div className="access__price">
        <small>Курс бағасы</small>
        <b>{fmtMoney(course.priceTenge)}</b>
        <span>Бір реттік төлем, ҰБТ аяқталғанша қолжетімді</span>
      </div>
      <ol className="access__steps">
        <li>
          <strong>Kaspi арқылы төлеңіз</strong>
          <p>{course.paymentNote || "Kaspi арқылы курс бағасын аударыңыз."}</p>
          {course.paymentUrl && (
            <a className="ln-price__pay access__kaspi" href={course.paymentUrl} target="_blank" rel="noreferrer">
              <Icon name="qr_code_scanner" size={22} />Kaspi-де төлеу
            </a>
          )}
        </li>
        <li>
          <strong>Төлегеніңізді хабарлаңыз</strong>
          <label>
            Kaspi-дегі атыңыз немесе телефон нөміріңіз
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Мысалы: Айбек С., +7 701 …" maxLength={200} />
          </label>
          <button type="button" className="qz-next" disabled={busy} onClick={request}>
            {busy ? "Жіберілуде…" : "Төледім, курсты ашуды сұраймын"}
          </button>
          {error && <p className="adm-alert">{error}</p>}
        </li>
      </ol>
    </section>
  );
}
