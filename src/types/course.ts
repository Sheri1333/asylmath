export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type QuestionLevel = "easy" | "mid" | "hard";
export type EnrollmentStatus = "active" | "pending";

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
  featured: boolean;
  sequential: boolean;
  paymentNote: string;
  paymentUrl: string;
  sectionCount: number;
  lessonCount: number;
  quizCount: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizResultSummary {
  best: number;
  last: number;
  total: number;
  passed: boolean;
  attempts: number;
}

export interface QuizOutline {
  questionCount: number;
  passPercent: number;
  timeLimitMinutes: number;
  locked: boolean;
  result: QuizResultSummary | null;
}

export interface OutlineLesson {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  isPreview: boolean;
  hasVideo: boolean;
  materialCount: number;
  completed: boolean;
  locked: boolean;
  quiz: QuizOutline | null;
}

export interface OutlineSection {
  id: string;
  title: string;
  description: string;
  order: number;
  open: boolean;
  lessons: OutlineLesson[];
  quiz: QuizOutline | null;
}

export interface EnrollmentInfo {
  status: EnrollmentStatus;
  completedLessonIds: string[];
  progressPercent: number;
  enrolledAt: string;
  activatedAt: string | null;
  lastAccessedAt: string;
  quizResults: Record<string, QuizResultSummary & { updatedAt: string }>;
}

export interface CourseView {
  course: CourseSummary;
  outline: OutlineSection[];
  enrollment: EnrollmentInfo | null;
  access: boolean;
}

export interface Material {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface LessonView {
  course: CourseSummary;
  section: { id: string; title: string; order: number; hasQuiz: boolean };
  lesson: {
    id: string;
    title: string;
    summary: string;
    content: string;
    videoUrl: string | null;
    practiceVideoUrl: string | null;
    durationMinutes: number;
    isPreview: boolean;
    materials: Material[];
    completed: boolean;
  };
  navigation: { prevLessonId: string | null; nextLessonId: string | null };
  outline: OutlineSection[];
  enrollment: EnrollmentInfo | null;
}

export interface ReviewItem {
  id: string;
  pick: number;
  answer: number;
  explanation: string;
}

export interface QuizView {
  course: CourseSummary;
  scope?: "section" | "lesson";
  section: { id: string; title: string; order: number };
  lesson?: { id: string; title: string } | null;
  nextSection: { id: string; title: string } | null;
  nextLessonId?: string | null;
  quiz: {
    passPercent: number;
    timeLimitMinutes: number;
    questions: Array<{ id: string; prompt: string; formula: string; choices: string[]; level: QuestionLevel }>;
  };
  result: (QuizResultSummary & { review: ReviewItem[] }) | null;
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  passed: boolean;
  passPercent: number;
  review: ReviewItem[];
}

// ── Admin editing shapes (answers included) ──

export interface EditQuiz {
  passPercent: number;
  timeLimitMinutes: number;
  questions: EditQuestion[];
}

export interface EditQuestion {
  id?: string;
  prompt: string;
  formula?: string;
  choices: string[];
  answer: number;
  explanation: string;
  level: QuestionLevel;
}

export interface EditLesson {
  id?: string;
  title: string;
  summary: string;
  content: string;
  videoUrl?: string;
  practiceVideoUrl?: string;
  durationMinutes: number;
  isPreview?: boolean;
  materials?: Material[];
  quiz: EditQuiz;
}

export interface EditSection {
  id?: string;
  title: string;
  description: string;
  lessons: EditLesson[];
  quiz: EditQuiz;
}

export interface EditCourse {
  title: string;
  slug: string;
  subject: string;
  level: CourseLevel;
  description: string;
  coverColor: string;
  isFree: boolean;
  priceTenge: number | null;
  published: boolean;
  featured: boolean;
  sequential: boolean;
  paymentNote: string;
  paymentUrl: string;
  sections: EditSection[];
}

export interface AdminEnrollment extends EnrollmentInfo {
  id: string;
  user: { id: string; name: string; email: string };
  course: { id: string; title: string; priceTenge: number | null };
  note: string;
}
