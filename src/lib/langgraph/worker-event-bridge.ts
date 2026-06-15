/**
 * Session-keyed bridge that lets the worker sub-graph stream chunks back into
 * the outer LangGraph SSE pipeline.
 *
 * Why this exists:
 *   `parallelWorkerNode` in supervisor.ts calls `workerGraph.invoke(...)`
 *   synchronously, which means the worker sub-graph's intermediate events
 *   (`pick_next_task`, `generate_code`, `task_done`, …) never reach the outer
 *   `graph.stream(..., { subgraphs: true })` consumer in coding/route.ts. The
 *   UI therefore never receives `agent_task_start` / `agent_task_complete`
 *   events and a successfully-running task stays "pending" forever in the
 *   picker view.
 *
 *   This module gives `invokeWorkerBatched` a side-channel into the coding
 *   route's `send` pipe. The route registers a sink at session start; the
 *   worker forwards every sub-graph chunk through it; the route's existing
 *   `mapper.mapChunk` translates those into the same SSE events as the
 *   primary stream loop.
 *
 *   The sink is removed in the route's finally{}, so a stale sink can't leak
 *   into a later session.
 */
export type WorkerChunkSink = (
  chunk: [string[], Record<string, unknown>],
) => void;

const sinks = new Map<string, WorkerChunkSink>();

export function registerWorkerChunkSink(
  sessionId: string,
  sink: WorkerChunkSink,
): void {
  if (!sessionId) return;
  sinks.set(sessionId, sink);
}

export function unregisterWorkerChunkSink(sessionId: string): void {
  if (!sessionId) return;
  sinks.delete(sessionId);
}

export function getWorkerChunkSink(
  sessionId: string,
): WorkerChunkSink | undefined {
  if (!sessionId) return undefined;
  return sinks.get(sessionId);
}
