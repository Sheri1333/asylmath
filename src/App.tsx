import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Guard } from "./components/Guard";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { CabinetPage } from "./pages/CabinetPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage, RegisterPage } from "./pages/LoginPage";
import { ProgramPage } from "./pages/ProgramPage";
import { StudyLessonPage } from "./pages/StudyLessonPage";
import { TestPage } from "./pages/TestPage";
import "./styles/global.css";
import "./styles/phone.css";
import "./styles/polish.css";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<Guard><CabinetPage /></Guard>} />
          <Route path="/course" element={<Guard><ProgramPage /></Guard>} />
          <Route path="/lesson" element={<Guard><StudyLessonPage /></Guard>} />
          <Route path="/tests" element={<Guard><TestPage /></Guard>} />
          <Route path="/profile" element={<Guard><AccountPage /></Guard>} />
          <Route path="/admin" element={<Guard><AdminPage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
