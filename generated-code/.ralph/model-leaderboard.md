# Model Leaderboard (project)

- Generated at: 2026-05-15T06:21:12.996Z
- Rows aggregated: 15

> Compares models that have been used across sessions. Scores are simple means; trend column shows the most recent runs in time order (newest last).

## Stage `extract_real_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 5 | **68.0** | 50.0% | $0.0465 | $0.0495 | 0ms | 64 → 75 → 64 → 74 → 64 | 2026-05-07 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 45.0% | $0.0000 | $0.0000 | 0ms | 63 | 2026-04-27 | 

**Head-to-head — `openai/gpt-5.3-codex-20260224` vs `anthropic/claude-4-sonnet-20250522`**:
- Score: 68.0 vs 62.7 (Δ +5.3)
- Cost:  $0.0465 vs $0.0000 (Δ +$0.0465)
- Speed: 0ms vs 0ms/call (≈ equal)

## Stage `generate_api_contracts`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | 7 | **70.3** | 56.4% | $0.0000 | $0.0000 | 0ms | 64 → 63 → 75 → 64 → 74 → 64 → 90 | 2026-05-15 | 

## Stage `integration_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 5 | **55.5** | 50.0% | $1.0927 | $0.9613 | 6981ms | 54 → 51 → 65 → 54 → 54 | 2026-05-07 | 

## Stage `phase_verify_fix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | 1 | **86.9** | 100.0% | $0.0000 | $0.0000 | 20182ms | 87 | 2026-05-15 | 
 | `deepseek/deepseek-v3.2-20251201` | 1 | **70.4** | 45.0% | $0.0000 | $0.0000 | 15689ms | 70 | 2026-04-29 | 
 | `openai/gpt-5.3-codex-20260224` | 6 | **53.9** | 49.2% | $1.7757 | $2.2849 | 33304ms | 49 → 53 → 60 → 49 → 64 → 50 | 2026-05-07 | 

**Head-to-head — `deepseek/deepseek-v4-pro-20260423` vs `deepseek/deepseek-v3.2-20251201`**:
- Score: 86.9 vs 70.4 (Δ +16.5)
- Cost:  $0.0000 vs $0.0000 (≈ equal)
- Speed: 20182ms vs 15689ms/call (Δ +4493ms)

## Stage `tdd_test_writer`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | 1 | **89.5** | 100.0% | $0.0000 | $0.0000 | 7969ms | 90 | 2026-05-15 | 

## Stage `worker_codefix`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | 1 | **84.5** | 100.0% | $0.0000 | $0.0000 | 663240ms | 85 | 2026-05-15 | 
 | `deepseek/deepseek-v3.2-20251201` | 1 | **68.5** | 45.0% | $0.0000 | $0.0000 | 42492ms | 69 | 2026-04-29 | 
 | `openai/gpt-5.3-codex-20260224` | 7 | **58.5** | 56.4% | $0.1819 | $0.1954 | 974278ms | 49 → 63 → 60 → 49 → 59 → 57 → 74 | 2026-05-09 | 

**Head-to-head — `deepseek/deepseek-v4-pro-20260423` vs `deepseek/deepseek-v3.2-20251201`**:
- Score: 84.5 vs 68.5 (Δ +16.0)
- Cost:  $0.0000 vs $0.0000 (≈ equal)
- Speed: 663240ms vs 42492ms/call (Δ +620748ms)

## Stage `worker_codegen`

| Model | Runs | Avg Score | Success % | Avg Cost | Median Cost | Avg ms/call | Trend | Last seen |
|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | 3 | **70.5** | 63.3% | $0.0000 | $0.0000 | 97571ms | 59 → 69 → 85 | 2026-05-15 | 
 | `deepseek/deepseek-v3.2-20251201` | 1 | **68.5** | 45.0% | $0.0000 | $0.0000 | 100971ms | 69 | 2026-04-29 | 
 | `deepseek-v4-pro` | 6 | **65.8** | 67.5% | $0.0000 | $0.0000 | 33280ms | 58 → 70 → 59 → 75 → 59 → 74 | 2026-05-09 | 
 | `openai/gpt-5.3-codex-20260224` | 4 | **59.8** | 58.8% | $0.4843 | $0.3372 | 702302ms | 49 → 48 → 59 → 85 | 2026-05-15 | 

**Head-to-head — `deepseek/deepseek-v4-pro-20260423` vs `deepseek/deepseek-v3.2-20251201`**:
- Score: 70.5 vs 68.5 (Δ +2.0)
- Cost:  $0.0000 vs $0.0000 (≈ equal)
- Speed: 97571ms vs 100971ms/call (Δ -3400ms)
