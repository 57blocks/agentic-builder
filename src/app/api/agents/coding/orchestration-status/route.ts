/**
 * GET /api/agents/coding/orchestration-status
 *
 * Lets the UI resolve a subsystem build's outcome after its SSE stream dropped
 * (the orchestration keeps running server-side). Returns the durable
 * orchestration status plus the latest session checkpoint (per-task statuses)
 * so the store can rehydrate progress and detect completion without the stream.
 */

import { NextResponse } from "next/server";
import { readOrchestrationStatus } from "@/lib/pipeline/orchestration-status";
import { readSessionCheckpoint } from "@/lib/pipeline/session-checkpoint";

export async function GET() {
  const [status, checkpoint] = await Promise.all([
    readOrchestrationStatus(process.cwd()),
    readSessionCheckpoint(process.cwd()),
  ]);
  return NextResponse.json({ status: status ?? null, checkpoint: checkpoint ?? null });
}
