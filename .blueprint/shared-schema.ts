// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

export type SessionId = string;
export type DeviceId = string;

export type SessionType = "focus" | "short_break" | "long_break";
export type SessionFilterType = "all" | "focus" | "break";
export type TimerPhase = "focus" | "short_break" | "long_break";
export type SortDirection = "asc" | "desc";

export interface Session {
  id: SessionId;
  deviceId: DeviceId;
  type: SessionType;
  durationSeconds: number;
  taskName: string | null;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface CreateSessionRequest {
  deviceId: DeviceId;
  type: SessionType;
  durationSeconds: number;
  taskName?: string;
  startedAt: string;
  endedAt: string;
}

export interface CreateSessionResponse {
  session: Session;
}

export interface SessionSummary {
  totalFocusSeconds: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ListSessionsQuery {
  deviceId: DeviceId;
  from?: string;
  to?: string;
  type?: SessionFilterType;
  limit?: number;
  cursor?: string;
}

export interface ListSessionsResponse {
  sessions: Session[];
  nextCursor: string | null;
  totalReturned: number;
  hasMore: boolean;
  summary: SessionSummary;
}

export interface HealthResponse {
  ok: true;
  service: "focusflow-api";
  timestamp: string;
}

export interface TimerSettings {
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  volume: number;
}

export interface TimerSettingsPayload {
  settings: TimerSettings;
}

export interface DeviceIdentity {
  deviceId: DeviceId;
  createdAt: string;
  lastSeenAt: string | null;
}