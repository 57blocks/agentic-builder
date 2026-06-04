# Subsystem-by-Subsystem Build — Design & Plan

> 大型多领域 PRD(如 CSMA,5000+ 行、跨家庭/教师/管理三端、80+ 端点)一次性
> 生成会被 task-breakdown 截断、coding loop 中途 abort、runtime/E2E 永远到不了。
> 本文档把"按 DDD 业务域拆分 → 共享地基先行 → 逐域分层构建 → 跨域整合"这套
> 方案的**架构、现状、以及剩余 Plan(含验收标准)**固化下来,按 Plan 推进。

设计原则:**有域才走子系统模式,没域(或项目不够大)完全走原先单趟流程,零额外成本。**

---

## 0. 阅读指引

- §1 问题 —— 为什么需要子系统模式。
- §2 架构总览 —— 闸门 + 五阶段流水线 + 一张流程图。
- §3 组件清单 —— `src/lib/pipeline/subsystems/*` 各文件职责 + PRD 准备 UI。
- §4 端到端流程 —— 从 PRD 生成到跨域整合的完整动线。
- §5 现状矩阵 —— 已完成 vs 待办(**实情**)。
- §6 **The Plan** —— 剩余工作按阶段拆,每条给落点 + 验收标准。**owner 要改的清单。**
- §7 开关与 gate 参考。 §8 风险。

---

## 1. 问题

整份大 PRD 走单趟 `buildTaskBreakdownFromDocuments` → coding:

1. **task-breakdown 输出截断**:单次 LLM 必须吐出整份任务 JSON,`maxTokens=64000`;3 子系统 60–100+ 任务会被截断 → 丢任务 → 应用不完整。
2. **单次超长 coding run 易 abort**:任务越多、run 越长,熔断/超时/卡死的累积概率越高(历史 7/7 会话 abort/fail)。
3. **集成漂移**:三端共用一套 DB/契约/路由面,单趟生成各做各的 → 字段名/端点/前缀对不上。
4. **校验不可行**:runtime smoke 60-probe 上限,80+ 端点单趟根本验不全。

---

## 2. 架构总览

**两级闸门(`subsystem-aware-breakdown.ts`)**——非合格项目完全不受影响、连 decompose 都不付费:

1. 便宜预检(无 LLM):`tier === "L"` 且 PRD 端点数 ≥ 阈值(`split-decision.ts`,锚定 smoke 60-probe + headroom,约 80)。
2. 才 decompose(1 次 LLM)+ `shouldSplitIntoSubsystems`(域数/均衡度)。
3. 任一不过 → 原样 `buildTaskBreakdownFromDocuments`(默认流程)。
4. `BLUEPRINT_SUBSYSTEM_BREAKDOWN=0` 整体关闭。

**五阶段流水线(合格时):**

```
PRD(唯一真源)
  └─ Prepare PRD(UI 抽屉,大型 PRD 必做、两步有序)
       Step 1  Validate PRD   —— 质量 gate(L1 确定性 + L2 LLM 语义)
       Step 2  Split Subsystems —— decompose → manifest(.blueprint/subsystems.json)
  └─ Kickoff(subsystem-aware)
       ① decompose: inventory(routes/endpoints/collections) → 业务域 + 依赖 DAG
       ② domain-requirements: 域 → 它拥有的 PAGE-/API- 需求 ID
       ③ 按域 scoped task-breakdown(requirementsToCover 限定;任务出生带 subsystem 标签)
          + Foundation 提取:scaffold/全局数据层/冻结契约/app shell = Phase-1 共享地基
  └─ Build(orchestrate.ts → develop.ts)
       Phase-1 Foundation(一次):shared schema/models/migrations + 冻结 API 契约 + app shell + api client + 共享 UI shell/tokens
       Phase-2 逐域(拓扑分层,层内并行):每域跑它的任务子集(coding-runner 复用 /api/agents/coding 的 retryFailedTaskIds)
                active-scope:校验只针对当前域 + 其依赖的端点(未建域不误报 missing-route)
                progress-io:可断点续跑(跳过已完成域)
  └─ Phase-3 跨域整合(待建,见 Plan):全应用 routing 闭合 + runtime smoke + E2E(非 scoped)
```

**关键不变量:整份 PRD 始终是唯一真源;不产生独立"子 PRD 文档"。** 被"切分"的是:
inventory→域(manifest)、以及 task-breakdown→按域 scoped 的任务。`prdSections` 只是
归属标注。下游执行 = 整份 PRD + manifest + 域级任务范围。

---

## 3. 组件清单

### 3.1 `src/lib/pipeline/subsystems/`(DDD orchestrator,已建)

