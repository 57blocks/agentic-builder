# role-prompts.ts 改动前后对比报告

**归档日期**:2026-06-11
**改动文件**:[src/lib/langgraph/role-prompts.ts](src/lib/langgraph/role-prompts.ts)
**改动范围**:Compass Engineering skill 库回填,新增 9 条 always-on 规则 + 3 条 conditional 规则 + frontend 内联补充(four-state rendering / cancellable fetches / semantic elements)+ `hasPayment` 谓词。改动行数 +196 / -3,文件由 717 行扩到 909 行。

---

## 1. 会话基本信息

| 字段 | Before(改动前) | After(改动后) |
|---|---|---|
| Session ID | `40edeed5-5dec-42b8-8be9-0883d1c5fe52` | `ede29290-f4dc-4ac5-8210-351f30d59ed7` |
| Generator git | `bc4542f` | `284101e` + 未提交的 role-prompts.ts 改动 |
| Started at | 2026-06-11T00:44:48.774Z | 2026-06-11T02:39:43.567Z |
| Ended at | 2026-06-11T02:15:11.209Z | 2026-06-11T04:37:55.557Z |
| Total duration | 90m 22s | 118m 12s |
| Status | **FAIL** | **FAIL** |

两次跑的均是同一个前端 ToDo 项目(同样的 PRD、同样的 F-01–F-05 需求,无后端、无 auth、无 payment、无 background-jobs)。

---

## 2. 核心指标并排对比

| 指标 | Before | After | Δ | 评述 |
|---|---:|---:|---:|---|
| **Overall score** | 71/100 (C) | 73/100 (C) | **+2** | 边际正向,大概率在噪声范围 |
| Status | FAIL | FAIL | 同 | 同样卡 |
| **Final usability** | 49/100 (F) | 55/100 (F) | **+6** | 改动方向上最大的正向信号 |
| **Generated baseline** | 32/100 (F) | 36/100 (F) | **+4** | "初稿质量",最贴近 prompt 的影响 |
| Code Quality | 93/100 (A) | 92/100 (A) | -1 | 噪声 |
| Requirement coverage | 100 (A) | 100 (A) | 同 | — |
| First-Pass Success | 100 (A) | 100 (A) | 同 | — |
| Session health | 42 (F) | 42 (F) | 同 | — |
| Repair burden | 0 (F) | 0 (F) | 同 | — |
| Evidence completeness | 85 (B) | 85 (B) | 同 | — |
| Cost/speed | 75 (C) | 75 (C) | 同 | — |
| **TDD RED evidence** | **0/4** | **4/4** | **+4** | 大幅改善,但**几乎与本次改动无关** |
| **Duration** | 90m 22s | **118m 12s** | **+28m (+31%)** | 显著变慢 |
| **LLM calls** | 203 | **270** | **+67 (+33%)** | 显著上升 |
| **Total tokens** | 5,615,952 | **6,710,205** | **+1,094,253 (+19.5%)** | 显著上升 |
| **Integration fix iters** | 85 | **142** | **+57 (+67%)** | 接近翻倍 |
| **Stagnation warnings** | 19 | **46** | **+27 (+142%)** | 接近翻三倍 |
| **doc_truncated** | 4 | 5 | +1 | 上下文预算预警 |
| **Total LoC** | 9,590 | **32,807** | **3.4×** | 异常 |
| Files generated | 71 | 86 | +15 | 一致变多 |
| Backend endpoints | 0 | 0 | 同 | 项目本就无后端 |
| Test files | 9 | 8 | -1 | 噪声 |
| Scaffold fix attempts | 10 | 12 | +2 | 噪声 |
| Repair events total | 331 | 393 | +62 | 修复事件变多 |

---

## 3. 失败原因对比

### Before(`40edeed5`)

> Integration verify gate failed.
> Deadlock: run_validation_suite passes all gates (frontend_tsc, frontend_build, backend_tsc, backend_smoke, tdd_green=4/4), tdd_evidence shows greenPassed=4, p0BlockingFailures=[], missingGreenEvidence=[], but report_done(pass) is rejected with "TDD hard gate still red - no GREEN evidence for TDD-T-001-001, TDD-T-002-001". All 34 tests pass. Cannot resolve the discrepancy between the validation suite and the hard gate check.
>
> E2E verify gate failed.
> No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

### After(`ede29290`)

> Timeout/terminated: Integration verify gate failed.
> Human decision timed out (5 min); aborting integration fix.
> No mutation for 14 consecutive iteration(s).
> Dynamic stagnation threshold: abortAt=10, progressScore=0/6.
>
> E2E verify gate failed.
> No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

