# Model Leaderboard (project)

- Generated at: 2026-04-28T12:45:11.137Z
- Rows aggregated: 9

> Compares models that have been used across sessions. Scores are simple means; trend column shows the most recent runs in time order (newest last).

## Stage `extract_real_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 2 | **69.2** | 57.5% | $0.0505 | $0.0505 | 0ms | 64 → 75 | 2026-04-28 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 45.0% | $0.0000 | $0.0000 | 0ms | 63 | 2026-04-27 | 

**Head-to-head — `openai/gpt-5.3-codex-20260224` vs `anthropic/claude-4-sonnet-20250522`**:
- Score: 69.2 vs 62.7 (Δ +6.5)
- Cost:  $0.0505 vs $0.0000 (Δ +$0.0505)
- Speed: 0ms vs 0ms/call (≈ equal)

## Stage `generate_api_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | 3 | **67.0** | 53.3% | $0.0000 | $0.0000 | 0ms | 64 → 63 → 75 | 2026-04-28 | 

## Stage `integration_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 3 | **56.5** | 53.3% | $0.9689 | $0.7981 | 6868ms | 54 → 51 → 65 | 2026-04-28 | 

## Stage `phase_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 3 | **53.7** | 53.3% | $1.6078 | $2.2555 | 38439ms | 49 → 53 → 60 | 2026-04-28 | 

## Stage `worker_codefix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 3 | **57.0** | 53.3% | $0.1729 | $0.1954 | 1002395ms | 49 → 63 → 60 | 2026-04-28 | 

## Stage `worker_codegen`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek-v4-pro` | 2 | **63.8** | 57.5% | $0.0000 | $0.0000 | 33311ms | 58 → 70 | 2026-04-28 | 
 | `deepseek/deepseek-v4-pro-20260423` | 1 | **58.5** | 45.0% | $0.0000 | $0.0000 | 143970ms | 59 | 2026-04-27 | 
 | `openai/gpt-5.3-codex-20260224` | 2 | **48.1** | 45.0% | $0.7632 | $0.7632 | 281134ms | 49 → 48 | 2026-04-27 | 

**Head-to-head — `deepseek-v4-pro` vs `deepseek/deepseek-v4-pro-20260423`**:
- Score: 63.8 vs 58.5 (Δ +5.3)
- Cost:  $0.0000 vs $0.0000 (≈ equal)
- Speed: 33311ms vs 143970ms/call (Δ -110659ms)
