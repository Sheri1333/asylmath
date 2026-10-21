import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";

export function AccountPage() {
  const { user } = useAuth();
  const name = user?.name || "Оқушы";
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
            <span className="goal"><Icon name="flag" size={16} fill />Мақсатың: 45 балл</span>
            {user?.role === "admin" && <span className="pace"><Icon name="admin_panel_settings" size={16} />Әкімші</span>}
          </div>
        </section>
        <div className="acc__kpis">
          <article><span className="cab-kpis__ico"><Icon name="verified" size={24} color="#00236f" /></span><strong>31<em>/50</em></strong><small>Соңғы сынақ</small></article>
          <article><span className="cab-kpis__ico peach"><Icon name="local_fire_department" size={20} fill color="#9d4300" /></span><strong>5 күн</strong><small>Қатарынан</small></article>
          <article><span className="cab-kpis__ico"><Icon name="menu_book" size={22} color="#00236f" /></span><strong>4<em>/11</em></strong><small>Бөлім</small></article>
          <article><span className="cab-kpis__ico"><Icon name="school" size={22} color="#00236f" /></span><strong>11</strong><small>Сынып · ҰБТ 2025</small></article>
        </div>
      </div>
    </Shell>
  );
}