**两次失败的本质**:
- Integration:Before 是 orchestrator 死锁(validation suite 全过但 hard gate 仍拒),After 是真正的 stagnation 超时(14 次迭代无 mutation,被动态阈值终结)。**两种都不是 role-prompts.ts 能修复的**,前者是 orchestrator bug,后者是 integration_verify_fix 阶段的 prompt + 策略问题(对应报告里 §7.2 / §7.4)。
- E2E:**完全相同** —— 缺 Playwright config 和 package.json 的 e2e 脚本。这是 architect 阶段的产物,本次改动没有触及 architect prompt。

---

## 4. 因果归因

### 大概率与改动有关

| 信号 | 解读 |
|---|---|
| **Generated baseline 32 → 36 (+4)** | 估算的"初稿质量",最直接反映 worker 系统 prompt。本项目实际生效的规则:`TS_HYGIENE_RULE`、`FE_SECURITY_RULE`、`FORM_VALIDATION_RULE`、`DATETIME_FRONTEND_RULE`、four-state rendering、cancellable fetches、semantic elements。+4 与改动方向吻合。 |
| **Final usability 49 → 55 (+6)** | baseline 上升传导到 usability。可信但不强。 |
| **代码量 9,590 → 32,807 LoC(3.4×)** | 新规则鼓励防御性代码(每个 fetch 加 `AbortController`、每个组件加四态分支、每个 form 加 Zod schema、每个时间显示走 `Intl.DateTimeFormat`)。预期内的副作用。 |
| **doc_truncated 4 → 5**、**stagnation 19 → 46**、**integration iters 85 → 142**、**duration +28m** | 上下文预算从 ~67% 占用上升到 ~80% 的直接代价:关键 PRD 段更易被裁 → worker 反复读相同文件却不写 → 触发 stagnation → 整合修复死循环。**改动前已预警**。 |

### 几乎肯定与改动无关

| 信号 | 解读 |
|---|---|
| **TDD RED evidence 0/4 → 4/4** | role-prompts.ts **不**负责 TDD evidence 采集,采集发生在 supervisor / agent-subgraph 的 `tdd_test_writer` 阶段。两次跑的 RED command 不同(`pnpm test run` vs `npx vitest run`),更像是 commit 284101e(worker indicator 修复)的副作用或 LLM 随机性。 |
| **Before 的 "deadlock"** | orchestrator 真实 bug:validation suite 全过但 `report_done(pass)` 被硬 gate 拒。与 prompt 内容无关。 |
| **E2E gate FAIL** | 缺 Playwright config / package.json 脚本。这是 architect 阶段产物,本次没动 architect prompt。两次都失败,无变化。 |

### 噪声范围

Code Quality 93 → 92、Test files 9 → 8、Scaffold fix 10 → 12、Repair score 同为 0、Health 同 42 —— 单次 A/B 对比下,±1~2 都可能是随机。

---

## 5. 关键发现

### Finding 1:overall +2 在单次比对下大概率是噪声

要确认改动是否真正有效,**至少需要 N=3–5 的 A/B 对取均值**,看 baseline / usability 的均值有没有稳定 +4 以上。一次对比不出结论。

### Finding 2:本次失败的两个根因都不在 role-prompts.ts 的射程

- Integration 卡(deadlock → stagnation timeout):报告 Recommended #1 / #2 明确指向 §7.2 / §7.3 / §7.4,**都在 [supervisor.ts](src/lib/langgraph/supervisor.ts) 的 integration-fix 流程**,不在 role-prompts.ts。
- E2E 缺 Playwright config:在 architect 阶段。
- **改动的目标和本次失败的瓶颈不在同一条因果链上。**

### Finding 3:本项目对新规则的利用率很低

本项目无后端、无 auth、无 payment、无 bg-jobs。我加的 12 条规则里:

| 规则 | 在本次跑中是否生效 |
|---|---|
| `INPUT_SAFETY_RULE` | ❌ 空跑(无后端) |
| `API_DESIGN_RULE` | ❌ 空跑 |
| `DB_ACCESS_RULE` | ❌ 空跑 |
| `OBSERVABILITY_RULE` | ❌ 空跑 |
| `DATETIME_BACKEND_RULE` | ❌ 空跑 |
| `AUTH_HARDENING_RULE` | ❌ 不触发(无 auth scaffold) |
| `PAYMENT_INTEGRATION_RULE` | ❌ 不触发 |
| `RATE_LIMIT_IDEMPOTENCY_RULE` | ❌ 不触发 |
| `DATETIME_FRONTEND_RULE` | ✅ 生效 |
| `FE_SECURITY_RULE` | ✅ 生效 |
| `TS_HYGIENE_RULE` | ✅ 生效 |
| `FORM_VALIDATION_RULE` | ✅ 生效 |
| 内联:four-state rendering / cancellable fetches / semantic elements | ✅ 生效 |

**5/9 always-on 规则在本次跑中是纯成本**(吃了系统 prompt 字符预算,贡献了 doc_truncated 增加 1 次)。

### Finding 4:代码量 3.4× 不是好事

