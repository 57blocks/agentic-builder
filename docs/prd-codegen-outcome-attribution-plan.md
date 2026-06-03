# Plan: 把下游 codegen 结果回灌到 PRD 学习闭环（① / abort-resilient）

> 状态：**确定性归因核心已实现（Step 1/2/4/5）**；铸新 pattern（Step 3）作为下一增量。
> 目标读者：要实现这个特性的工程师。

## 已实现（本次）

- `src/lib/memory/distill/codegen-prep-attribution.ts` — 纯函数 `computeCodegenPrepAttributions` + `deriveCodegenOutcomes`。按 **kickoffId 桥**把 L1 prd-pattern inject × L2 codegen 信号关联。abort 非对称：负面信号（失败 task + coverage self-heal）纯从 L2 durable 记录派生、无需 report；正面弱信号需 `completedKickoffs`（session report status）佐证。delta 默认 **失败 -0.12 / 成功 +0.05**（失败权重 > human_edit 0.05，也 > failure-pattern 0.10，按产品决定）。负面单次封顶 2 单位，分数 clamp 到 [-1,1]，`manual:approved` 免疫，cite 优先。
- `src/lib/memory/distill/codegen-prep-reconcile.ts` — pull-based reconcile 编排：读 L1 trace + L2 task-history/self-heal-log + `.ralph/coding-session-report-history.json`（填 completedKickoffs）+ L1 prd-pattern，cursor `.codegen-prep-attribution-cursor.json` 幂等，应用 score 更新。`triggerCodegenPrepReconcile` 为 fire-and-forget 版。
- `src/app/api/memory/attribute/codegen-prep/route.ts` — HTTP 入口（dryRun/resetCursor/delta 覆盖）。
- `src/app/api/agents/kickoff/route.ts` — kickoff 开始处 fire-and-forget 触发，把上一批（含 abort/崩溃的）run 从 durable 信号补算。
- `src/lib/memory/__tests__/codegen-prep-attribution.test.ts` — 9 个单测全绿。

## 下一增量（未做）

- **Step 3 铸新 pattern**：当 coverage self-heal / 失败暴露 PRD 欠规格，蒸馏成新 `prd-pattern`（需 PRD 文本 + LLM，仿 `prd-diff-summarize`）。这是 bootstrap 净新模式的价值点，单独一 PR。
- **服务启动触发点**（兜硬崩溃）：当前只在 kickoff 开始触发；可加 instrumentation.ts / 首请求 lazy-init / cron。
- design-pattern 是否同样接 codegen 信号。

---

## 原始设计（保留供参考）

## 1. 目标

让 PRD 生成阶段"根据每次生成出来的项目的好坏"自我加强，而不只是从用户对 PRD 文本的编辑里学。

现状缺口：
- `prd-pattern` 记忆的学习闭环已通，但 attribution 信号**只有** `human_approval` / `human_edit`（见 `src/lib/memory/distill/preparation-attribution.ts` 注释）。
- 项目真正生成出来之后的信号——self-heal 修复、verify 失败、task 成败、abort——**全部没有回灌**到 PRD 学习里。
- 那次前端样式内聚崩溃（见 memory `styling-regression-frontend-fanout`）这类"PRD 欠规格"的教训，目前没有任何机制变成下次 PRD 的召回提示。

## 2. 核心设计：pull-based + cursor 幂等 + abort 弱信号

**不要**在 codegen 收尾处 push 一个 outcome 事件（项目中途 abort / 硬崩溃就丢）。
**要**从 append-only 落盘日志里 **pull**，用带 cursor 的 reconciliation sweep 幂等地补算。

### 2.1 为什么 pull-based 抗丢失（已验证的事实）

| 信号 | 落盘位置 | 时机 | abort 后是否存活 |
|---|---|---|---|
| trace 事件（inject/cite/...） | `.memory/trace.jsonl` | 逐事件同步 `fs.appendFile`（`trace.ts:67`） | ✅ 崩点之前全在 |
| task-history（in_progress→completed/failed） | `.memory/records/task-history/` | 随 step 事件增量写（`event-bridge.ts`） | ✅ 已完成的 task 都在 |
| self-heal 修复事件 | `.ralph/repair-log.jsonl` + `.memory` self-heal-log | 多 sink 同步落盘（`coding/route.ts:1472`） | ✅ 修复发生即落盘 |
| session report | `.memory`（finally 块） | 运行结束 / abort 的 finally | ⚠️ 派生视图，可能丢——**不依赖它** |

**原则：归因的真相源是上面三份 append-only 日志，session report 只是派生视图，绝不作为归因依赖。** report 丢了，重跑 sweep 即可从日志重建。

### 2.2 kickoffId 桥（把 PRD pattern 接到 codegen 结果）

现有 `computeAttributions`（`src/lib/memory/distill/attribution.ts`）的 join key 是 `(kickoffId::taskId)`，只服务 codegen 的 failure-pattern。PRD pattern 在 PRD 步注入（`agent="pm"`，无 taskId），所以接不上。

**桥**：改用 `kickoffId`（= sessionId）做 join。
- PRD pattern 的 `inject` 事件已记 `kickoffId` + `activeIds`（被注入的 prd-pattern 列表）。
- codegen 每个 task 带 `kickoffId` + `coversRequirementIds` + `status`。
- 同一 kickoff 下：`注入的 prd-pattern` ←→ `该项目所有 task 的成败 / self-heal / verify 结果` 按 kickoffId 关联。

