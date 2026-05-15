// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type TaskId = string;

export type TaskPriority = "low" | "medium" | "high";
export type TaskFilter = "all" | "active" | "completed";
export type TaskSortBy = "dueDate" | "priority" | "createdAt";

export interface Task {
  id: TaskId;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
}

export interface CreateTaskResponse {
  task: Task;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  completed?: boolean;
}

export interface UpdateTaskResponse {
  task: Task;
}

export interface ToggleTaskCompletionRequest {
  completed: boolean;
}

export interface ToggleTaskCompletionResponse {
  task: Task;
}

export interface DeleteTaskRequest {
  id: TaskId;
}

export interface DeleteTaskResponse {
  success: true;
  deletedTaskId: TaskId;
}

export interface GetTaskRequest {
  id: TaskId;
}

export interface GetTaskResponse {
  task: Task;
}

export interface ListTasksRequest {
  filter?: TaskFilter;
  sortBy?: TaskSortBy;
}

export interface ListTasksResponse {
  tasks: Task[];
}

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}