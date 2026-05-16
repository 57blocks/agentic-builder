# Model Scorecard — This Session

- **Session**: `e2174db1-2f7a-4cc0-a3f9-c85b8ad34d82`
- **Generated at**: 2026-05-15T06:21:12.994Z
- **Session composite**: **85.8 (B)**
- **Top model**: `anthropic/claude-4-sonnet-20250522`
- **Weakest model**: `deepseek/deepseek-v4-pro-20260423`

> Scores are weighted composites across 6 dimensions: correctness (35%), taskSuccess (25%), efficiency (15%), robustness (10%), cost (10%), speed (5%). Higher is better.

## Stage `generate_api_contracts`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `anthropic/claude-4-sonnet-20250522` | - | **89.5 (B)** | 100 | 60 | 100 | 95 | 100 | 100 | 1 | 12.5k | $0.0000 | 

**`anthropic/claude-4-sonnet-20250522` reasons**:
- 1 truncation event(s) during this run.

## Stage `phase_verify_fix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | primary | **86.9 (B)** | 100 | 60 | 100 | 95 | 100 | 49 | 88 | 3.5M | $0.0000 | 

**`deepseek/deepseek-v4-pro-20260423` reasons**:
- 1 truncation event(s) during this run.
- Speed 20182ms/call is 2.5× slower than the fastest model.

## Stage `tdd_test_writer`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | - | **89.5 (B)** | 100 | 60 | 100 | 95 | 100 | 100 | 10 | 83.5k | $0.0000 | 

**`deepseek/deepseek-v4-pro-20260423` reasons**:
- 1 truncation event(s) during this run.

## Stage `worker_codefix`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | - | **84.5 (B)** | 100 | 60 | 100 | 95 | 100 | 0 | 9 | 87.7k | $0.0000 | 

**`deepseek/deepseek-v4-pro-20260423` reasons**:
- 1 truncation event(s) during this run.
- Speed 663240ms/call is 83.2× slower than the fastest model.

## Stage `worker_codegen`

| Model | Role | Score | Correct | TaskSuc | Efficient | Robust | Cost | Speed | Calls | Tokens | $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
 | `deepseek/deepseek-v4-pro-20260423` | primary | **84.5 (B)** | 100 | 60 | 100 | 95 | 100 | 0 | 73 | 3.0M | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | fallback | **84.5 (B)** | 100 | 60 | 100 | 95 | 100 | 0 | 2 | 87.8k | $0.2916 | 

**`deepseek/deepseek-v4-pro-20260423` reasons**:
- 1 truncation event(s) during this run.
- Speed 89854ms/call is 11.3× slower than the fastest model.

**`openai/gpt-5.3-codex-20260224` reasons**:
- 1 truncation event(s) during this run.
- Speed 693908ms/call is 87.1× slower than the fastest model.

## Session gate context

- Tasks: 9/15 completed, 0 warnings, 0 failed
- Gates: integration=skipped, runtime=skipped, e2e=skipped
- Audit: passed (uncovered requirements: 0)
- Fix loops: scaffold=0, integration=0; truncations=1, stagnations=0, fallbacks=0

## Model Score History (cross-session)

> Each row shows a model's full score history across sessions for that stage. Newest scores are on the right. ↑ = improving, ↓ = declining.

### Stage `extract_real_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 5 | **68.0** | 64 → 75 → 64 → 74 → 64 | ↑ | $0.0465 | 
 | `anthropic/claude-4-sonnet-20250522` | 1 | **62.7** | 63 | — | $0.0000 | 

### Stage `generate_api_contracts`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`anthropic/claude-4-sonnet-20250522`** ← this session | 7 | **70.3** | 64 → 63 → 75 → 64 → 74 → 64 → 90 | ↑ | $0.0000 | 

### Stage `integration_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | `openai/gpt-5.3-codex-20260224` | 5 | **55.5** | 54 → 51 → 65 → 54 → 54 | ↑ | $1.0927 | 

### Stage `phase_verify_fix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek/deepseek-v4-pro-20260423`** ← this session | 1 | **86.9** | 87 | — | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | 6 | **53.9** | 49 → 53 → 60 → 49 → 64 → 50 | ↑ | $1.7757 | 

### Stage `tdd_test_writer`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek/deepseek-v4-pro-20260423`** ← this session | 1 | **89.5** | 90 | — | $0.0000 | 

### Stage `worker_codefix`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek/deepseek-v4-pro-20260423`** ← this session | 1 | **84.5** | 85 | — | $0.0000 | 
 | `openai/gpt-5.3-codex-20260224` | 7 | **58.5** | 49 → 63 → 60 → 49 → 59 → 57 → 74 | ↑ | $0.1819 | 

### Stage `worker_codegen`

| Model | Runs | Avg score | Score history | Trend | Avg cost |
|---|---|---|---|---|---|
 | **`deepseek/deepseek-v4-pro-20260423`** ← this session | 3 | **70.5** | 59 → 69 → 85 | ↑ | $0.0000 | 
 | **`openai/gpt-5.3-codex-20260224`** ← this session | 4 | **59.8** | 49 → 48 → 59 → 85 | ↑ | $0.4843 | 
