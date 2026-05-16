// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

// Branded identifiers
export type UserId = string;
export type StablecoinId = string;
export type AccessRequestId = string;
export type ScoringCycleId = string;
export type VariableDefinitionId = string;
export type VariableScoreId = string;
export type StablecoinScoreId = string;
export type AlertId = string;
export type ReserveReviewItemId = string;
export type FeedbackId = string;
export type DomainAllowlistId = string;
export type AuditLogId = string;
export type DataSourceId = string;
export type SessionId = string;

// Enums / unions
export type UserRole = "internal_admin" | "internal_operator" | "enterprise_user";
export type AccountState = "pending" | "active" | "rejected" | "disabled" | "manual_review";
export type RequestStatus = "pending" | "approved" | "rejected" | "manual_review";
export type RiskLevel = "normal" | "elevated" | "high_risk" | "critical";
export type VariableReadinessState = "ready" | "not_ready" | "initializing" | "partial";
export type AlertType = "rapid_mover" | "risk_level_change";
export type AlertSeverity = "info" | "warning" | "high" | "critical";
export type ReserveReviewStatus = "pending" | "approved" | "rejected";
export type FeedbackStatus = "submitted" | "under_review" | "implemented" | "closed";
export type FeedbackType = "indicator" | "weight" | "threshold" | "data_source" | "other";
export type Priority = "low" | "medium" | "high" | "urgent";
export type DataSourceStatus = "live" | "stale" | "error";
export type DimensionCode = "RQ" | "MC" | "OC" | "SE";
export type HistoricalRange = "24H" | "1W" | "2W" | "30D" | "7D" | "30D";
export type QueueFilter = "all" | "pending" | "done";
export type SourceHealthFilter = "all" | "live" | "stale" | "error";
export type MonitorFilter = "all" | "normal" | "elevated" | "high_risk" | "critical" | "active_data";
export type ViewMode = "list" | "cards";

export interface User {
  id: UserId;
  email: string;
  name: string;
  company: string;
  role: UserRole;
  accountState: AccountState;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: SessionId;
  userId: UserId;
  expiresAt: string;
  createdAt: string;
}