| 文件 | 职责 |
|---|---|
| `inventory.ts` | 从 PRD 抽 routes / `/api/v1/<resource>` endpoints / collections(分区集) |
| `decompose.ts` | LLM 把 inventory 分组为业务域 + 依赖 DAG + 校验 + 有界修复轮 → `SubsystemManifest` |
| `validate.ts` | manifest 硬校验(全覆盖、无双拥有、DAG 无环)→ `buildLayers` 拓扑分层 |
| `types.ts` | `Subsystem` / `SubsystemManifest`(ownedRoutes/ApiEndpoints/Collections/Modules/dependsOn/prdSections) |
| `manifest-io.ts` | 读写 `.blueprint/subsystems.json` |
| `domain-requirements.ts` | 域 → 需求 ID(owned routes/endpoints 上的 PAGE-/API- id) |
| `domain-breakdown.ts` | 按域 scoped task-breakdown(requirementsToCover);Foundation 取 shared/结构任务 |
| `subsystem-aware-breakdown.ts` | kickoff 入口;两级闸门;合格则换为按域拆分,否则默认流程 |
| `split-decision.ts` | 是否值得走子系统模式(端点阈值 + 域均衡) |
| `orchestrate.ts` | 任务→域分配(ownedModules 前缀 / subsystem 标签)+ 依赖闭包 + 分层 build plan + scopeEndpoints |
| `foundation.ts` | Phase-1 共享地基构建一次;`runSubsystemPipeline`(foundation → layers) |
| `coding-runner.ts` | 把一个 build step 桥接到现有 `/api/agents/coding`(retryFailedTaskIds=任务子集机制) |
| `active-scope.ts` | `.blueprint/active-subsystem-scope.json`;把校验 gate 限定到当前域+依赖的端点 |
| `progress-io.ts` | `.blueprint/subsystems-progress.json`;逐域可续跑 |
| `develop.ts` | 顶层驱动:resolve manifest → validate → persist → plan → resume → run |

### 3.2 PRD 准备 UI(已建,在 PRD 步骤)

- 大型 PRD(≥1500 行或 ≥8 个 H2)顶部出现琥珀横幅 + **Prepare PRD** 按钮 + `○/✓ Validate · Split` 进度。
- `PrdReadinessPanel`(右侧抽屉,有序两步):Step 1 Validate(`PrdQualityReportPanel` → `/api/agents/pipeline/prd-quality`),Step 2 Split(Step 1 完成后解锁,`PrdSubsystemPanel` → `/api/agents/pipeline/prd-subsystem-decompose`,每域可展开看 endpoints/routes/collections/modules/prdSections/deps)。
- **Next Step 门控**:大型 PRD 下两步都出结果前禁用。
- PRD 质量 gate:`gates/prd-quality-gate.ts`(L1 确定性)+ `agents/pm/prd-reviewer-agent.ts`(L2 跨厂 LLM)。

---

## 4. 端到端流程(合格的大 PRD)

1. 生成 PRD → 顶部横幅提示。
2. Prepare PRD:① Validate(修 blocker)② Split(出 manifest,写 `.blueprint/subsystems.json`)。
3. Next Step → kickoff:`subsystem-aware-breakdown` 命中 → 按域 scoped 拆分 + Foundation 提取,持久化 manifest + buildLayers。
4. Build:foundation 先行(契约/数据层/shell)→ 按 buildLayers 逐域(层内并行)跑任务子集;每域 active-scope 限定校验;progress 续跑。
5. Phase-3:全应用整合 + runtime + E2E(**待建**)。

---

## 5. 现状矩阵

| 能力 | 状态 |
|---|---|
| inventory + decompose + validate + manifest-io | ✅ 已建 |
| domain-requirements + domain-breakdown + subsystem-aware-breakdown(闸门) | ✅ 已建 |
| orchestrate(分配/分层)+ foundation + coding-runner + active-scope + progress-io + develop | ✅ 已建 |
| PRD 质量 gate L1+L2 + Prepare PRD 两步 UI + 域展开明细 | ✅ 已建 |
| DB-url 优先级修复(kickoff 真实库不被全局占位遮蔽) | ✅ 已建 |
| **P3.1 冻结契约前置**(域开建前契约/共享类型必须完整冻结) | ✅ 已建(contract-precondition.ts + foundation/develop 接线) |
| **P3.2 跨域整合 gate**(全应用 routing 闭合 + runtime + E2E,非 scoped) | ⛔ 待建 |
| **P3.3 子系统模式下前端内聚**(共享 shell/tokens 纳入 foundation) | ⚠️ 部分(Foundation 任务已有,需确认进 foundation 阶段) |
| **P3.4 阈值校准 + 编排可观测**(per-domain 状态/dump) | ⚠️ 部分 |
| 远端统一(合并到 `vicky-debugger`)+ 旧分支清理 | ⛔ 待办 |

