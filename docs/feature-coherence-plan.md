# Plan: 让 codegen 产出"功能链路完整"的代码（不再放个按钮就断链）

> 状态：草案，待 review。**未开始实现。**

## 问题与根因（一句话）

worker 经常"放了个按钮就结束"——按钮→handler→API 调用→状态/跳转 这条链里的某一环静默掉链。根因三层：
1. **没被指定**：拆分时只说"建页面"，没把每个交互元素的 handler/API/跳转列成义务。
2. **worker 看不见下游**：worker 只拿到自己那片 PRD，看不到该调的 API client 签名和路由目标。
3. **只验结构不验流程**：TDD 是 `route-smoke`（渲染 + 调了某 API），不断言"点这个按钮真的触发了 X"。

**关键事实：数据其实已经在了** —— PRD 的 `PrdInteractiveComponent` 已含 `interaction → effect`（`prd-spec-types.ts:20`），`pickPrdSpecEntriesForTask()` 已按 `coversRequirementIds` 过滤它（`prd-spec-prompt.ts:19`）。只是没被转成"义务 + 可见上下文 + 断言"。

## 设计原则

把链路当成一等对象：**指定（Spec）→ 看见（Context）→ 验证（Verify）→ 修复（Repair）**。不碰 parallel-by-file 的写隔离（worker 仍只写自己的文件，新增的只是只读上下文 + 验证 + 定向修复）。

---

## 分阶段计划（按性价比排序）

### Phase 1 — 指定链路：Wiring Contract（低成本，高杠杆）
让拆分阶段为每个前端页面/路由任务，从 PRD 交互组件派生一份**接线契约**：每个交互元素 → `{ trigger, handler, API(method+endpoint) | nav | stateChange, effect }`。

- 改 `src/lib/agents/kickoff/task-breakdown-agent.ts`（~356 行 TDD 段附近）：明确要求把页面上每个 `CMP-*` 的接线列进 `subSteps`，并在 `tddPlan` 里为主 CTA 生成交互测试。
- 在前端任务对象上加一个结构化 `wiringContract`（或用严格格式编码进 subSteps），来源就是 PRD 的 `interaction/effect`。
- 产出：任务自带"这页有哪些控件、各自该接到哪"。**几乎只是 prompt + 轻 schema。**

### Phase 2 — 让 worker 看见链路（低-中成本，高杠杆；不破坏写隔离）
给前端 worker 一个**只读**的下游视野，专治"盲做"。

- 改 `src/lib/langgraph/prd-spec-prompt.ts`：把 `interaction → effect` 渲染进 worker prompt（"Button X 点击 → 调 POST /api/Y → 跳转 Z"）。
- 把 `extract_real_contracts` 产出的**真实 API client 方法签名 + 路由表**按本页所需注入前端 worker（`agent-subgraph.ts` / `role-prompts.ts` 前端段 ~375 行）。worker 能看到 `paymentsClient.createPayment(dto)` 和 `/checkout` 才接得对。
- 加一条前端 HARD RULE：**"你渲染的每个 CMP-* 必须有非空 handler，执行其声明的 effect（调列出的 API client 方法 / 跳转 / 改状态）。没有行为的控件视为未完成。"**

### Phase 3 — 验证链路（中成本，纠错收益最高 —— 这是"牙齿"）
没有验证，Phase 1/2 只是 nudge。两件事：

- **3a 静态接线审查（便宜、确定性、无 LLM）**：在 `feature-checklist-audit.ts` 旁加一个检查，解析生成的前端文件，标记掉链：空 `onClick={() => {}}` / `onClick={undefined}`、button/form 无 handler、契约里声明了的 `CMP-*` 找不到对应 handler、import 了 API client 方法却从不调用。AST/正则即可，快。
- **3b 交互流 TDD**：扩 `tdd-test-writer.ts` 的 `route-smoke` prompt（~276 行），让测试用 testing-library **模拟主交互（click/submit）并断言 effect**（API client 方法被以正确 payload 调用 / 发生跳转）。主 CTA 设为 P1，纳入门禁。这样"没接 handler 的按钮"会**直接 fail**。

> 与"生成太慢"协同：3a 是廉价的提前拦截，把掉链问题挡在便宜的静态阶段，而不是丢给后面昂贵的 integration 修复环去反复 thrash。

### Phase 4 — 修复链路（中成本，复用现成自愈）
3a/3b 发现掉链 → 走 `audit-repair-dispatch.ts`（~133/250 行）派一个**定向"接线"修复任务**，description 里带上 wiring contract + 真实 API 签名，scope 在该页文件。这是**受控的 agency**（单文件 + 具体指令），不是开放式长循环，成本可控。

- 可选：给被标记接线问题的任务临时调高 `WORKER_TSC_FIX_MAX_ATTEMPTS`（`agent-subgraph.ts:144`），让修复有空间收敛。

### Phase 5 —（可选，最深）功能纵切任务分组（高成本/高风险）
把一条用户流的薄纵切（页面 + handler + 它的 API client 调用 + 最小后端端点）归一个 worker 端到端拥有。行为收益最大，但与 parallel-by-file 冲突最大。**仅当 Phase 1–4 仍不够时再考虑。**

---

## 建议的落地顺序

**先做 1 → 2 → 3a**（指定 + 看见 + 廉价检测，三者复利、改动小、风险低），跑几个真实项目量化掉链率下降，再上 **3b + 4**。Phase 5 视情况。

## 成本/速度影响

- Phase 1/2：基本只在 prompt/context，运行时几乎零额外成本。
- Phase 3a：纯静态，毫秒级。
- Phase 3b：多几条断言，不增加测试运行轮数。
- Phase 4：仅在发现掉链时才触发定向修复。
- 净效果：**小幅时间成本，换显著的功能连贯性提升**，且 3a 还能反过来减少昂贵 integration 环的 thrash。

## 涉及文件（落地时）

- `src/lib/agents/kickoff/task-breakdown-agent.ts`（Phase 1）
- `src/lib/langgraph/prd-spec-prompt.ts`、`role-prompts.ts`、`agent-subgraph.ts`（Phase 2）
- `src/lib/pipeline/self-heal/feature-checklist-audit.ts`（Phase 3a）
- `src/lib/pipeline/tdd-test-writer.ts`（Phase 3b）
- `src/lib/pipeline/self-heal/audit-repair-dispatch.ts`（Phase 4）
- `src/lib/requirements/prd-spec-types.ts`（如需给任务加 wiringContract 字段）

## 开放问题（实现前定）

1. `wiringContract` 用结构化字段还是编码进 `subSteps`？（结构化更利于 3a/3b/4 消费）
2. 3b 的交互测试设 P0（硬门禁，可能拖慢/卡住）还是 P1（计分但不阻断）？建议先 P1，稳定后再升 P0。
3. 3a 用 AST（准、需 parser）还是正则（快、糙）起步？建议正则起步，命中率不够再上 AST。
