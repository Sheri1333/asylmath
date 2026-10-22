import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Guard } from "./components/Guard";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { CourseEditorPage } from "./pages/CourseEditorPage";
import { CabinetPage } from "./pages/CabinetPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage, RegisterPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProgramPage } from "./pages/ProgramPage";
import { LessonRedirect, StudyLessonPage } from "./pages/StudyLessonPage";
import { TestPage, TestRedirect } from "./pages/TestPage";
import "./styles/global.css";
import "./styles/phone.css";
import "./styles/polish.css";
import "./styles/mvp.css";

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
          <Route path="/lesson" element={<Guard><LessonRedirect /></Guard>} />
          <Route path="/lesson/:lessonId" element={<Guard><StudyLessonPage /></Guard>} />
          <Route path="/tests" element={<Guard><TestRedirect /></Guard>} />
          <Route path="/tests/:sectionId" element={<Guard><TestPage /></Guard>} />
          <Route path="/profile" element={<Guard><AccountPage /></Guard>} />
          <Route path="/admin" element={<Guard admin><AdminPage /></Guard>} />
          <Route path="/admin/courses/:id" element={<Guard admin><CourseEditorPage /></Guard>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
