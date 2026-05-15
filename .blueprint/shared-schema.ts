// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No `any`. ISO 8601 strings for timestamps.

// ==========================
// Generic identifiers
// ==========================
export type StablecoinId = string;
export type VariableId = string;
export type Dimension = "RQ" | "MC" | "OC" | "SE";
export type RiskLevel = "Normal" | "Elevated" | "High-Risk" | "Critical";
export type DataMode = "demo" | "live";

// ==========================
// Core entities (matching DB tables)
// ==========================
export interface Stablecoin {
  id: StablecoinId;
  symbol: string;
  name: string;
  coingeckoId: string;
  chain: string;
  createdAt: string; // ISO 8601
}

export interface DataSource {
  id: string;
  name: string;
  type: "market" | "onchain" | "sentiment";
  config: Record<string, unknown>; // JSON object
}

export interface RawMetric {
  id: string;
  stablecoinId: StablecoinId;
  variableId: VariableId;
  dataSourceId: string;
  value: number;
  observedAt: string;
}

export interface ScoringVariable {
  id: string;
  stablecoinId: StablecoinId;
  variableId: VariableId;
  normalizedScore: number;
  rawMetricId: string | null;
  isCarryForward: boolean;
  scoredAt: string;
}

export interface DimensionScore {
  id: string;
  stablecoinId: StablecoinId;
  dimension: Dimension;
  score: number;
  scoredAt: string;
}

export interface CompositeScore {
  id: string;
  stablecoinId: StablecoinId;
  score: number;
  riskLevel: RiskLevel;
  scoredAt: string;
}

export interface VariableWeight {
  id: string;
  variableId: VariableId;
  weight: number;
  updatedAt: string;
}

export interface Alert {
  id: string;
  stablecoinId: StablecoinId | null;
  type: "risk_change" | "rapid_mover" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
}

export interface RapidMover {
  id: string;
  scoringVariableId: string;
  delta: number;
  previousScore: number;
  currentScore: number;
  scoredAt: string;
}

export interface ReserveReview {
  id: string;
  stablecoinId: StablecoinId;
  sourceUrl: string;
  suggestedRq1: number;
  suggestedRq3: number;
  suggestedRq4: number;
  status: "pending" | "approved" | "manual_required";
  reviewerId: string | null;
  finalRq1: number | null;
  finalRq3: number | null;
  finalRq4: number | null;
  diffNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReserveAuditLog {
  id: string;
  reserveReviewId: string;
  actorId: string;
  action: "extracted" | "reviewed" | "published" | "rejected";
  diffSummary: string | null;
  createdAt: string;
}

// ==========================
// Aggregated view models (for API responses)
// ==========================
export interface StablecoinCardData {
  stablecoin: Stablecoin;
  compositeScore: number;
  riskLevel: RiskLevel;
  dimensionScores: { dimension: Dimension; score: number }[];
  rapidMover: boolean;
  isStale: boolean;
  lastUpdated: string;
  pendingReviewCount: number;
}

export interface MonitorOverviewResponse {
  version: "1.0";
  stablecoins: StablecoinCardData[];
  totals: {
    totalCoins: number;
    activeAlerts: number;
    rapidMovers: number;
  };
  refreshedAt: string;
}

export interface TrendDataPoint {
  timestamp: string;
  compositeScore: number;
  dimensionScores: { dimension: Dimension; score: number }[];
}
export interface TrendResponse {
  version: "1.0";
  stablecoinSymbol: string;
  points: TrendDataPoint[];
  timeRange: "24h" | "7d" | "30d";
}

export interface AlertItem extends Alert {
  stablecoinSymbol?: string;
}

export interface AlertsResponse {
  version: "1.0";
  alerts: AlertItem[];
}

export interface VariableExplanation {
  variableId: VariableId;
  name: string;
  rawValue: number;
  normalizedScore: number;
  ruleSummary: string;
  source: string;
  updatedAt: string;
  explanation: string;
}

export interface ReserveReviewStatusBlock {
  latestReview: {
    status: ReserveReview["status"];
    reviewerId: string | null;
    timestamp: string;
    sourceUrl: string;
  } | null;
}

export interface StablecoinDetailResponse {
  version: "1.0";
  stablecoin: Stablecoin;
  compositeScore: number;
  riskLevel: RiskLevel;
  isStale: boolean;
  lastUpdated: string;
  topDrivers: VariableExplanation[];
  dimensionScores: { dimension: Dimension; score: number }[];
  reserveReviewStatus: ReserveReviewStatusBlock;
}

export interface StablecoinTrendsResponse extends TrendResponse {
  // inherited `points` and `timeRange`
}

export interface StablecoinAlertsResponse extends AlertsResponse {
  // filtered for that coin
}

export interface QueueItem {
  id: string;
  stablecoinSymbol: string;
  status: ReserveReview["status"];
  sourceUrl: string;
  submittedAt: string;
}

export interface ReserveReviewQueueResponse {
  version: "1.0";
  items: QueueItem[];
}

export interface ReserveReviewDetailResponse {
  version: "1.0";
  review: ReserveReview;
  stablecoinSymbol: string;
  evidenceUrls: string[];
  aiConfidence: number; // placeholder, default 0.5 in demo
}

export interface ApproveReviewRequest {
  finalRq1?: number;
  finalRq3?: number;
  finalRq4?: number;
}
export interface ApproveReviewResponse {
  success: true;
  review: ReserveReview;
}

export interface RejectReviewRequest {
  reason: string;
}
export interface RejectReviewResponse {
  success: true;
  review: ReserveReview;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export interface TriggerScoringResponse {
  success: true;
  scoredAt: string;
}