# Self-Heal Rule Policy — 规则准入闸 & 收编路线

> 配套阅读：`CODEGEN_HARDENING_PLAN.md`（落点五层模型）、`src/lib/pipeline/self-heal/`（规则实现）、`src/lib/pipeline/gates/`（闸门）。
>
> 本文要解决的问题：`self-heal/` 目前已有 ~20 个检测文件，几乎每条规则的文件头都对应一次具体线上事故（F-04 / F-07 / F-09 / F-10 / F-13 / F-15 …）。这是典型的**反应式规则堆积（rule accretion）**——「出一个错 → 加一条规则」，增长曲线 O(n)，长期会变成谁都不敢删的「规则坟场」，且对本应简单的生成项目注入它不需要的机关。
>
> 本文给出两样东西：①**准入闸**——新规则该不该加的决策过滤器；②**现有规则分类 + 收编路线**——把规则数量从单调上涨扭成「先冲高、后收敛」。

---

## 1. 核心原则

> **规则只是症状级补救。一个机制盖住一整类，永远优于一条规则盯一个 bug。**

可靠性分层，强弱差很大（详见 `runtime-audit-dispatch.ts` 文件头记录的「选择性服从 / 无闭环校验」两个翻车原因）：

| 手段 | 可靠性 | 增长成本 | 说明 |
|---|---|---|---|
| 收窄生成面（scaffold-owned 接线） | ✅ 最高 | O(1)/类 | 模型根本不写那段 = 不会错 |
| 类型自我强制（`tsc`） | ✅ 高 | O(1)/类 | 一个机制免费盖一整类，编译不过即拦 |
| 行为/运行时验证（smoke / e2e） | ✅ 高 | O(1)/类 | 一个 smoke 盖住无数种「跑不起来」 |
| 确定性 lint + 阻塞 gate | ⚠️ 中 | O(n) | 检测可靠（扫产物，不靠模型自觉），但只认预设模式、换写法即漏 |
| Prompt / skill rule | ❌ 最低 | O(n) | 概率性，模型可能无视；堆越多越稀释注意力 |

**结论：能往上挪就别往下落。** 新增一条 lint 是「最后手段」，不是默认手段。

---

## 2. 准入闸：新规则该不该加？

任何想新增的 self-heal 规则，必须**同时**满足以下四条，否则不加——改走 §3 的「收编去向」。

- [ ] **A. 高频且跨项目**：反复出现、多个项目都犯，不是某个 PRD 的一次性怪事。
- [ ] **B. 确定性可修**：有干净的 string→string 修法，能上确定性 patcher（不靠 LLM「自觉」）。
- [ ] **C. 类型 & 运行时都够不着**：`tsc` 抓不到，`runtime-smoke`/e2e 也兜不住，只能静态扫。
- [ ] **D. 通用失败模式**：不是把某个 PRD 的业务规则硬塞进 lint。

### 四条不全 → 收编去向

| 不满足的条件 | 应该改投 |
|---|---|
| C 不满足，类型能表达 | **类型层**：把契约编码进 TS 类型（如断言型 guard、branded id），让违规编译不过 |
| C 不满足，运行时能兜 | **运行时层**：扩 `runtime-smoke` / e2e 覆盖，让「跑不起来 / 404 / 崩溃」直接暴露 |
| A 高频但 B 修法不机械 | **scaffold 化**：把承重接线做成 scaffold-owned 原件/hook，模型只许改样式不许改接线 |
| 根因在「过度/错误生成」 | **治上游**：修 prompt/breakdown 的生成纪律，而不是事后 prune |
| D 不满足（业务特例） | **不进 lint**：留给 PRD spec gate / e2e 断言 |

### 加规则时的硬性要求（即便通过准入闸）

1. 必须先尝试写**确定性 patcher**；只有修法天然非机械时才退回 LLM verify-fix，且必须配「改完重扫确认闭环」（见 `runtime-audit-dispatch.ts`）。
2. 必须声明 severity，并明确它**拦不拦 gate**——`telemetry-only` 的规则要标注退出条件（什么时候转为阻塞），不许永久挂在「只观察」。
3. 文件头必须写明：对应事故、**为什么不能用类型/运行时/scaffold 收编**（即准入闸 C 的论证）。这一条强制每个新规则自证「确实下不去」。

---

## 3. 现有规则分类 & 收编路线

