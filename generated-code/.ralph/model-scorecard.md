# Model Scorecard — This Session

- **Session**: `77db6cd6-d801-4b91-9526-4092d5c61532`
- **Generated at**: 2026-05-07T08:18:05.977Z
- **Session composite**: **56.7 (F)**
- **Top model**: `openai/gpt-5.3-codex-20260224`
- **Weakest model**: `openai/gpt-5.3-codex-20260224`

> Scores are weighted composites across 6 dimensions: correctness (35%), taskSuccess (25%), efficiency (15%), robustness (10%), cost (10%), speed (5%). Higher is better.

## Stage `extract_real_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **63.8 (D)** | 45 | 100 | 20 | 50 | 100 | 100 | 1 | 9.4k | $0.0428 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Stage `generate_api_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | - | **63.8 (D)** | 45 | 100 | 20 | 50 | 100 | 100 | 1 | 8.9k | $0.0000 | 

**`anthropic/claude-4-sonnet-20250522` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Stage `integration_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **53.8 (F)** | 45 | 100 | 20 | 50 | 0 | 100 | 34 | 485.0k | $0.9613 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Stage `phase_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | primary | **49.8 (F)** | 45 | 100 | 20 | 50 | 0 | 21 | 100 | 1.2M | $2.3390 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Stage `worker_codefix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | - | **56.6 (F)** | 45 | 100 | 20 | 50 | 78 | 0 | 3 | 15.4k | $0.0616 | 

**`openai/gpt-5.3-codex-20260224` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Stage `worker_codegen`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek-v4-pro` | primary | **58.8 (F)** | 45 | 100 | 20 | 50 | 100 | 0 | 135 | 4.7M | $0.0000 | 

**`deepseek-v4-pro` reasons**:
- Integration gate failed.
- E2E gate failed.
- Integration fix loop burned 34 iteration(s).
- Scaffold fix loop burned 50 iteration(s).
- Primary-model failures triggered 3 fallback(s).

## Session gate context

- Tasks: 11/11 completed, 0 warnings, 0 failed
- Gates: integration=fail, runtime=skipped, e2e=fail
- Audit: passed (uncovered requirements: 0)
- Fix loops: scaffold=50, integration=34; truncations=2, stagnations=10, fallbacks=3

## Model Score History (cross-session)

> Each row shows a model's full score history across sessions for that stage. Newest scores are on the right. ↑ = improving, ↓ = declining.

### Stage `extract_real_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 5 | **68.0** | 64 → 75 → 64 → 74 → 64 | ↑ | $0.0465 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 63 | — | $0.0000 | 

### Stage `generate_api_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`anthropic/claude-4-sonnet-20250522`** ← this session | 6 | **67.1** | 64 → 63 → 75 → 64 → 74 → 64 | ↑ | $0.0000 | 

### Stage `integration_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 5 | **55.5** | 54 → 51 → 65 → 54 → 54 | ↑ | $1.0927 | 

### Stage `phase_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 6 | **53.9** | 49 → 53 → 60 → 49 → 64 → 50 | ↑ | $1.7757 | 

### Stage `worker_codefix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 6 | **55.9** | 49 → 63 → 60 → 49 → 59 → 57 | ↑ | $0.2072 | 

### Stage `worker_codegen`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek-v4-pro`** ← this session | 5 | **64.1** | 58 → 70 → 59 → 75 → 59 | ↑ | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | 3 | **51.6** | 49 → 48 → 59 | ↑ | $0.5485 | 
