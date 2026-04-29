# Model Scorecard — This Session

- **Session**: `dfdf2753-a3eb-428e-9e78-d08982d8163f`
- **Generated at**: 2026-04-29T06:50:35.706Z
- **Session composite**: **58 (F)**
- **Top model**: `openai/gpt-5.3-codex-20260224`
- **Weakest model**: `openai/gpt-5.3-codex-20260224`

> Scores are weighted composites across 6 dimensions: correctness (35%), taskSuccess (25%), efficiency (15%), robustness (10%), cost (10%), speed (5%). Higher is better.

## Stage `extract_real_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **64.2 (D)** | 45 | 100 | 23 | 50 | 100 | 100 | 1 | 10.7k | $0.0563 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Stage `generate_api_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | - | **64.2 (D)** | 45 | 100 | 23 | 50 | 100 | 100 | 1 | 9.6k | $0.0000 | 

**`anthropic/claude-4-sonnet-20250522` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Stage `integration_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **54.2 (F)** | 45 | 100 | 23 | 50 | 0 | 100 | 49 | 793.4k | $1.5955 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Stage `phase_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **49.2 (F)** | 45 | 100 | 23 | 50 | 0 | 0 | 100 | 1.2M | $2.3143 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Stage `worker_codefix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **49.2 (F)** | 45 | 100 | 23 | 50 | 0 | 0 | 7 | 40.5k | $0.3122 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Stage `worker_codegen`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek-v4-pro` | primary | **59.2 (F)** | 45 | 100 | 23 | 50 | 100 | 0 | 228 | 11.2M | $0.0000 | 

**`deepseek-v4-pro` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 49 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 2 fallback(s).

## Session gate context

- Tasks: 25/25 completed, 0 warnings, 0 failed
- Gates: integration=fail, runtime=skipped, e2e=fail
- Audit: passed (uncovered requirements: 0)
- Fix loops: scaffold=50, integration=49; truncations=2, stagnations=12, fallbacks=2

## Model Score History (cross-session)

> Each row shows a model's full score history across sessions for that stage. Newest scores are on the right. ↑ = improving, ↓ = declining.

### Stage `extract_real_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 3 | **67.5** | 64 → 75 → 64 | ↑ | $0.0524 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 63 | — | $0.0000 | 

### Stage `generate_api_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`anthropic/claude-4-sonnet-20250522`** ← this session | 4 | **66.3** | 64 → 63 → 75 → 64 | ↑ | $0.0000 | 

### Stage `integration_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 4 | **55.9** | 54 → 51 → 65 → 54 | ↑ | $1.1255 | 

### Stage `phase_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 4 | **52.5** | 49 → 53 → 60 → 49 | ↑ | $1.7844 | 

### Stage `worker_codefix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 4 | **55.0** | 49 → 63 → 60 → 49 | ↑ | $0.2077 | 

### Stage `worker_codegen`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek-v4-pro`** ← this session | 3 | **62.2** | 58 → 70 → 59 | ↑ | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | 2 | **48.1** | 49 → 48 | ↓ | $0.7632 | 
