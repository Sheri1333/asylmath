import { Link } from "react-router-dom";
import { Icon } from "./Icon";

/** Loading and failure states for pages that wait on the API. */
export function PageState({
  error,
  onRetry,
  paywall,
}: {
  error: { message: string; status: number } | null;
  onRetry?: () => void;
  /** A 403 here means the student has not paid: show the buy-course lock. */
  paywall?: boolean;
}) {
  if (!error)
    return (
      <div className="pstate" role="status">
        <span className="pstate__spin" aria-hidden />
        <p>Жүктелуде…</p>
      </div>
    );
  if (paywall && error?.status === 403)
    return (
      <div className="pstate pstate--err">
        <Icon name="lock" size={28} />
        <h2>Сынақ тесттері жабық</h2>
        <p>{error.message || "Сынақ тесттері тек курсты төлеген оқушыларға ашық."}</p>
        <div className="pstate__acts">
          <Link to="/course" className="qz-next">Курсты сатып алу<Icon name="arrow_forward" size={16} /></Link>
        </div>
      </div>
    );
  const noCourse = error.status === 404;
  return (
    <div className="pstate pstate--err">
      <Icon name={noCourse ? "menu_book" : "warning"} size={28} />
      <h2>{noCourse ? "Курс әлі жарияланбаған" : "Бетті ашу мүмкін болмады"}</h2>
      <p>{noCourse ? "Курс жарияланғанда осы жерде пайда болады." : error.message}</p>
      <div className="pstate__acts">
        {onRetry && !noCourse && (
          <button type="button" className="qz-next" onClick={onRetry}>Қайталау</button>
        )}
        <Link to="/course" className="qz-prev">Курс бағдарламасы</Link>
      </div>
    </div>
  );
}
