import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NotFoundPage() {
  const { user } = useAuth();
  useEffect(() => {
    document.title = "Бет табылмады — MATH ASYL";
  }, []);
  return (
    <div className="nf">
      <img src="/assets/logo.png" alt="MATH ASYL" />
      <p className="nf__code">404</p>
      <h1>Мұндай бет жоқ</h1>
      <p>Сілтеме ескірген немесе қате терілген болуы мүмкін.</p>
      <div className="nf__acts">
        <Link to={user ? "/home" : "/"} className="qz-next">{user ? "Кабинетке оралу" : "Басты бетке"}</Link>
        {user && <Link to="/course" className="qz-prev">Курс бағдарламасы</Link>}
      </div>
    </div>
  );
}
