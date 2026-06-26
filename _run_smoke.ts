import { runRuntimeSmokeGate } from "@/lib/pipeline/self-heal/runtime-smoke-gate";

(async () => {
  const res = await runRuntimeSmokeGate({
    outputDir: "/Users/57block/Desktop/CSMA",
    sessionId: "manual-smoke-verify",
    emitter: (e: { event?: string; details?: unknown }) =>
      console.log(`[EVENT] ${e.event} ${JSON.stringify(e.details ?? {}).slice(0, 220)}`),
  } as Parameters<typeof runRuntimeSmokeGate>[0]);
  console.log("\n================ RESULT ================");
  console.log("pass:", res.pass, "| bootFailed:", res.bootFailed, "| port:", res.port);
  console.log("failures:", JSON.stringify(res.failures.map((f) => f.code)));
  console.log("successes:", JSON.stringify(res.successes));
  console.log("probedEndpoints:", JSON.stringify(res.probedEndpoints));
})().catch((e) => {
  console.error("SCRIPT ERROR:", e?.stack ?? e);
  process.exit(1);
});