同样一个 ToDo,从 9,590 行膨胀到 32,807 行,带来:
- 更多代码 → 更多潜在 integration 错位
- 更多代码 → `relevantFilesContext` 拉得更多 → 更容易触发 truncation
- 更多代码 → integration_verify_fix 要读更多文件 → 更慢、更容易 stagnation

142 次 integration fix(Before 85)大概率就是这条链路的体现。

---

## 6. 建议

### P0 立刻做(成本控制)

让对本项目无效的规则真正变成 conditional,不再 always-on:

- `INPUT_SAFETY_RULE`、`API_DESIGN_RULE`、`DB_ACCESS_RULE`、`OBSERVABILITY_RULE`、`DATETIME_BACKEND_RULE` 应**仅当项目有后端时注入**(检测信号:`fs.existsSync(path.join(outputDir, "backend"))` 或 `declaredEnvKeys` 含 DB / API 关键字)。
- 这一改动能把后端无关项目的系统 prompt 砍回接近原来的体量,doc_truncated 应回落,stagnation / integration iters 应同步改善。预计 ~30 行代码。

### P1 跑 N=5 的 A/B 测

跑 5 次"原版" + 5 次"改后",对比 baseline / usability / duration 的均值。单次对比无法判定 ±2 是信号还是噪声。

### P2 不要指望 role-prompts.ts 修复本次的实际失败

两个 blocker 需要分别去改:

