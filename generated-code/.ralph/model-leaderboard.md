# Model Leaderboard (project)

- Generated at: 2026-04-29T06:50:35.709Z
- Rows aggregated: 9

> Compares models that have been used across sessions. Scores are simple means; trend column shows the most recent runs in time order (newest last).

## Stage `extract_real_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 3 | **67.5** | 53.3% | $0.0524 | $0.0514 | 0ms | 64 → 75 → 64 | 2026-04-29 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 45.0% | $0.0000 | $0.0000 | 0ms | 63 | 2026-04-27 | 

**Head-to-head — `openai/gpt-5.3-codex-20260224` vs `anthropic/claude-4-sonnet-20250522`**:
- Score: 67.5 vs 62.7 (Δ +4.8)
- Cost:  $0.0524 vs $0.0000 (Δ +$0.0524)
- Speed: 0ms vs 0ms/call (≈ equal)

## Stage `generate_api_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | 4 | **66.3** | 51.3% | $0.0000 | $0.0000 | 0ms | 64 → 63 → 75 → 64 | 2026-04-29 | 

## Stage `integration_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 4 | **55.9** | 51.3% | $1.1255 | $1.1014 | 6874ms | 54 → 51 → 65 → 54 | 2026-04-29 | 

## Stage `phase_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 4 | **52.5** | 51.3% | $1.7844 | $2.2849 | 42364ms | 49 → 53 → 60 → 49 | 2026-04-29 | 

## Stage `worker_codefix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 4 | **55.0** | 51.3% | $0.2077 | $0.2467 | 1087421ms | 49 → 63 → 60 → 49 | 2026-04-29 | 

## Stage `worker_codegen`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek-v4-pro` | 3 | **62.2** | 53.3% | $0.0000 | $0.0000 | 37235ms | 58 → 70 → 59 | 2026-04-29 | 
 | `deepseek/deepseek-v4-pro-20260423` | 1 | **58.5** | 45.0% | $0.0000 | $0.0000 | 143970ms | 59 | 2026-04-27 | 
 | `openai/gpt-5.3-codex-20260224` | 2 | **48.1** | 45.0% | $0.7632 | $0.7632 | 281134ms | 49 → 48 | 2026-04-27 | 

**Head-to-head — `deepseek-v4-pro` vs `deepseek/deepseek-v4-pro-20260423`**:
- Score: 62.2 vs 58.5 (Δ +3.7)
- Cost:  $0.0000 vs $0.0000 (≈ equal)
- Speed: 37235ms vs 143970ms/call (Δ -106735ms)
