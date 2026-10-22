import { Link, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

export function Guard({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="boot" role="status">
        <img src="/assets/logo.png" alt="" />
        <span>Кабинет ашылып жатыр…</span>
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !isAdmin)
    return (
      <div className="boot">
        <img src="/assets/logo.png" alt="" />
        <span>Бұл бет тек әкімшіге арналған.</span>
        <Link to="/home" className="qz-next">Кабинетке оралу</Link>
      </div>
    );
  return children;
}