- [supervisor.ts](src/lib/langgraph/supervisor.ts) 里 integration_verify_fix 的 prompt + stagnation 策略(对应报告 Recommended #1)
- 让 integration FAIL 不级联 SKIP 掉 runtime / E2E(报告 Recommended #2)
- architect prompt 增加"如果 PRD 含 E2E 需求,必须生成 Playwright config + package.json e2e 脚本"(报告 Recommended #4)

这些和 role-prompts.ts 是两件独立的事。

---

## 7. 一句话总结

本次 role-prompts.ts 改动 **对 generated baseline 有 +4 的边际正向(在噪声范围边缘)**,**对总分有 +2 的微弱正向(大概率噪声)**,**对本次 FAIL 的两个根因(integration 卡死、E2E 缺 config)零贡献**;**代价是运行时间 +31%、tokens +20%、integration 修复迭代 +67%、代码量 3.4×、truncation +1**。**在这个纯前端项目上 ROI 为负**,但部分原因是 9 条 always-on 规则里有 5 条对无后端项目空跑 —— 改成 conditional 后净效果会改善。

---

## 附录 A:改动前完整报告(Session `40edeed5-5dec-42b8-8be9-0883d1c5fe52`)

```
# Coding Session Report

- Session ID: `40edeed5-5dec-42b8-8be9-0883d1c5fe52`
- Status: **FAIL**
- Overall score: **71/100 (C)**
- Code Quality: **93/100 (A)**
  - Static checks: 100/100 (A)
  - Complexity: 80/100 (B)
  - Duplication: 99/100 (A)
  - Type safety: 100/100 (A)
  - Modularity: 100/100 (A)
  - Readability: 85/100 (B)
  - Idiomaticity: 90/100 (A)
  - Architecture: 88/100 (B)
- First-Pass Success: **100/100 (A)**
- Generated baseline: **32/100 (F)**
- Final usability: **49/100 (F)**
- Session health: **42/100 (F)**
- Repair burden: **0/100 (F)**
- Runtime readiness: ✅ CLEAN (0 findings)
- Started at: 2026-06-11T00:44:48.774Z
- Ended at: 2026-06-11T02:15:11.209Z
- Total duration: 90m 22s
- Generator git: `bc4542f`
- Scaffold fix attempts: 10
- Integration fix attempts: 85
- Total LLM calls: 203
- Total LLM tokens: 5615952
- Total LLM cost: $0.0000
- Generated/known files in registry: 71

## Summary
Integration verify gate failed.
Deadlock: run_validation_suite passes all gates (frontend_tsc, frontend_build, backend_tsc, backend_smoke, tdd_green=4/4), tdd_evidence shows greenPassed=4, p0BlockingFailures=[], missingGreenEvidence=[], but report_done(pass) is rejected with "TDD hard gate still red - no GREEN evidence for TDD-T-001-001, TDD-T-002-001". All 34 tests pass. Cannot resolve the discrepancy between the validation suite and the hard gate check.

E2E verify gate failed.
No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

## File Statistics
- Total files generated: **71** (frontend 9, backend 0, other 62)
- Test files: **9**
- Backend API endpoints: **0**
- Total lines of code: **9,590** (frontend 940, backend 0)

## Runtime Readiness
Static §4.2/§4.3/§4.4/§4.5/§4.7 audit of generated source. Findings here mean known runtime pitfalls slipped past the verify-fix worker. Full report: `.ralph/runtime-integration-audit.json`.

✅ **No findings.** All 8 rules either passed or were correctly skipped (see Disabled rules below).

**Disabled rules:**
- `external-id-vs-db-pk` — no auth-* optional scaffold applied — no external user id to resolve.
- `llm-client-abstraction` — no LLM_* bundle declared on resource requirements — abstraction rule N/A.

## Task Outcome
- Completed: 6
- Completed with warnings: 0
- Failed: 0
- Unknown: 0

## Outcome Scoring

The primary score now prioritizes final app usability. Session interruptions and repair churn are still visible, but they no longer dominate the final quality verdict when the app is recoverable.

| Dimension | Weight | Score | Meaning |
| --- | ---: | ---: | --- |
| Generated baseline | info | **32/100 (F)** | Estimated initial quality after discounting repair burden |
| Final usability | 35% | **49/100 (F)** | Final build/runtime/gate state and blocking defects |
| Code Quality | 20% | **93/100 (A)** | Aggregate of 5 machine + 3 LLM judge sub-dimensions |
| Requirement coverage | 15% | **100/100 (A)** | PRD hard/soft coverage after audit |
| First-Pass Success | 10% | **100/100 (A)** | Tasks that completed with zero codefix iterations |
| Evidence completeness | 8% | **85/100 (B)** | Whether validation evidence actually ran |
| Repair burden | 7% | **0/100 (F)** | How much fix-loop/self-heal effort was required |
| Cost/speed | 5% | **75/100 (C)** | Call volume, token volume, and spend |

**Overall formula:** `49x35% + 93x20% + 100x15% + 100x10% + 85x8% + 0x7% + 75x5% = 71`

## Code Quality Audit

Overall: **93/100 (A)**

| Sub-dimension | Score | Notes |
| --- | ---: | --- |
| Static checks (tsc + ESLint) | 100/100 (A) | Score formula: 100 = 100 / No static check findings. |
| Complexity (cyclomatic + LOC) | 80/100 (B) | Score formula: 100 - 20(long-fn:5) = 80 / 5 function(s) longer than threshold (50 lines). |
| Duplication (jscpd) | 99/100 (A) | Score formula: 100 - 1(dup:0.4%) = 99 / Code duplication 0.4%. |
| Type safety (any/ts-ignore/non-null) | 100/100 (A) | Score formula: 100 = 100 / Type safety is clean. |
| Modularity (madge) | 100/100 (A) | Score formula: 100 = 100 / Modularity boundaries clean. |
| Readability (LLM judge) | 85/100 (B) | Code is well-structured with clear naming, comprehensive comments, and logical organization, though some files are quite long. |
| Idiomaticity (LLM judge) | 90/100 (A) | Excellent use of React hooks, TypeScript types, proper event handling, and modern React patterns with portal usage and focus management. |
| Architecture (LLM judge) | 88/100 (B) | Clean separation of concerns with dedicated service layer, custom hooks for state management, and proper component composition, though some coupling between modal states and main component. |

Full audit: `.ralph/code-quality-audit.json`, judge: `.ralph/code-quality-judge.json`

## First-Pass Success
- First-pass rate: 100.0% (6/6)
- Avg fix iterations per task: 0.00
- Formula: 100.0 - 0(extra-iterations) = 100

### Outcome Notes
- **Generated baseline**: Generated baseline estimates initial output quality by discounting final usability with repair burden.
- **Final usability**: Final integration verification still has blocking errors. | E2E verification still has blocking errors. | 2 P0 TDD evidence gap(s) remain.
- **Code Quality**:
- **Requirement coverage**: All hard PRD requirement ids are covered.
- **First-Pass Success**: Avg fix iterations per task: 0.00 | Formula: 100.0 - 0(extra-iterations) = 100
- **Evidence completeness**: Runtime verify did not run.
- **Repair burden**: Integration fix required 84 extra iteration(s). | Scaffold fix required 9 extra iteration(s). | 4 context truncation event(s).
- **Cost/speed**: High LLM call count (203) indicates low iteration efficiency. | Very high token volume (5,615,952).

## Session Health Breakdown

**Formula:** `100 − 20(fail) − 10(integration) − 20(e2e:blocking errors) − 8(trunc:4) = 42`

| Rule | Max deduction | Applied | Reason |
| --- | --- | --- | --- |
| Run status fail | −20 | **-20** ❌ | status=fail |
| Run status aborted | −30 | 0 (not triggered) | status=aborted |
| Integration gate | −10 | **-10** ❌ | integration errors present |
| Runtime gate | −8 | 0 (not triggered) | runtime errors present |
| E2E gate | −20 | **-20** ❌ | e2e errors present (scales with fail ratio) |
| Uncovered requirements | −25 | 0 (not triggered) | PRD requirement ids unresolved |
| Failed tasks | −15 | 0 (not triggered) | coding tasks status=failed |
| Unknown tasks | −10 | 0 (not triggered) | coding tasks status=unknown |
| Context truncation | −8 | **-8** ❌ | doc_truncated events |
| Plan mismatches | −8 | 0 (not triggered) | task_plan_unfulfilled events |
| All tasks done bonus | +5 | 0 (not triggered) | all tasks complete + no blocking gates |

## Model Usage
- `deepseek-v4-pro`: calls=193, cost=$0.0000, tokens=5505226, stages=worker_codegen:Test Engineer, worker_codegen:Frontend Dev, phase_verify_fix, integration_verify_fix
- `deepseek/deepseek-v4-pro-20260423`: calls=10, cost=$0.0000, tokens=110726, stages=tdd_test_writer

## Stage Diagnostics
- `worker-context`: duration=26m 2s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=76/100 (C), models=(none)
  notes=Context was truncated 4 time(s).
- `architect-triage`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `tdd_test_writer`: duration=3m 54s, calls=10, tokens=110726 (prompt=92553, completion=18173), cost=$0.0000, score=100/100 (A), models=deepseek/deepseek-v4-pro-20260423
  notes=No strong negative signal captured.
- `tdd-test-writer`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `tdd-review`: duration=86m 23s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `tdd-runtime`: duration=84m 23s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `worker_codegen`: duration=13m 15s, calls=98, tokens=2581745 (prompt=2522807, completion=58938), cost=$0.0000, score=100/100 (A), models=deepseek-v4-pro
  labels=Test Engineer, Frontend Dev
  notes=No strong negative signal captured.
- `worker-codegen`: duration=13m 13s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `worker-verify`: duration=11m 4s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `task`: duration=11m 4s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `preflight-convention-fix`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `phase_verify_fix`: duration=40s, calls=10, tokens=61528 (prompt=59360, completion=2168), cost=$0.0000, score=90/100 (A), models=deepseek-v4-pro
  notes=Earlier phase verify/fix did not fully prevent later integration failures.
- `preflight-contract-completeness`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `preflight-route-audit`: duration=64m 15s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `integration_verify_fix`: duration=64m 11s, calls=85, tokens=2861953 (prompt=2841559, completion=20394), cost=$0.0000, score=72/100 (C), models=deepseek-v4-pro
  notes=Stage ended with blocking integration errors.
- `integration-gate`: duration=63m 58s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=64/100 (D), models=(none)
  notes=Stagnation warnings triggered 19 time(s).
- `post-gen-audit`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.

## Model Effectiveness
- `deepseek-v4-pro`: score=85.3/100 (B), calls=193, tokens=5505226, cost=$0.0000, stages=worker_codegen, phase_verify_fix, integration_verify_fix
  notes=Earlier phase verify/fix did not fully prevent later integration failures. | Stage ended with blocking integration errors.
- `deepseek/deepseek-v4-pro-20260423`: score=100/100 (A), calls=10, tokens=110726, cost=$0.0000, stages=tdd_test_writer
  notes=No strong negative signal captured.

## Quality Gates
- Integration verify: FAIL (continued)
- Runtime verify: SKIPPED
- E2E verify: FAIL
- Feature audit: PASS

## File-Plan Advisories (predicted-modify left untouched)
_Non-blocking. Planned `modifies` files no task changed — usually fine (the requirement was met via other files), but verify wiring if a feature/endpoint appears missing._

- `frontend/package.json` — T-E2E-001
- `src/App.tsx` — T-003
- `src/components/TaskItem.tsx` — T-004

## TDD Gate
- Manifest: present
- Evidence events: 4
- RED evidence: 0/4
- GREEN passed: 4/4
- Priority coverage: P0 2/2, P1 2/2, P2 0/0
- Reviewer: 3 finding(s), 0 P0 error(s)
- Blocking P0 TDD gaps: TDD-T-001-001, TDD-T-002-001
- Missing RED evidence: TDD-T-001-001, TDD-T-002-001, TDD-T-003-001, TDD-T-004-001

### Integration Errors

Deadlock: run_validation_suite passes all gates (frontend_tsc, frontend_build, backend_tsc, backend_smoke, tdd_green=4/4), tdd_evidence shows greenPassed=4, p0BlockingFailures=[], missingGreenEvidence=[], but report_done(pass) is rejected with "TDD hard gate still red - no GREEN evidence for TDD-T-001-001, TDD-T-002-001". All 34 tests pass. Cannot resolve the discrepancy between the validation suite and the hard gate check.

### E2E Verify Errors

No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

## Feature Audit
- All hard requirement ids are covered.

## Preflight Automation Ledger
### Convention auto-fix
- Invocations: 1 | files rewritten: 0 | unfixable conflicts: 0
### Missing-import installs
- No missing packages needed to be installed during preflight.
### Route registration audit
- Preflight: clean (unregistered=0, dangling=0, missingContracts=0, undeclaredImplemented=0)
- Final: clean (unregistered=0, dangling=0, missingContracts=0, undeclaredImplemented=0)
### Contract completeness audit (ORM-derived)
- Post-generate: not captured.
- Preflight: clean (relationships=0, missingScoped=0)
- Final: clean (relationships=0, missingScoped=0)

## Defect Category Summary

| Category | State | Evidence |
| --- | --- | --- |
| Dependency sync | ✅ PASS | No missing-import installs were needed. |
| Directory / implementation dedup | ✅ PASS | No convention violations needed to be auto-fixed. |
| Env variable alignment | ✅ PASS | No env alignment signal — generator injected DATABASE_URL defaults and no gate flagged env drift. |
| API contract consistency | ✅ PASS | Preflight: 0 unregistered module(s), 0 missing contract endpoint(s), 0 dangling registration import(s). Final gate: 0 unregistered, 0 missing contract, 0 dangling. |
| API contract completeness (ORM-derived) | ✅ PASS | Preflight: 0 relationship(s), 0 missing. Final gate: 0 missing. |
| Build & runtime verification | ❌ FAIL | Integration and runtime gates produced no blocking output. |

## Pipeline Anomalies

| Event | Count | What it means |
| --- | --- | --- |
| stagnation_warning | 19 | Worker re-read the same files without writing. Threshold-driven nudge. |
| stagnation_fallback_injected | 1 | Pre-abort batch-classify retry was injected (CODEGEN_HARDENING_PLAN.md §7.4). recovered: 1. |
| contract_usage_coverage_audit | 1 | 4-quadrant audit ran (post-contract / pre-integration). Decisions in `.ralph/contract-usage-coverage.json`. |
| doc_truncated | 4 | Context budget exhausted; relevance picker dropped sections. Symptoms include "lost" PRD detail. |
| runtime_integration_audit | 2 | Static §4.2/§4.3/§4.4/§4.5/§4.7 grep audit ran. Findings persisted to `.ralph/runtime-integration-audit.json`. |

## Repair / Self-Heal Telemetry
- Total repair events: 331
- Stage `worker-codegen`: 267
- Stage `integration-gate`: 25
- Stage `tdd-runtime`: 10
- Stage `worker-context`: 8
- Stage `task`: 5
- Stage `preflight-route-audit`: 5
- Stage `worker-verify`: 3
- Stage `tdd-review`: 2
- Stage `preflight-contract-completeness`: 2
- Stage `architect-triage`: 1
- Stage `tdd-test-writer`: 1
- Stage `preflight-convention-fix`: 1
- Stage `post-gen-audit`: 1

## Codegen Retrofit Suggestions (inferred from this run)

| # | Severity | Issue | Plan ref |
| --- | --- | --- | --- |
| 1 | 🔴 HIGH | `integration_verify_fix` looped without producing mutations and ran out of budget | §7.2 + §7.4 (stagnation fallback) |
| 2 | 🔴 HIGH | Integration gate failure short-circuited runtime/E2E verification | §7.3 (one gate FAIL ≠ pipeline halt) |
| 3 | 🟡 MED | PRD / implementation context was truncated for workers | _(no rule yet — open ticket)_ |
| 4 | 🟡 MED | E2E verify still has failing scenarios | _(no rule yet — open ticket)_ |
```

---

## 附录 B:改动后完整报告(Session `ede29290-f4dc-4ac5-8210-351f30d59ed7`)

```
# Coding Session Report

- Session ID: `ede29290-f4dc-4ac5-8210-351f30d59ed7`
- Status: **FAIL**
- Overall score: **73/100 (C)**
- Code Quality: **92/100 (A)**
  - Static checks: 100/100 (A)
  - Complexity: 80/100 (B)
  - Duplication: 96/100 (A)
  - Type safety: 100/100 (A)
  - Modularity: 100/100 (A)
  - Readability: 85/100 (B)
  - Idiomaticity: 90/100 (A)
  - Architecture: 88/100 (B)
- First-Pass Success: **100/100 (A)**
- Generated baseline: **36/100 (F)**
- Final usability: **55/100 (F)**
- Session health: **42/100 (F)**
- Repair burden: **0/100 (F)**
- Runtime readiness: ✅ CLEAN (0 findings)
- Started at: 2026-06-11T02:39:43.567Z
- Ended at: 2026-06-11T04:37:55.557Z
- Total duration: 118m 12s
- Generator git: `284101e`
- Scaffold fix attempts: 12
- Integration fix attempts: 142
- Total LLM calls: 270
- Total LLM tokens: 6710205
- Total LLM cost: $0.0000
- Generated/known files in registry: 86

## Summary
Timeout/terminated: Integration verify gate failed.
Human decision timed out (5 min); aborting integration fix.
No mutation for 14 consecutive iteration(s).
Dynamic stagnation threshold: abortAt=10, progressScore=0/6.

E2E verify gate failed.
No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

## File Statistics
- Total files generated: **86** (frontend 9, backend 0, other 77)
- Test files: **8**
- Backend API endpoints: **0**
- Total lines of code: **32,807** (frontend 823, backend 0)

## Runtime Readiness
✅ **No findings.** All 8 rules either passed or were correctly skipped.

**Disabled rules:**
- `external-id-vs-db-pk` — no auth-* optional scaffold applied.
- `llm-client-abstraction` — no LLM_* bundle declared.

## Task Outcome
- Completed: 6
- Completed with warnings: 0
- Failed: 0
- Unknown: 0

## Outcome Scoring

| Dimension | Weight | Score | Meaning |
| --- | ---: | ---: | --- |
| Generated baseline | info | **36/100 (F)** | Estimated initial quality after discounting repair burden |
| Final usability | 35% | **55/100 (F)** | Final build/runtime/gate state and blocking defects |
| Code Quality | 20% | **92/100 (A)** | Aggregate of 5 machine + 3 LLM judge sub-dimensions |
| Requirement coverage | 15% | **100/100 (A)** | PRD hard/soft coverage after audit |
| First-Pass Success | 10% | **100/100 (A)** | Tasks that completed with zero codefix iterations |
| Evidence completeness | 8% | **85/100 (B)** | Whether validation evidence actually ran |
| Repair burden | 7% | **0/100 (F)** | How much fix-loop/self-heal effort was required |
| Cost/speed | 5% | **75/100 (C)** | Call volume, token volume, and spend |

**Overall formula:** `55x35% + 92x20% + 100x15% + 100x10% + 85x8% + 0x7% + 75x5% = 73`

## Code Quality Audit

Overall: **92/100 (A)**

| Sub-dimension | Score | Notes |
| --- | ---: | --- |
| Static checks (tsc + ESLint) | 100/100 (A) | No static check findings. |
| Complexity (cyclomatic + LOC) | 80/100 (B) | 7 function(s) longer than threshold (50 lines). |
| Duplication (jscpd) | 96/100 (A) | Code duplication 1.2%. |
| Type safety (any/ts-ignore/non-null) | 100/100 (A) | Type safety is clean. |
| Modularity (madge) | 100/100 (A) | Modularity boundaries clean. |
| Readability (LLM judge) | 85/100 (B) | Code is well-structured with clear naming, good comments, and consistent formatting, though some files are quite long. |
| Idiomaticity (LLM judge) | 90/100 (A) | Excellent use of TypeScript types, React hooks patterns, proper event handling, and follows modern React conventions throughout. |
| Architecture (LLM judge) | 88/100 (B) | Good separation of concerns with shared schema, reusable components, and utility functions, though some coupling exists between test utilities and implementation details. |

## First-Pass Success
- First-pass rate: 100.0% (6/6)
- Avg fix iterations per task: 0.00

### Outcome Notes
- **Final usability**: Final integration verification still has blocking errors. | E2E verification still has blocking errors.
- **Code Quality**:
- **Requirement coverage**: All hard PRD requirement ids are covered.
- **First-Pass Success**: Avg fix iterations per task: 0.00 | Formula: 100.0 - 0(extra-iterations) = 100
- **Evidence completeness**: Runtime verify did not run.
- **Repair burden**: Integration fix required 141 extra iteration(s). | Scaffold fix required 11 extra iteration(s). | 5 context truncation event(s).
- **Cost/speed**: High LLM call count (270) indicates low iteration efficiency. | Very high token volume (6,710,205).

## Session Health Breakdown

**Formula:** `100 − 20(fail) − 10(integration) − 20(e2e:blocking errors) − 8(trunc:5) = 42`

| Rule | Max deduction | Applied | Reason |
| --- | --- | --- | --- |
| Run status fail | −20 | **-20** ❌ | status=fail |
| Run status aborted | −30 | 0 (not triggered) | status=aborted |
| Integration gate | −10 | **-10** ❌ | integration errors present |
| Runtime gate | −8 | 0 (not triggered) | runtime errors present |
| E2E gate | −20 | **-20** ❌ | e2e errors present (scales with fail ratio) |
| Uncovered requirements | −25 | 0 (not triggered) | PRD requirement ids unresolved |
| Failed tasks | −15 | 0 (not triggered) | coding tasks status=failed |
| Unknown tasks | −10 | 0 (not triggered) | coding tasks status=unknown |
| Context truncation | −8 | **-8** ❌ | doc_truncated events |
| Plan mismatches | −8 | 0 (not triggered) | task_plan_unfulfilled events |
| All tasks done bonus | +5 | 0 (not triggered) | all tasks complete + no blocking gates |

## Model Usage
- `deepseek-v4-pro`: calls=260, cost=$0.0000, tokens=6603312, stages=worker_codegen:Test Engineer, worker_codegen:Frontend Dev, phase_verify_fix, integration_verify_fix
- `deepseek/deepseek-v4-pro-20260423`: calls=10, cost=$0.0000, tokens=106893, stages=tdd_test_writer

## Stage Diagnostics
- `worker-context`: duration=78m 26s, score=76/100 (C). Context was truncated 5 time(s).
- `tdd_test_writer`: duration=3m 8s, calls=10, tokens=106893, score=100/100 (A).
- `tdd-review`: duration=114m 53s, score=100/100 (A).
- `tdd-runtime`: duration=112m 53s, score=100/100 (A).
- `worker_codegen`: duration=17m 50s, calls=106, tokens=2939558, score=100/100 (A), models=deepseek-v4-pro, labels=Test Engineer, Frontend Dev.
- `worker-verify`: duration=13m 9s, score=100/100 (A).
- `phase_verify_fix`: duration=54s, calls=12, tokens=85470, score=90/100 (A). Earlier phase verify/fix did not fully prevent later integration failures.
- `preflight-contract-completeness`: duration=48m 11s, score=100/100 (A).
- `preflight-route-audit`: duration=87m 52s, score=100/100 (A).
- `integration_verify_fix`: duration=82m 47s, calls=142, tokens=3578284, score=72/100 (C). Stage ended with blocking integration errors.
- `integration-gate`: duration=87m 43s, score=64/100 (D). Stagnation warnings triggered 46 time(s).

## Model Effectiveness
- `deepseek-v4-pro`: score=84.7/100 (B), calls=260, tokens=6603312, stages=worker_codegen, phase_verify_fix, integration_verify_fix
- `deepseek/deepseek-v4-pro-20260423`: score=100/100 (A), calls=10, tokens=106893, stages=tdd_test_writer

## Quality Gates
- Integration verify: FAIL (continued)
- Runtime verify: SKIPPED
- E2E verify: FAIL
- Feature audit: PASS

## File-Plan Advisories (predicted-modify left untouched)
- `frontend/package.json` — T-E2E-001
- `src/App.tsx` — T-003
- `src/components/TaskItem.tsx` — T-004

## TDD Gate
- Manifest: present
- Evidence events: 12
- RED evidence: 4/4
- GREEN passed: 4/4
- Priority coverage: P0 2/2, P1 2/2, P2 0/0
- Reviewer: 3 finding(s), 0 P0 error(s)
- Blocking P0 TDD gaps: none

### Integration Errors

Human decision timed out (5 min); aborting integration fix.
No mutation for 14 consecutive iteration(s).
Dynamic stagnation threshold: abortAt=10, progressScore=0/6.

### E2E Verify Errors

No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config.

## Feature Audit
- All hard requirement ids are covered.

## Preflight Automation Ledger
### Convention auto-fix
- Invocations: 1 | files rewritten: 0 | unfixable conflicts: 0
### Missing-import installs
- No missing packages needed to be installed during preflight.
### Route registration audit
- Preflight: clean | Final: clean
### Contract completeness audit (ORM-derived)
- Preflight: clean | Final: clean

## Defect Category Summary

| Category | State |
| --- | --- |
| Dependency sync | ✅ PASS |
| Directory / implementation dedup | ✅ PASS |
| Env variable alignment | ✅ PASS |
| API contract consistency | ✅ PASS |
| API contract completeness (ORM-derived) | ✅ PASS |
| Build & runtime verification | ❌ FAIL |

## Pipeline Anomalies

| Event | Count |
| --- | --- |
| stagnation_warning | 46 |
| stagnation_fallback_injected | 4 |
| contract_usage_coverage_audit | 2 |
| doc_truncated | 5 |
| runtime_integration_audit | 4 |

## Repair / Self-Heal Telemetry
- Total repair events: 393
- Stage `worker-codegen`: 270
- Stage `integration-gate`: 70
- Stage `tdd-runtime`: 15
- Stage `preflight-route-audit`: 10
- Stage `worker-context`: 9
- Stage `task`: 5
- Stage `preflight-contract-completeness`: 4
- Stage `tdd-review`: 3
- Stage `worker-verify`: 3
- Stage `architect-triage`: 1
- Stage `tdd-test-writer`: 1
- Stage `preflight-convention-fix`: 1
- Stage `post-gen-audit`: 1

## Codegen Retrofit Suggestions (inferred from this run)

| # | Severity | Issue | Plan ref |
| --- | --- | --- | --- |
| 1 | 🔴 HIGH | `integration_verify_fix` looped without producing mutations and ran out of budget | §7.2 + §7.4 (stagnation fallback) |
| 2 | 🔴 HIGH | Integration gate failure short-circuited runtime/E2E verification | §7.3 (one gate FAIL ≠ pipeline halt) |
| 3 | 🟡 MED | PRD / implementation context was truncated for workers | _(no rule yet — open ticket)_ |
| 4 | 🟡 MED | E2E verify still has failing scenarios | _(no rule yet — open ticket)_ |
```
