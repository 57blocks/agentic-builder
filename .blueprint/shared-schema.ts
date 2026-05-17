// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type UserId = string;
export type TaskId = string;
export type PomodoroSessionId = string;
export type PasswordResetTokenId = string;

export type PomodoroSessionType = "work" | "short_break" | "long_break";
export type PomodoroSessionStatus = "completed" | "stopped" | "skipped";

export interface UserSettings {
  workDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  autoStartNextSession: boolean;
}

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  settings: UserSettings;
}

export interface UserProfile {
  id: UserId;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  displayName: string;
}
export interface UpdateProfileResponse {
  user: UserProfile;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export interface ChangePasswordResponse {
  success: boolean;
}

export interface AuthSession {
  user: UserProfile;
  expiresAt: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface RegisterResponse {
  user: UserProfile;
  session: AuthSession;
}

export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  user: UserProfile;
  session: AuthSession;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}
export interface ForgotPasswordResponse {
  success: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}
export interface ResetPasswordResponse {
  success: boolean;
}

export interface MeResponse {
  user: UserProfile | null;
  authenticated: boolean;
}

export interface GetProfileResponse {
  user: UserProfile;
}

export interface GetSettingsResponse {
  settings: UserSettings;
}
export interface UpdateSettingsRequest {
  workDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  autoStartNextSession: boolean;
}
export interface UpdateSettingsResponse {
  settings: UserSettings;
}

export interface Task {
  id: TaskId;
  userId: UserId;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  sortOrder: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
}
export interface CreateTaskResponse {
  task: Task;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  isCompleted?: boolean;
}
export interface UpdateTaskResponse {
  task: Task;
}

export interface DeleteTaskRequest {
  taskId: TaskId;
}
export interface DeleteTaskResponse {
  success: boolean;
}

export interface ReorderTasksRequest {
  orderedTaskIds: TaskId[];
}
export interface ReorderTasksResponse {
  tasks: Task[];
}

export interface ListTasksResponse {
  tasks: Task[];
}

export interface PomodoroSession {
  id: PomodoroSessionId;
  userId: UserId;
  taskId?: TaskId | null;
  type: PomodoroSessionType;
  status: PomodoroSessionStatus;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePomodoroSessionRequest {
  taskId?: TaskId | null;
  type: PomodoroSessionType;
  status: PomodoroSessionStatus;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}
export interface CreatePomodoroSessionResponse {
  session: PomodoroSession;
}

export interface GetRecentSessionsResponse {
  sessions: PomodoroSession[];
}

export interface GetSessionResponse {
  session: PomodoroSession;
}

export interface AnalyticsSummary {
  todayCompletedPomodoros: number;
  totalFocusSeconds: number;
  currentStreakDays: number;
  bestDayCompletedPomodoros?: number;
}

export interface GetAnalyticsSummaryResponse {
  summary: AnalyticsSummary;
}

export interface DailyPomodoroPoint {
  date: string;
  completedPomodoros: number;
}
export interface GetDailyAnalyticsResponse {
  points: DailyPomodoroPoint[];
}

export interface TaskBreakdownPoint {
  taskId: TaskId | null;
  taskTitle: string;
  completedPomodoros: number;
}
export interface GetTaskBreakdownResponse {
  points: TaskBreakdownPoint[];
}

export interface RecentSessionRow {
  id: PomodoroSessionId;
  completedAt: string;
  taskId?: TaskId | null;
  taskTitle: string;
  durationSeconds: number;
  type: PomodoroSessionType;
  status: PomodoroSessionStatus;
}
export interface GetRecentAnalyticsSessionsResponse {
  sessions: RecentSessionRow[];
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}