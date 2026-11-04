import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { api, KASPI_PAY_URL, KASPI_QR_SRC } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { fmtMoney } from "../lib/course";
import type { CourseView } from "../types/course";
import { Icon } from "./Icon";

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * What a student without access sees. Paid course: pay by the Kaspi QR or button,
 * press pay, and wait while the admin confirms the transfer in Telegram.
 */
export function AccessCard({ view, onChange }: { view: CourseView; onChange: () => void }) {
  const { course, enrollment } = view;
  const { user } = useAuth();
  const [payerName, setPayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const free = course.isFree || !course.priceTenge;
  const payUrl = course.paymentUrl || KASPI_PAY_URL;
  const pending = enrollment?.status === "pending";
  const rejected = enrollment?.status === "rejected";

  useEffect(() => {
    if (user?.name && !payerName) setPayerName(user.name);
  }, [user?.name, payerName]);

  // The admin answers from Telegram; poll so the course opens on this page by itself.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(onChange, 4000);
    return () => window.clearInterval(timer);
  }, [pending, onChange]);

  async function startFree() {
    setBusy(true);
    setError("");
    try {
      await api.enroll(course.id);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сұранысты жіберу мүмкін болмады");
    } finally {
      setBusy(false);
    }
  }

  /** Records the payment. keepalive: the page may unload into the Kaspi app right after. */
  function record(leaving: boolean): Promise<void> | null {
    const name = cleanName(payerName);
    if (name.length < 2) {
      setError("Kaspi-дегі аты-жөніңізді жазыңыз.");
      return null;
    }
    setError("");
    setBusy(true);
    return api
      .enroll(course.id, name, { keepalive: leaving })
      .then(() => onChange())
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Сұранысты жіберу мүмкін болмады"))
      .finally(() => setBusy(false));
  }

  function onKaspiClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!record(true)) e.preventDefault();
  }

  function onPaidSubmit(e: FormEvent) {
    e.preventDefault();
    void record(false);
  }

  if (pending) {
    return (
      <section className="access access--wait" aria-live="polite">
        <span className="access__ico"><Icon name="schedule" size={26} /></span>
        <div>
          <h2>Төлеміңіз тексерілуде</h2>
          <p>
            Kaspi-дегі аударымды тексеріп жатырмыз, әдетте бірнеше минут кетеді. Расталған соң курс осы бетте өзі ашылады.
          </p>
          <p className="access__hint">Аты-жөні: «{payerName || user?.name}», сома: {fmtMoney(course.priceTenge)}</p>
        </div>
        <a className="qz-prev" href={payUrl}><Icon name="qr_code_scanner" size={16} />Kaspi-ді қайта ашу</a>
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
        <button type="button" className="qz-next" disabled={busy} onClick={startFree}>Курсты бастау<Icon name="arrow_forward" size={16} /></button>
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
        <img className="access__qr" src={KASPI_QR_SRC} alt="Kaspi QR: төлеу үшін телефонмен сканерлеңіз" width={180} height={180} />
        <span className="access__qr-note">Kaspi қосымшасымен сканерлеңіз</span>
      </div>
      <form className="access__steps" onSubmit={onPaidSubmit}>
        {rejected && (
          <p className="adm-alert" role="status">Алдыңғы аударым табылмады. Қайта төлеп, батырманы басыңыз.</p>
        )}
        <ol>
          <li>
            <strong>Аты-жөніңізді жазыңыз</strong>
            <label>
              Kaspi-де көрсетілетін аты-жөніңіз
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Мысалы: Айбек Серікұлы"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
            <p>Төлемді аты-жөні мен сома бойынша табамыз, сондықтан екеуі де сәйкес келуі керек.</p>
          </li>
          <li>
            <strong>Kaspi арқылы {fmtMoney(course.priceTenge)} төлеңіз</strong>
            <p>Телефоннан — «Kaspi-де төлеу» батырмасы. Компьютерден — сол жақтағы QR-кодты Kaspi қосымшасымен сканерлеңіз.</p>
            {/* Real <a href>: only a user-gesture navigation opens the Kaspi app on phones. */}
            <a className="ln-price__pay access__kaspi" href={payUrl} onClick={onKaspiClick} aria-disabled={busy}>
              <Icon name="qr_code_scanner" size={22} />Kaspi-де төлеу
            </a>
          </li>
          <li>
            <strong>Төлегеннен кейін басыңыз</strong>
            <button type="submit" className="qz-next" disabled={busy}>
              {busy ? "Жіберілуде…" : "Төледім"}
            </button>
            {error && <p className="adm-alert" role="alert">{error}</p>}
          </li>
        </ol>
      </form>
    </section>
  );
}
