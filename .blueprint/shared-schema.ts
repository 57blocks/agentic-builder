// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type UserId = string;
export type TaskId = string;
export type CategoryId = string;
export type SessionId = string;

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";
export type TaskCompletionStatus = "active" | "completed";
export type SortDirection = "asc" | "desc";
export type TaskSortBy = "dueDate" | "priority" | "createdAt";
export type TaskFilterStatus = "all" | "active" | "completed";

export interface User {
  id: UserId;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: SessionId;
  userId: UserId;
  expiresAt: string;
  createdAt: string;
}

export interface Category {
  id: CategoryId;
  userId: UserId;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: TaskId;
  userId: UserId;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  completed: boolean;
  categoryId: CategoryId | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserResponse {
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
  user: User;
}

export interface LogoutRequest {}

export interface LogoutResponse {
  success: true;
}

export interface MeResponse {
  user: User;
}

export interface ListTasksRequest {
  status?: TaskFilterStatus;
  categoryId?: CategoryId;
  sortBy?: TaskSortBy;
  sortDirection?: SortDirection;
  page?: number;
  limit?: number;
}

export interface ListTasksResponse {
  tasks: Task[];
  page: number;
  limit: number;
  total: number;
}

export interface GetTaskRequest {
  id: TaskId;
}

export interface GetTaskResponse {
  task: Task;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  categoryId?: CategoryId | null;
}

export interface CreateTaskResponse {
  task: Task;
}

export interface UpdateTaskRequest {
  id: TaskId;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  categoryId: CategoryId | null;
  completed: boolean;
}

export interface UpdateTaskResponse {
  task: Task;
}

export interface ToggleTaskCompletionRequest {
  id: TaskId;
}

export interface ToggleTaskCompletionResponse {
  task: Task;
}

export interface DeleteTaskRequest {
  id: TaskId;
}

export interface DeleteTaskResponse {
  success: true;
}

export interface ListCategoriesRequest {}

export interface ListCategoriesResponse {
  categories: Category[];
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateCategoryResponse {
  category: Category;
}

export interface UpdateCategoryRequest {
  id: CategoryId;
  name: string;
}

export interface UpdateCategoryResponse {
  category: Category;
}

export interface DeleteCategoryRequest {
  id: CategoryId;
}

export interface DeleteCategoryResponse {
  success: true;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}