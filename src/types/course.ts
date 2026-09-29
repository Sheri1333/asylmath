export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  subject: string;
  level: CourseLevel;
  description: string;
  coverColor: string;
  isFree: boolean;
  priceTenge: number | null;
  published: boolean;
  lessonCount: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  enrolled?: boolean;
  lessons?: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  order: number;
  hasVideo?: boolean;
}

export interface LessonDetail {
  id: string;
  title: string;
  summary: string;
  content: string;
  videoUrl: string | null;
  durationMinutes: number;
  order: number;
  completed: boolean;
}

export interface EnrollmentInfo {
  completedLessonIds: string[];
  enrolledAt: string;
  lastAccessedAt: string;
  progressPercent: number;
}