图例：✅ 可删/可收编　⚠️ 重叠/可合并　🔒 确实保留

### 3.1 后端静态代码规则 —— 大半可被现有机制吸收

| 规则 | 对应事故 | 抓什么 | 收编去向 | 判定 |
|---|---|---|---|---|
| `controller-handler-not-routed`（runtime-integration-audit） | — | 导出 handler 但没注册路由 | `runtime-smoke` 404 探测已覆盖 | ⚠️ 与 smoke 重叠 |
| `admin-route-coverage` | F-09 | 前端调 `/admin/*` 后端无对应路由 | 同上，404 探测 + e2e | ⚠️ 与 smoke 重叠 |
| `missing-route-stubs` | — | 契约端点无实现（修复器） | 同上 | ⚠️ 重叠（保留为修复器即可） |
| `bg-job-worker-startup` | — | worker 没接进 `server.ts` | **scaffold** 队列原件（已有确定性 patcher） | ✅ scaffold 化 |
| `bg-job-clear-stale-runs` / `bg-job-inproc-branch` | — | 后台任务写法 | **scaffold** 统一 job 原件后消失 | ✅ scaffold 化 |
| `llm-client-abstraction` | — | 绕过 `llmService` 直连厂商 SDK | **scaffold** + 「只许从一处 import」 | ✅ scaffold 化 |
| `external-id-vs-db-pk` / `dbuser-not-found-as-404` | F-class | provider id 直接 `findByPk` | **scaffold** `resolveOrCreateDbUser` 原件 + e2e | ✅ scaffold 化 |
| `auth-guard-as-middleware` | — | 断言型 guard 当中间件用（缺 next） | **类型**：guard 类型设成断言，误用编译不过 | ✅ 类型收编 |
| `useSyncExternalStore-cached` / `useBlocker-needs-data-router` | F-class | 前端死循环 / 路由崩 | **e2e 启前端**即崩出来 | ✅ runtime 收编 |
| `empty-results-not-failure` | §4.7 | 0 行数据时聚合抛错 | 偏判断，类型/运行时够不着 | 🔒 留 |

### 3.2 Model ↔ Migration 三兄弟 —— 同一个病，可一并消除

| 规则 | 抓什么 |
|---|---|
| `schema-drift`（F-04） | model 声明了列，没 migration 建它 |
| `migration-coverage` | 改了 model 却没写任何 migration |
| `migration-quality` | migration 非幂等 / FK 顺序 / 混合 DDL |

三条都是「model、migration、可重跑性」三者漂移。**根治：从 model 自动生成 migration（单一真相源）**，前两条直接消失；`migration-quality` 退化成一个固定模板。→ ✅ 工具化后大幅收编。

### 3.3 契约生成纪律

| 规则 | 抓什么 | 收编 |
|---|---|---|
| `contract-usage-coverage` | 生成了没人调的投机 CRUD | ✅ **治上游**：`generate_api_contracts` 别过度生成；prune 是创可贴 |

### 3.4 规划层覆盖（另一层，保留）

`task-coverage-repair` / `phase-repair` / `page-coverage-repair` / `feature-checklist-audit`(L1/L2) / `task-breakdown-patches`(A/B/C) —— 这些作用在「PRD → 任务清单」的完整性上，类型和运行时都够不着，属于规划层，**保留**（其中 `task-breakdown-patches` 部分可 scaffold 化，`feature-checklist` 的 L1/L2 部分可被 e2e 收编）。🔒/⚠️

### 3.5 收编机制本身（要靠它们，别削）

`tsc-diagnostics-as-tasks`（类型收编机制）、`runtime-smoke-gate`（运行时收编机制）—— 这两个是 §1 里「一个机制盖一类」的载体，是收编的**目的地**，应持续投入、扩大覆盖。🔒

---

## 4. 目标轨迹

- 规则数量应是**先冲高、后收敛**的曲线，而非单调上涨。
- 每个迭代周期问一次：「§3 里标 ✅/⚠️ 的，这次能收掉几条？」
- 优先级建议：先做 **`auth-guard-as-middleware`→ 类型** 和 **`schema-drift`/`migration-coverage`→ 从 model 生成 migration**——一次性消掉多条、且不依赖模型自觉。

> 一句话：**lint 让它「漏不掉检测」，类型/运行时/scaffold 让它「根本写不错」。规则只留给「高频 + 确定性可修 + 类型与运行时都够不着」的那一小撮。**
