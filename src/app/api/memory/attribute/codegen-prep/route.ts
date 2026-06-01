/**
 * POST /api/memory/attribute/codegen-prep
 *
 * Apply downstream-outcome attribution to L1 `prd-pattern` records based on
 * how the project built from each PRD actually turned out (codegen task
 * outcomes + coverage self-heal signals). Complements
 * /api/memory/attribute/preparation, which only learns from the user's
 * verdict on the PRD text.
 *
 * Pull-based + cursor-idempotent: safe to call repeatedly. Aborted/crashed
 * runs are reconciled from their durable partial signals on the next call.
 */

import { NextRequest } from "next/server";

import { reconcileCodegenPrepAttributions } from "@/lib/memory/distill/codegen-prep-reconcile";

export const maxDuration = 60;

interface RequestBody {
  /** L2 project root (generated-code output dir). Defaults to "generated-code". */
  projectRoot?: string;
  l1Root?: string;
  deltaSuccess?: number;
  deltaFailure?: number;
  dryRun?: boolean;
  resetCursor?: boolean;
}

export async function POST(req: NextRequest) {
  let body: RequestBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as RequestBody;
  } catch {
    body = {};
  }

  try {
    const result = await reconcileCodegenPrepAttributions({
      projectRoot:
        typeof body.projectRoot === "string" && body.projectRoot.trim()
          ? body.projectRoot
          : "generated-code",
      l1Root: body.l1Root,
      deltaSuccess: body.deltaSuccess,
      deltaFailure: body.deltaFailure,
      dryRun: body.dryRun === true,
      resetCursor: body.resetCursor === true,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
