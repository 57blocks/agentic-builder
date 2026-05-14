/**
 * Data access for `coding_session_reports`.
 * Mirrors the JSON+markdown that `writeCodingSessionReport` persists to
 * `.ralph/`. Writes are best-effort — callers should swallow errors so a
 * DB outage never breaks a coding session.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import {
  codingSessionReports,
  type CodingSessionReport,
  type NewCodingSessionReport,
} from "./schema";

export type SaveCodingSessionReportInput = NewCodingSessionReport;

export async function saveCodingSessionReport(
  row: SaveCodingSessionReportInput,
): Promise<void> {
  await db
    .insert(codingSessionReports)
    .values(row)
    .onConflictDoUpdate({
      target: codingSessionReports.sessionId,
      set: {
        projectId:       row.projectId ?? null,
        outputDir:       row.outputDir,
        status:          row.status,
        score:           row.score ?? null,
        grade:           row.grade ?? null,
        primaryModel:    row.primaryModel ?? null,
        totalCalls:      row.totalCalls ?? 0,
        totalTokens:     row.totalTokens ?? 0,
        totalCostUsd:    row.totalCostUsd ?? 0,
        durationMs:      row.durationMs ?? 0,
        startedAt:       row.startedAt,
        endedAt:         row.endedAt,
        generatorGitSha: row.generatorGitSha ?? null,
        payload:         row.payload,
        markdown:        row.markdown,
      },
    });
}

export async function getCodingSessionReport(
  sessionId: string,
): Promise<CodingSessionReport | null> {
  const rows = await db
    .select()
    .from(codingSessionReports)
    .where(eq(codingSessionReports.sessionId, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestCodingSessionReport(
  projectId?: string | null,
): Promise<CodingSessionReport | null> {
  const q = db.select().from(codingSessionReports).$dynamic();
  if (projectId) {
    q.where(eq(codingSessionReports.projectId, projectId));
  }
  const rows = await q.orderBy(desc(codingSessionReports.endedAt)).limit(1);
  return rows[0] ?? null;
}

export interface CodingSessionReportHistoryRow {
  sessionId: string;
  projectId: string | null;
  status: string;
  score: number | null;
  grade: string | null;
  primaryModel: string | null;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
  startedAt: Date;
  endedAt: Date;
}

export async function listCodingSessionReportHistory(opts: {
  projectId?: string | null;
  limit?: number;
}): Promise<CodingSessionReportHistoryRow[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));
  const q = db
    .select({
      sessionId:    codingSessionReports.sessionId,
      projectId:    codingSessionReports.projectId,
      status:       codingSessionReports.status,
      score:        codingSessionReports.score,
      grade:        codingSessionReports.grade,
      primaryModel: codingSessionReports.primaryModel,
      totalCalls:   codingSessionReports.totalCalls,
      totalTokens:  codingSessionReports.totalTokens,
      totalCostUsd: codingSessionReports.totalCostUsd,
      durationMs:   codingSessionReports.durationMs,
      startedAt:    codingSessionReports.startedAt,
      endedAt:      codingSessionReports.endedAt,
    })
    .from(codingSessionReports)
    .$dynamic();
  if (opts.projectId) {
    q.where(eq(codingSessionReports.projectId, opts.projectId));
  }
  const rows = await q
    .orderBy(desc(codingSessionReports.endedAt))
    .limit(limit);
  return rows;
}

// Re-export so callers don't need to know the underlying ORM shape.
export type { CodingSessionReport };
