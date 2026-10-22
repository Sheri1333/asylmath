import type {
  AdminEnrollment,
  CourseSummary,
  CourseView,
  EditCourse,
  EditSection,
  EnrollmentInfo,
  LessonView,
  Material,
  QuizSubmitResult,
  QuizView,
} from "../types/course";

const TOKEN_KEY = "aslmath_token";
const USER_KEY = "aslmath_user";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Error with the HTTP status, so pages can tell "no access" from "not found". */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Серверге қосылу мүмкін болмады. Интернетті тексеріңіз.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error || `Қате ${res.status}`, res.status);
  return data;
}

const enc = encodeURIComponent;

export const api = {
  register(body: { email: string; password: string; name: string }) {
    return request<{ token: string; user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify(body) });
  },

  login(body: { email: string; password: string }) {
    return request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(body) });
  },

  me() {
    return request<{ user: AuthUser }>("/auth/me");
  },

  changePassword(current: string, next: string) {
    return request<{ ok: boolean }>("/auth/password", { method: "POST", body: JSON.stringify({ current, next }) });
  },

  // ── Student ──

  featured() {
    return request<{ slug: string }>("/courses/featured");
  },

  course(key: string) {
    return request<CourseView>(`/courses/${enc(key)}`);
  },

  lesson(key: string, lessonId: string) {
    return request<LessonView>(`/courses/${enc(key)}/lessons/${enc(lessonId)}`);
  },

  quiz(key: string, sectionId: string) {
    return request<QuizView>(`/courses/${enc(key)}/sections/${enc(sectionId)}/quiz`);
  },

  submitQuiz(key: string, sectionId: string, picks: number[]) {
    return request<QuizSubmitResult>(`/courses/${enc(key)}/sections/${enc(sectionId)}/quiz`, {
      method: "POST",
      body: JSON.stringify({ picks }),
    });
  },

  myEnrollments() {
    return request<{ enrollments: Array<EnrollmentInfo & { courseId: string; course: CourseSummary }> }>("/enrollments/me");
  },

  enroll(courseId: string, note = "") {
    return request<{ ok: boolean; enrollment: EnrollmentInfo }>(`/enrollments/${enc(courseId)}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  completeLesson(courseId: string, lessonId: string) {
    return request<{ ok: boolean; enrollment: EnrollmentInfo }>(`/enrollments/${enc(courseId)}/lessons/${enc(lessonId)}/complete`, {
      method: "POST",
    });
  },

  // ── Admin ──

  adminStats() {
    return request<{ stats: { users: number; courses: number; publishedCourses: number; enrollments: number; pending: number } }>(
      "/admin/stats",
    );
  },

  adminCourses() {
    return request<{ courses: CourseSummary[] }>("/admin/courses");
  },

  adminGetCourse(id: string) {
    return request<{ course: CourseSummary & { sections: EditSection[] } }>(`/admin/courses/${enc(id)}`);
  },

  adminSaveCourse(body: EditCourse, id?: string) {
    return request<{ ok: boolean; course: CourseSummary & { sections: EditSection[] } }>(
      id ? `/admin/courses/${enc(id)}` : "/admin/courses",
      { method: id ? "PUT" : "POST", body: JSON.stringify(body) },
    );
  },

  adminDeleteCourse(id: string) {
    return request<{ ok: boolean }>(`/admin/courses/${enc(id)}`, { method: "DELETE" });
  },

  adminEnrollments(status: "pending" | "active" | "all" = "all") {
    return request<{ enrollments: AdminEnrollment[] }>(`/admin/enrollments?status=${status}`);
  },

  adminGrant(email: string, courseId: string) {
    return request<{ ok: boolean }>("/admin/enrollments", { method: "POST", body: JSON.stringify({ email, courseId }) });
  },

  adminSetEnrollment(id: string, status: "active" | "pending") {
    return request<{ ok: boolean }>(`/admin/enrollments/${enc(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  adminDeleteEnrollment(id: string) {
    return request<{ ok: boolean }>(`/admin/enrollments/${enc(id)}`, { method: "DELETE" });
  },

  async adminUpload(file: File): Promise<Material> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/admin/uploads`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": enc(file.name),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as { file?: Omit<Material, "id">; error?: string };
    if (!res.ok || !data.file) {
      throw new Error(data.error || (res.status === 413 ? "Файл больше 20 МБ" : `Ошибка загрузки ${res.status}`));
    }
    return { ...data.file, id: crypto.randomUUID() };
  },

  adminUsers() {
    return request<{
      users: Array<{ id: string; email: string; name: string; role: string; createdAt: string; enrollmentsCount: number }>;
    }>("/admin/users");
  },

  adminSetRole(id: string, role: "user" | "admin") {
    return request<{ ok: boolean }>(`/admin/users/${enc(id)}`, { method: "PATCH", body: JSON.stringify({ role }) });
  },

  adminDeleteUser(id: string) {
    return request<{ ok: boolean }>(`/admin/users/${enc(id)}`, { method: "DELETE" });
  },
};