### 2.3 最高精度信号：self-heal 修复事件

优先用 self-heal 修复事件，而不是 build/lint 噪声：
- `page-coverage-repair` / `task-coverage-repair` 一旦为某 page / 需求触发，**直接证明 PRD 对那一项规格不足**（task-breakdown 没能从 PRD 推出覆盖）。
- 这是增量、mid-run 落盘的，**abort 也存活**——跑到 30% 就 abort 的项目照样给出 "PAGE-007 需要覆盖修复" 这种可用信号。

## 3. 实现步骤

### Step 1 — kickoff 级 outcome 汇总（从日志派生，不新增 push）
- 新增 `deriveCodegenOutcome(kickoffId, { traceEvents, taskHistory, repairLog })`：按 `coversRequirementIds` 聚合每个需求 ID 的 {成功数, 失败数, self-heal 触发, verify 失败}，外加 kickoff 级 `status`（completed / aborted）。
- 纯函数，输入是已落盘日志，输出是 per-requirement-id 的 outcome rollup。

### Step 2 — 扩 attribution 支持 prd-pattern（kickoffId 桥）
- 扩 `computeAttributions`（或新增 `computePrepAttributions`）：除了 `(kickoffId::taskId)` 的 codegen 归因，增加 `kickoffId` 级路径，把 Step 1 的 rollup 归因到该 kickoff 注入的 `prd-pattern`。
- 复用现有 clamp / delta / immune（`manual:approved`）机制。
- delta 取值待定（见开放问题）。

### Step 3 — 铸新 pattern（真正价值）
- 当某需求触发 self-heal / verify 失败：跑一个便宜 LLM（仿照 `src/lib/memory/prd-diff-summarize.ts`）把"PRD 欠了什么 → 教训"蒸馏成新 `prd-pattern`。
- tag：`outcome:negative`, `source:codegen-attribution`；带 `refs.kickoffId` + 涉及的 requirement IDs。
- 下次 `recallPrdContext`（`engine.ts:465`）自动召回。

### Step 4 — 把 sweep 接到 `/api/memory/attribute` 并自动触发
- 扩现有 `src/app/api/memory/attribute/route.ts`（已读 trace.jsonl + task-history + cursor 幂等）：加 prd-pattern 归因 + Step 3 铸 pattern。
- **自动触发点**（现在是纯手动 POST，这是唯一真正要新建的东西）：
  1. 每次新 kickoff 开始时跑一次（自然节奏、便宜）；
  2. 服务启动时跑一次（兜住硬崩溃 / 进程被 kill）；
  3. 可选：挂 `/loop` 或 cron 定期跑。
- cursor（`.memory/.attribution-cursor.json` 的 `newlyAttributed`）保证幂等——昨天 abort 的项目今天 sweep 跑到就补算，信号只延迟不丢失。

### Step 5 — abort 弱信号解读规则
- finally 块已盖 `status:"aborted"`，partial 信号在盘上。归因保守解读：
  - abort **且**同一 requirement 有 self-heal 修复 / verify 失败佐证 → 真·负面信号（铸 pattern + 小幅扣分）；
  - abort 但零失败 → **中性，忽略**（用户改主意 / 嫌贵 / 手滑，不污染学习）。

## 4. 要改 / 新增的文件（预估）

- `src/lib/memory/distill/codegen-outcome.ts`（新）— Step 1 派生函数。
- `src/lib/memory/distill/attribution.ts`（改）— Step 2 kickoffId 桥。
- `src/lib/memory/distill/prd-pattern-mint.ts`（新）— Step 3 铸 pattern（复用 prd-diff-summarize 风格）。
- `src/app/api/memory/attribute/route.ts`（改）— Step 4 接 prd-pattern + 铸 pattern。
- 自动触发：kickoff route（`src/app/api/agents/kickoff/route.ts`）+ 服务启动 hook。

## 5. 唯一会丢的窗口（可接受）

硬 kill（SIGKILL / OOM）发生在某条 `fs.appendFile` 落盘前、或 fire-and-forget 的 task-history 还没 flush——只丢**最后一条**在途事件。可接受，sweep 会补算其余全部。

## 6. 开放问题（实现前定）

1. codegen 负面信号的 delta 权重相对 `human_edit`（现 −0.05）取多少？是否该比人工信号更重（因为它是真实构建结果）？
2. 铸 pattern 的去重：同一类"PRD 欠规格"反复出现，要合并进既有 pattern（bump score）还是每次新建？建议合并（仿 prd-diff-summarize 的 pattern 复用）。
3. sweep 的服务启动触发点放哪（Next.js 没有天然的 server-start hook，可能用 instrumentation.ts 或首个请求 lazy-init）。
4. abort 信号是否也喂给 design-pattern（同 preparation-attribution 的另一半），还是先只做 prd-pattern。

## 7. 不在本期范围

- gate（PRD 自检：结构性自动修 / 判断性让用户选）—— 独立特性，② 之后再做。
- 设计语言提进 PRD spec（②③ 治本项）—— 独立。