export interface AccessRequest {
  id: AccessRequestId;
  fullName: string;
  company: string;
  workEmail: string;
  purpose: string;
  domain: string;
  status: RequestStatus;
  reviewedBy: UserId | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Stablecoin {
  id: StablecoinId;
  symbol: string;
  name: string;
  chainTags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringCycle {
  id: ScoringCycleId;
  executedAt: string;
  status: "success" | "partial" | "failed";
  version: string;
  createdAt: string;
}

export interface VariableDefinition {
  id: VariableDefinitionId;
  code: string;
  name: string;
  dimension: DimensionCode;
  description: string;
  lookbackDays: number;
  normalizationRule: string;
  sourceType: string;
  isActive: boolean;
}

export interface VariableScore {
  id: VariableScoreId;
  scoringCycleId: ScoringCycleId;
  stablecoinId: StablecoinId;
  variableDefinitionId: VariableDefinitionId;
  rawValue: number | string | null;
  normalizedScore: number | null;
  readinessState: VariableReadinessState;
  sourceTimestamp: string | null;
  ruleVersion: string;
  reasonText: string | null;
  createdAt: string;
}

export interface DimensionScore {
  dimensionCode: DimensionCode;
  dimensionScore: number | null;
}

export interface StablecoinScore {
  id: StablecoinScoreId;
  scoringCycleId: ScoringCycleId;
  stablecoinId: StablecoinId;
  compositeScore: number | null;
  riskLevel: RiskLevel;
  rapidMover: boolean;
  calculatedAt: string;
  createdAt: string;
}

export interface Alert {
  id: AlertId;
  type: AlertType;
  stablecoinId: StablecoinId;
  severity: AlertSeverity;
  title: string;
  message: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface ReserveReviewField {
  fieldCode: "RQ-1" | "RQ-3" | "RQ-4" | string;
  suggestedValue: number | string | null;
  editedValue: number | string | null;
  finalValue: number | string | null;
  isEdited: boolean;
}

export interface ReserveReviewEvidence {
  id: string;
  reserveReviewItemId: ReserveReviewItemId;
  excerptText: string;
  excerptStart: number;
  excerptEnd: number;
  storageUrl: string | null;
  createdAt: string;
}

export interface ReserveReviewItem {
  id: ReserveReviewItemId;
  stablecoinId: StablecoinId;
  sourceType: string;
  sourceUrl: string;
  documentType: string;
  aiConfidence: number;
  status: ReserveReviewStatus;
  reviewerUserId: UserId | null;
  reviewerNotes: string | null;
  sourceReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: AuditLogId;
  actorUserId: UserId | null;
  action: string;
  entityType: string;
  entityId: string;
  diffSummary: string;
  diffJson: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Feedback {
  id: FeedbackId;
  userId: UserId;
  stablecoinId: StablecoinId;
  indicatorCode: string;
  feedbackType: FeedbackType;
  description: string;
  priority: Priority;
  referenceUrl: string | null;
  status: FeedbackStatus;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainAllowlist {
  id: DomainAllowlistId;
  domain: string;
  company: string;
  notes: string | null;
  addedBy: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: DataSourceId;
  name: string;
  type: string;
  status: DataSourceStatus;
  lastUpdateAt: string | null;
  latencyMs: number | null;
  errorDetail: string | null;
  variablesCovered: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  id: string;
  key: string;
  valueJson: Record<string, unknown>;
  updatedBy: UserId | null;
  updatedAt: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  user: User;
  session: Session;
}
export interface LogoutRequest {
  sessionId?: SessionId;
}
export interface LogoutResponse {
  success: boolean;
}
export interface SessionResponse {
  user: User | null;
  session: Session | null;
}
export interface RequestAccessRequest {
  fullName: string;
  company: string;
  workEmail: string;
  purpose: string;
}
export interface RequestAccessResponse {
  accessRequest: AccessRequest;
  nextState: RequestStatus;
}
export interface PendingStatusResponse {
  accessRequest: AccessRequest | null;
  user: User | null;
}

// Monitor
export interface MonitorSummaryResponse {
  trackedCoinsCount: number;
  activeAlertsCount: number;
  rapidMoversCount: number;
  pendingReviewsCount: number;
  stablecoins: Array<StablecoinScore & { symbol: string; name: string; chainTags: string[]; updatedAt: string | null; stale: boolean; notReady: boolean; dimensions: DimensionScore[] }>;
  trendSeries: Array<{ stablecoinId: StablecoinId; symbol: string; points: Array<{ timestamp: string; compositeScore: number | null; riskLevel: RiskLevel }> }>;
  alerts: Alert[];
}
export interface MonitorTrendRequest {
  range: "7D" | "30D";
}
export interface MonitorTrendResponse {
  series: Array<{ stablecoinId: StablecoinId; symbol: string; points: Array<{ timestamp: string; compositeScore: number | null; riskLevel: RiskLevel }> }>;
}
export interface MonitorAlertsFeedResponse {
  alerts: Alert[];
}

// Stablecoin detail
export interface StablecoinDetailRequest {
  symbol: string;
}
export interface StablecoinDetailResponse {
  stablecoin: Stablecoin;
  score: StablecoinScore;
  dimensions: DimensionScore[];
  topDrivers: Array<{ variableCode: string; variableName: string; rawValue: number | string | null; normalizedScore: number | null; reasonText: string | null }>;
  reviewStatus: ReserveReviewItem | null;
}
export interface StablecoinHistoryRequest {
  symbol: string;
  range: HistoricalRange;
}
export interface StablecoinHistoryResponse {
  symbol: string;
  range: HistoricalRange;
  series: Array<{ timestamp: string; compositeScore: number | null; dimensions: DimensionScore[] }>;
}
export interface StablecoinVariablesResponse {
  symbol: string;
  variables: Array<VariableScore & { variableDefinition: VariableDefinition }>;
}
export interface StablecoinAlertsResponse {
  symbol: string;
  alerts: Alert[];
}
export interface StablecoinReviewStatusResponse {
  symbol: string;
  reviewStatus: ReserveReviewItem | null;
}

// Scoring
export interface RunCycleRequest {
  dryRun?: boolean;
}
export interface RunCycleResponse {
  cycle: ScoringCycle;
}
export interface LatestCycleResponse {
  cycle: ScoringCycle | null;
  scores: StablecoinScore[];
}
export interface VariablesResponse {
  variables: VariableDefinition[];
}
export interface DimensionsResponse {
  dimensions: Array<{ code: DimensionCode; name: string; variableCount: number }>;
}

// Reserve review
export interface ReserveReviewQueueRequest {
  filter: QueueFilter;
}
export interface ReserveReviewQueueResponse {
  items: ReserveReviewItem[];
}
export interface ReserveReviewItemRequest {
  id: ReserveReviewItemId;
}
export interface ReserveReviewItemResponse {
  item: ReserveReviewItem;
  fields: ReserveReviewField[];
  evidence: ReserveReviewEvidence[];
}
export interface ApproveReserveReviewRequest {
  notes?: string;
}
export interface ApproveReserveReviewResponse {
  item: ReserveReviewItem;
}
export interface EditApproveReserveReviewRequest {
  fields: Array<{ fieldCode: string; editedValue: number | string | null }>;
  notes: string;
}
export interface EditApproveReserveReviewResponse {
  item: ReserveReviewItem;
}
export interface RejectReserveReviewRequest {
  reason: string;
}
export interface RejectReserveReviewResponse {
  item: ReserveReviewItem;
}
export interface ReserveReviewAuditTrailResponse {
  entries: AuditLog[];
}

// Data feed
export interface DataFeedSummaryResponse {
  liveSourcesCount: number;
  staleSourcesCount: number;
  errorSourcesCount: number;
  averageLatencyMs: number | null;
}
export interface DataFeedSourcesRequest {
  status: SourceHealthFilter;
}
export interface DataFeedSourcesResponse {
  sources: DataSource[];
}
export interface RefreshAllDataFeedResponse {
  accepted: boolean;
}

// Feedback
export interface MyFeedbackResponse {
  items: Feedback[];
}
export interface CreateFeedbackRequest {
  stablecoinId: StablecoinId;
  indicatorCode: string;
  feedbackType: FeedbackType;
  description: string;
  priority: Priority;
  referenceUrl?: string;
}
export interface CreateFeedbackResponse {
  feedback: Feedback;
}
export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
  internalNotes?: string;
}
export interface UpdateFeedbackStatusResponse {
  feedback: Feedback;
}

// Admin accounts
export interface AdminAccountsSummaryResponse {
  pendingApprovalsCount: number;
  activeEnterpriseUsersCount: number;
  internalTeamCount: number;
  allowedDomainsCount: number;
}
export interface AdminAccessRequestsResponse {
  requests: AccessRequest[];
}
export interface ApproveAccessRequestRequest {
  notes?: string;
}
export interface ApproveAccessRequestResponse {
  request: AccessRequest;
  createdUser: User | null;
}
export interface RejectAccessRequestRequest {
  notes?: string;
}
export interface RejectAccessRequestResponse {
  request: AccessRequest;
}
export interface InviteUserRequest {
  fullName: string;
  workEmail: string;
  role: UserRole;
  company: string;
}
export interface InviteUserResponse {
  user: User;
}
export interface AddDomainRequest {
  domain: string;
  company: string;
  notes?: string;
}
export interface AddDomainResponse {
  domain: DomainAllowlist;
}
export interface RemoveDomainResponse {
  removed: boolean;
}
export interface AdminUsersResponse {
  users: User[];
}

// Help
export interface AccessGuidanceResponse {
  supportEmail: string;
  productionSsoPlanned: boolean;
  allowedDomains: string[];
  requiredFields: string[];
}
export interface SupportResponse {
  supportEmail: string;
  responseTime: string;
}

// Generic API error
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}