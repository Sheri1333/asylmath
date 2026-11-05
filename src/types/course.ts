export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type QuestionLevel = "easy" | "mid" | "hard";
export type EnrollmentStatus = "active" | "pending" | "rejected";

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
  /** Exams: every chosen and every correct index (several when a question has more than one right answer). */
  picks?: number[];
  answers?: number[];
  correct?: boolean;
  explanation: string;
  /** Per-question YouTube for error review (exams). */
  reviewVideoUrl?: string | null;
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
  reviewVideoUrl?: string | null;
  nextLessonId?: string | null;
}

/** Dated mock test shown under Сынақтар. */
export interface ExamSummary {
  id: string;
  title: string;
  date: string;
  description: string;
  passPercent: number;
  timeLimitMinutes: number;
  published: boolean;
  reviewVideoUrl: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  result?: (QuizResultSummary & { updatedAt: string }) | null;
}

export interface EditExamQuestion {
  id?: string;
  prompt: string;
  description: string;
  imageUrl: string;
  choices: string[];
  answer: number;
  /** Every correct choice; two or more make it a multi-answer question. */
  answers?: number[];
  explanation: string;
  /** YouTube разбор этого вопроса. */
  reviewVideoUrl: string;
  level: QuestionLevel;
}

export interface EditExam {
  title: string;
  date: string;
  description: string;
  passPercent: number;
  timeLimitMinutes: number;
  published: boolean;
  reviewVideoUrl: string;
  questions: EditExamQuestion[];
}

export interface ExamView {
  exam: ExamSummary;
  quiz: {
    passPercent: number;
    timeLimitMinutes: number;
    questions: Array<{
      id: string;
      prompt: string;
      description: string;
      imageUrl: string;
      choices: string[];
      level: QuestionLevel;
      /** More than one correct choice: the student ticks all of them. */
      multi?: boolean;
    }>;
  };
  result: (QuizResultSummary & { review: ReviewItem[]; reviewVideoUrl?: string | null }) | null;
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
