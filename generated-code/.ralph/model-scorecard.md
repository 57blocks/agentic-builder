# Model Scorecard — This Session

- **Session**: `52851b86-63eb-4e90-a9c2-5f99fe94a9bd`
- **Generated at**: 2026-04-28T12:45:11.134Z
- **Session composite**: **68.4 (D)**
- **Top model**: `openai/gpt-5.3-codex-20260224`
- **Weakest model**: `openai/gpt-5.3-codex-20260224`

> Scores are weighted composites across 6 dimensions: correctness (35%), taskSuccess (25%), efficiency (15%), robustness (10%), cost (10%), speed (5%). Higher is better.

## Stage `extract_real_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **74.8 (C)** | 70 | 100 | 35 | 50 | 100 | 100 | 1 | 8.9k | $0.0495 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Stage `generate_api_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | - | **74.8 (C)** | 70 | 100 | 35 | 50 | 100 | 100 | 1 | 14.6k | $0.0000 | 

**`anthropic/claude-4-sonnet-20250522` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Stage `integration_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **64.8 (D)** | 70 | 100 | 35 | 50 | 0 | 100 | 45 | 719.7k | $1.4047 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Stage `phase_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **59.8 (F)** | 70 | 100 | 35 | 50 | 0 | 0 | 100 | 1.3M | $2.4390 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Stage `worker_codefix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **59.8 (F)** | 70 | 100 | 35 | 50 | 0 | 0 | 6 | 33.9k | $0.1954 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Stage `worker_codegen`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek-v4-pro` | primary | **69.8 (D)** | 70 | 100 | 35 | 50 | 100 | 0 | 198 | 9.9M | $0.0000 | 

**`deepseek-v4-pro` reasons**:
- Integration gate failed.
- Integration fix loop burned 45 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- 2 truncation event(s) during this run.
- 13 stagnation event(s) during this run.

## Session gate context

- Tasks: 20/20 completed, 0 warnings, 0 failed
- Gates: integration=fail, runtime=skipped, e2e=skipped
- Audit: passed (uncovered requirements: 0)
- Fix loops: scaffold=50, integration=45; truncations=2, stagnations=13, fallbacks=0

## Model Score History (cross-session)

> Each row shows a model's full score history across sessions for that stage. Newest scores are on the right. ↑ = improving, ↓ = declining.

### Stage `extract_real_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 2 | **69.2** | 64 → 75 | ↑ | $0.0505 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 63 | — | $0.0000 | 

### Stage `generate_api_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`anthropic/claude-4-sonnet-20250522`** ← this session | 3 | **67.0** | 64 → 63 → 75 | ↑ | $0.0000 | 

### Stage `integration_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 3 | **56.5** | 54 → 51 → 65 | ↑ | $0.9689 | 

### Stage `phase_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 3 | **53.7** | 49 → 53 → 60 | ↑ | $1.6078 | 

### Stage `worker_codefix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 3 | **57.0** | 49 → 63 → 60 | ↑ | $0.1729 | 

### Stage `worker_codegen`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek-v4-pro`** ← this session | 2 | **63.8** | 58 → 70 | ↑ | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | 2 | **48.1** | 49 → 48 | ↓ | $0.7632 | 
