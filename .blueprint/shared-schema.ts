// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type UserId = string;
export type ProjectId = string;
export type ProjectMembershipKey = string;
export type TaskId = string;
export type InviteTokenId = string;
export type AuditLogId = string;

export type ProjectStatus = "active" | "archived";
export type MembershipRole = "owner" | "member";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "to-do" | "in-progress" | "done";

export interface User {
  id: UserId;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LogoutRequest {
  token?: string;
}

export interface LogoutResponse {
  success: true;
}

export interface MeResponse {
  user: User;
}

export interface UpdateMeRequest {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateMeResponse {
  user: User;
}

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  ownerId: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  projectId: ProjectId;
  userId: UserId;
  role: MembershipRole;
  joinedAt: string;
  user?: User;
}

export interface ProjectSummary {
  project: Project;
  memberCount: number;
  totalTaskCount: number;
  completedTaskCount: number;
  completionPercent: number;
  lastUpdatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectResponse {
  project: Project;
}

export interface ArchiveProjectResponse {
  project: Project;
}

export interface DeleteProjectResponse {
  success: true;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface ProjectDetailResponse {
  project: Project;
  members: ProjectMember[];
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
}

export interface InviteProjectMemberRequest {
  email: string;
  role?: MembershipRole;
}

export interface InviteProjectMemberResponse {
  membership: ProjectMember;
}

export interface UpdateProjectMemberRequest {
  role: MembershipRole;
}

export interface UpdateProjectMemberResponse {
  membership: ProjectMember;
}

export interface RemoveProjectMemberResponse {
  success: true;
}

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  description: string;
  assigneeId: UserId | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  task: Task;
  projectName: string;
  assignee?: User;
}

export interface TaskListFilters {
  projectId?: ProjectId;
  status?: TaskStatus;
  assigneeId?: UserId;
  priority?: TaskPriority;
  sortBy?: "dueDate" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface TaskListResponse {
  tasks: TaskSummary[];
}

export interface CreateTaskRequest {
  projectId: ProjectId;
  title: string;
  description: string;
  assigneeId?: UserId | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status?: TaskStatus;
}

export interface CreateTaskResponse {
  task: Task;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assigneeId?: UserId | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface UpdateTaskResponse {
  task: Task;
}

export interface DeleteTaskResponse {
  success: true;
}

export interface DashboardTaskItem {
  task: Task;
  projectName: string;
}

export interface DashboardProjectItem {
  summary: ProjectSummary;
}

export interface DashboardResponse {
  myTasks: DashboardTaskItem[];
  myProjects: DashboardProjectItem[];
}

export interface AcceptInviteRequest {
  token: string;
}

export interface AcceptInviteResponse {
  membership: ProjectMember;
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
  };
}