---

## 6. The Plan(剩余工作 · owner 清单)

### P3.1 — 冻结契约前置(命门)
- **落点**:`foundation.ts` / `subsystem-aware-breakdown.ts`。
- **做什么**:Phase-1 foundation 必须产出**完整、冻结**的 API 契约(`API_CONTRACTS.json`)+ 共享类型(`shared/`),并在进入任何域 build 前加一道断言:契约覆盖 manifest 里所有 `ownedApiEndpoints`,否则中止并报"contract incomplete"。
- **验收**:跑 CSMA;domain build 开始前 `API_CONTRACTS.json` 端点 ⊇ 各域 ownedApiEndpoints;缺失即 fail-fast 并列出缺口。

### P3.2 — 跨域整合 gate(Phase 3)
- **落点**:新增 `subsystems/integrate.ts` + 在 `develop.ts` 所有 layer 完成后调用。
- **做什么**:清掉 active-scope(全量)→ 跑 ① 全应用 route-registration 审计(`router.tsx` / `modules/index.ts` 闭合所有域)② runtime smoke(整库)③ E2E 跨域关键流程。失败 → 产出 verify-fix 任务(复用现有 self-heal)。
- **验收**:CSMA 三域建完后,整合 gate 跑出非 scoped 的 runtime smoke pass + 至少 1 条跨域 E2E(如家庭报名→管理员审批→账单)绿。

### P3.3 — 子系统模式下前端内聚
- **落点**:`foundation.ts`(确保 `ensureFrontendFoundationTask` 的 token/shell/primitives 归入 foundation 阶段,先于任何域前端)。
- **做什么**:foundation 产出共享 `tokens.css`/`components/ui`/layout shell;各域前端任务 `reads` 它、禁止 inline hex(沿用 `FP-frontend-task-fanout-breaks-styling` 规则)。
- **验收**:各域生成的页面引用同一套 token/组件,无多版"主色"漂移。

### P3.4 — 阈值校准 + 编排可观测
- **落点**:`split-decision.ts` + 一个轻量编排状态文件/UI。
- **做什么**:① 复核端点阈值(漏掉的多域中型 PRD?)② 把 manifest + buildLayers + per-domain 进度(progress-io)暴露到 UI/日志;codegen 每轮可 `CODEGEN_CONTEXT_DUMP=1` 落盘。
- **验收**:能在一处看到"哪些域已建/在建/失败"+ 构建顺序;阈值有测试用例覆盖边界。

### P3.5 — 远端统一 + 收尾
- 把本地分支(DDD + 修复 + Prepare PRD UI)合并/推到 `vicky-debugger`;删除已合并的旧 feature 分支。
- **验收**:`origin/vicky-debugger` 单一真源含全部能力;无悬挂旧分支。

### 实施顺序建议
P3.5(统一基线)→ P3.1(契约前置,解锁可靠 build)→ P3.2(整合 gate)→ P3.3(前端内聚)→ P3.4(阈值/可观测)。每步独立分支 + 类型检查 + 单测 + 必要时 CSMA 真跑验收。

---

## 7. 开关与 gate 参考

| 开关 | 作用 |
|---|---|
| `BLUEPRINT_SUBSYSTEM_BREAKDOWN=0` | 关闭子系统模式(强制单趟) |
| `INTEGRATION_DATA_GATE=1` | 开启 Tier-2 真实数据集成 gate(隔离 schema seed) |
| `CODEGEN_CONTEXT_DUMP=1|all|<taskId>` | 每轮 coding 上下文落盘 `.ralph/context-dumps/` |
| `BLUEPRINT_DISABLE_RUNTIME_SMOKE=1` | 关闭 runtime smoke gate |
| `BLUEPRINT_GENERATED_DATABASE_URL` | 留空,让 kickoff provision 的真实库胜出(否则会遮蔽) |

产物文件:`.blueprint/subsystems.json`(manifest)、`.blueprint/subsystems-progress.json`(进度)、`.blueprint/active-subsystem-scope.json`(当前域校验范围)、`.blueprint/kickoff-infra.json`(provision 的 DB/Redis)。

---

## 8. 风险

1. **契约不完整即开域** → 域间编译/集成失败(P3.1 缓解)。
2. **任务漏分配**:横跨多域/无 owner 的任务必须落 foundation,不能丢(orchestrate 的 unassigned 已收集,需确保进 foundation)。
3. **阈值误判**:多域但端点不到阈值的中型 PRD 走单趟仍可能崩(P3.4)。
4. **前端跨域漂移**:见 P3.3。
5. **长 run 成本/时长**:逐域 + 整合是多次 codegen,贵且久;progress-io 续跑 + 按需手动触发缓解。
