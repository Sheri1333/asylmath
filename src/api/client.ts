import type {
  CourseSummary,
  EnrollmentInfo,
  LessonDetail,
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
  return localStorage.getItem(TOKEN_KEY);
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data;
}

export const api = {
  register(body: { email: string; password: string; name: string }) {
    return request<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login(body: { email: string; password: string }) {
    return request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  me() {
    return request<{ user: AuthUser }>("/auth/me");
  },

  listCourses(subject?: string) {
    const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
    return request<{ courses: CourseSummary[] }>(`/courses${q}`);
  },

  getCourse(idOrSlug: string) {
    return request<{
      course: CourseSummary;
      enrollment: EnrollmentInfo | null;
    }>(`/courses/${encodeURIComponent(idOrSlug)}`);
  },

  getLesson(courseIdOrSlug: string, lessonId: string) {
    return request<{
      course: { id: string; title: string; slug: string };
      lesson: LessonDetail;
      navigation: { prevLessonId: string | null; nextLessonId: string | null };
    }>(
      `/courses/${encodeURIComponent(courseIdOrSlug)}/lessons/${encodeURIComponent(lessonId)}`,
    );
  },

  myEnrollments() {
    return request<{
      enrollments: Array<{
        courseId: string;
        enrolledAt: string;
        lastAccessedAt: string;
        completedLessonIds: string[];
        progressPercent: number;
        course: CourseSummary;
      }>;
    }>("/enrollments/me");
  },

  enroll(courseId: string) {
    return request<{
      ok: boolean;
      alreadyEnrolled: boolean;
      enrollment: {
        courseId: string;
        completedLessonIds: string[];
        enrolledAt: string;
      };
    }>(`/enrollments/${encodeURIComponent(courseId)}`, { method: "POST" });
  },

  completeLesson(courseId: string, lessonId: string) {
    return request<{
      ok: boolean;
      completedLessonIds: string[];
      progressPercent: number;
    }>(
      `/enrollments/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/complete`,
      { method: "POST" },
    );
  },

  adminStats() {
    return request<{
      stats: {
        users: number;
        courses: number;
        publishedCourses: number;
        enrollments: number;
      };
      recentUsers: Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        createdAt: string;
      }>;
    }>("/admin/stats");
  },

  adminCourses() {
    return request<{ courses: CourseSummary[] }>("/admin/courses");
  },

  adminGetCourse(id: string) {
    return request<{
      course: {
        id: string;
        title: string;
        slug: string;
        subject: string;
        level: CourseSummary["level"];
        description: string;
        coverColor: string;
        isFree: boolean;
        priceTenge: number | null;
        published: boolean;
        lessons: Array<{
          id: string;
          title: string;
          summary: string;
          content: string;
          videoUrl: string;
          durationMinutes: number;
          order: number;
        }>;
      };
    }>(`/admin/courses/${encodeURIComponent(id)}`);
  },

  adminSaveCourse(body: Record<string, unknown>, id?: string) {
    if (id) {
      return request<{ ok: boolean; course: CourseSummary }>(
        `/admin/courses/${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
    }
    return request<{ ok: boolean; id: string; course: CourseSummary }>(
      "/admin/courses",
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  adminDeleteCourse(id: string) {
    return request<{ ok: boolean }>(
      `/admin/courses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  adminUsers() {
    return request<{
      users: Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        createdAt: string;
        enrollmentsCount: number;
      }>;
    }>("/admin/users");
  },

  adminSetRole(id: string, role: "user" | "admin") {
    return request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  adminDeleteUser(id: string) {
    return request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
