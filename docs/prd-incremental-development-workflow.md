# PRD 修改驱动的二次开发全流程

> 文档范围：AgenticBuilder 在 **已完成首轮代码生成** 之后，通过修改 PRD 触发增量更新（文档 → 任务拆解 → 代码）的完整链路。  
> 最后更新：**2026-05-28**（基于 `vicky-debugger` 分支与 Stablecoin Scoring 示例项目实践）

---

## 1. 背景与目标

AgenticBuilder 的首轮流程是：

```
Intent → PRD → TRD / SysDesign / ImplGuide / Design / QA / Verify → Kickoff（任务拆解）→ Coding
```

首轮完成后，产品需求往往会变化。若每次改动都 **从零全量生成**，成本极高，且会覆盖已有 `.env`、数据库迁移、手工修复等成果。

**PRD 二次开发** 的设计目标是：

| 目标 | 实现方式 |
|------|----------|
| 只改 PRD 中变化的部分 | Section-level Patch Agent + Markdown 章节 diff |
| 只重跑受影响的下游文档 | `runIncrementalDownstream()` 按 Tier 重生成 TRD / Design 等 |
| 只新增/重跑受影响的 Coding Task | `incremental-rerun.ts` 计算 Task Delta |
| 未受影响的代码保持不动 | Session Checkpoint 将已完成 Task 标记为 `completed`，Coding 只跑 `failed` 集合 |
| 可追溯 | PRD 版本历史、Diff 面板、`CHANGES.md`、Kickoff Snapshot |

---

## 2. 前置条件

二次开发 **不是** 冷启动流程，必须先满足：

1. **至少完成过一次完整 Kickoff**  
   系统会在 `generated-code/.blueprint/last-kickoff-snapshot.json` 写入基线快照，包含：
   - 当时的 PRD 正文（已 strip 变更高亮标记）
   - `prdRequirementIndex`（FR-/AC-/US-/IC- ID 集合）
   - 完整 Task 列表（含 `coversRequirementIds`）
   - 当时的 TRD / Design 等文档副本

2. **已有 Coding 产出（可选但常见）**  
   `generated-code/.blueprint/last-coding-session.json` 记录各 Task 的完成状态，供增量 Coding 跳过已完成项。

3. **项目 Tier 已确定**  
   PRD 中的 `**Project Tier: M**` 徽章决定下游哪些文档需要重生成（S / M / L 不同）。

> 若没有 Kickoff Snapshot，`propagateAfterEdit` 会 soft-fail 并只更新 PRD，不会自动传播下游。

---

## 3. 三种 PRD 修改入口

### 3.1 对话式编辑（推荐）

**入口**：Project 页 → Preparation → **PRD** → 底部 `StageInputBar`

```
Ask AgenticBuilder to edit this PRD…
```

用户输入自然语言指令，例如：

- “给 Admin 增加一个导出 Audit Log 为 CSV 的功能，编号 FR-AD05”
- “把 Dashboard 刷新间隔从 60 秒改成 30 秒”
- “删除 FR-MN03 看板自定义视图功能”

**后端路径**：

```
PrdUI.onSubmit
  → step-store.executeStep("prd", editInstruction)
  → prdAgent.buildPayload({ prdEditInstruction, existingPrd })
  → POST /api/agents/pipeline
  → PipelineEngine.runPrdEdit()
```

**Patch 优先策略**（`engine.ts` → `runPrdEdit`）：

1. 调用 `PMAgent.generatePRDPatchStreaming()`，返回 JSON：`{ patches: [{ heading, newBody }], fullRewrite?: boolean }`
2. `applyPrdPatches()` 按 Markdown 标题精确替换章节 body，并注入 `<div class="prd-changed-section">` 高亮
3. 若 patch 失败、匹配不到标题、或改动超过 50% 行数 → 回退到 `generatePRDEditStreaming()` 全量重写

### 3.2 手工 Markdown 编辑

**入口**：PRD 页右上角 **Edit** 按钮 → 原始 Markdown 文本框 → **Save**

流程：

1. `setStepContent("prd", draft)` 立即更新内存
2. `POST /api/agents/save-doc` 写入 `generated-code/PRD.md`
3. 推入版本历史（label: `Manual edit`）

手工编辑 **不会** 自动触发下游传播。需要用户自行到 TRD / Task Breakdown 等步骤点 **Regenerate**，或在 Pipeline API 层传 `propagateAfterEdit: true`（见 §3.3）。

### 3.3 分步 Regenerate（Granular）

每个 Preparation / Kickoff 子步骤都有独立的 **Regenerate** 按钮：

| 步骤 | 行为 |
|------|------|
| PRD | 仅重跑 PRD Agent（可带 editInstruction） |
| TRD | 基于最新 PRD 重生成 TRD |
| Design | 基于最新 PRD/TRD 重生成 Design Spec |
| Task Breakdown | 调用 `/api/agents/kickoff`，**自动检测是否走增量** |

Task Breakdown 的 Regenerate 会读取 Snapshot，对比新旧 PRD：

- ID 集合变化（added / removed）→ 增量
- ID 不变但章节 body 变化（纯文案修改）→ 增量（`prd-section-diff.ts`）
- 否则 → 全量 Kickoff

---

## 4. 端到端流程图

```mermaid
flowchart TD
    A[用户修改 PRD] --> B{修改方式}
    B -->|对话指令| C[Patch Agent / Full Edit]
    B -->|手工 Edit| D[Save PRD.md]
    B -->|Regenerate 单步| E[对应 Agent 重跑]

    C --> F{propagateAfterEdit?}
    D --> G[用户手动 Regenerate 下游]
    E --> G

    F -->|是| H[runIncrementalDownstream]
    F -->|否| I[仅更新 PRD 步骤完成]

    H --> J[重生成 TRD / Design / QA / Verify]
    J --> K[extractPrdSpec 刷新结构化规格]
    K --> L[kickoffIncremental 增量任务拆解]
    L --> M[writeKickoffSnapshot 新基线]
    L --> N[writeSessionCheckpoint 标记 RERUN Task 为 failed]
    L --> O[写 CHANGES.md]

    G --> P[/api/agents/kickoff]
    P --> Q{检测到 PRD diff?}
    Q -->|是| L
    Q -->|否| R[executeKickoffOnly 全量拆解]

    N --> S[用户启动 Coding]
    S --> T[只执行 failed / NEW Task]
    T --> U[更新 last-coding-session.json]
```

---

## 5. 阶段详解

### 5.1 阶段一：PRD 编辑与版本管理

#### UI 能力（5/27–5/28 增强）

| 能力 | 说明 |
|------|------|
| 版本历史 | 每次 AI 编辑 / 手工保存推入 `prdHistoryRef`，显示 `N versions` |
| Diff 面板 | 左右版本对比，行级 + 词级 diff（GitHub 风格） |
| 变更高亮 | Patch 路径在渲染区用 `prd-changed-section` 包裹变更段 |
| 持久化 | 完成后自动 `save-doc` → `generated-code/PRD.md` |
| DB Snapshot | `project-step-snapshot` API 保存 PRD 步骤状态，刷新可恢复 |
| Memory Capture | Confirm PRD 时调用 `/api/memory/prd/capture`，记录用户是否大幅修改 AI 草稿 |

#### 关键代码

- UI：`src/app/(dashboard)/project/[projectId]/_steps/preparation/core-docs/prd/ui.tsx`
- Agent 载荷：`src/app/(dashboard)/project/[projectId]/_steps/preparation/core-docs/prd/agent.ts`
- Patch 应用：`src/lib/agents/pm/prd-patch.ts`

---

### 5.2 阶段二：下游文档传播

当 `propagateAfterEdit: true` 时，`PipelineEngine.runIncrementalDownstream()` 执行：

1. **读取** `last-kickoff-snapshot.json` 作为 diff 基线
2. **构建 RegenerationContext**（见 §6）
3. **按 Tier 重生成依赖文档**：
   - TRD（M/L Tier）
   - SysDesign（L Tier）
   - ImplGuide（M/L Tier）
   - Design Spec（始终）
   - QA + Verify（M/L Tier，与首轮 Pipeline 对齐）
4. **刷新 PRD Spec**：`extractPrdSpec()` → 写入 step metadata + `.blueprint/PRD_SPEC.json`
5. **增量 Kickoff** → `kickoffIncremental()`
6. **写 Session Checkpoint**（见 §5.4）
7. **更新 Kickoff Snapshot** 为新基线

> 手工编辑 + 仅 Regenerate TRD/Design 时，不会自动跑完整传播链，但 Task Breakdown Regenerate 仍会基于最新各文档做增量拆解。

---

### 5.3 阶段三：增量任务拆解

核心模块：

| 模块 | 职责 |
|------|------|
| `incremental-rerun.ts` | 纯函数：PRD diff → Task Delta → RegenerationContext |
| `kickoff-incremental.ts` | 调用 Task Breakdown Agent（INCREMENTAL 模式），合并任务列表 |
| `kickoff-task-breakdown.server.ts` | `incremental.existingTasks` + `requirementsToCover` 注入 Prompt |

#### Task Delta 规则

```
obsoleteTaskIds     = 任务覆盖的需求 ID 全部在 removed 中
taskIdsToRerun      = 任务覆盖的需求 ID 与 (removed ∪ modified) 有交集，且非 obsolete
requirementsNeedingNewTasks = added 中未被任何存活任务覆盖的 ID
```

**Cross-cutting 任务**（无 `coversRequirementIds`，如脚手架、Docker 配置）默认 **不** 标记 obsolete / rerun。

#### INCREMENTAL Task Breakdown Prompt

Agent 收到：

- 已有 Task 列表（视为 done）
- 仅需覆盖的新/变更 Requirement ID
- 最新 PRD / TRD / Design 全文

输出 **仅针对增量需求** 的新 Task，服务端 re-ID（`T-021`, `T-022`…）避免与旧 ID 冲突，再与存活 Task 合并。

#### UI 反馈

Task Breakdown 表格对增量结果打标：

- **NEW**（绿色）→ `metadata.newTaskIds`
- **RERUN**（琥珀色）→ `metadata.tasksToRerunIds`

---

### 5.4 阶段四：增量 Coding

传播或增量 Kickoff 完成后，Engine 调用：

```typescript
writeSessionCheckpoint(projectRoot, sessionId, checkpointMap, allTaskIds)
```

逻辑：

- `tasksToRerunIds` 中的 Task → `status: "failed"`
- 其余 Task → `status: "completed"`
- 写入 **项目根** `.blueprint/last-coding-session.json`（非 `generated-code` 子目录）

下次 Coding 启动时，现有 **Retry Failed Tasks** 机制只执行 `failedTaskIds`，已完成 Task 跳过。

**结果**：未受 PRD 变更影响的源码文件保持不动；仅 NEW / RERUN Task 对应的 `creates` / `modifies` 路径会被 Worker 触碰。

---

## 6. Diff 算法（核心）

### 6.1 需求 ID 级 Diff

```typescript
diffPrdRequirements(oldIdx, newIdx)
// → { added, removed, modified: [] }
```

从 PRD 正文提取 `FR-*` / `AC-*` / `US-*` / `IC-*` ID，做集合差集。

### 6.2 章节级 Diff（捕获纯文案修改）

```typescript
diffPrdSections(oldPrd, newPrd)
// → { changed, added, removed }
```

对 Markdown 按 ATX 标题切分，比较 section body 字符串。  
若某 changed section 的 body 中含双方索引都存在的 ID → 归入 `modified`。

**意义**：用户只改 AC 描述、API 路径、验收标准措辞，而不增删 ID 时，仍能触发相关 Task rerun。

### 6.3 RegenerationContext 汇总

```typescript
buildRegenerationContext({
  previousSnapshot,
  newRequirementIndex,
  newPrdContent,
})
```

输出：

| 字段 | 用途 |
|------|------|
| `affectedRequirementIds` | added + modified + removed 并集 |
| `prdDiff` | 三维 diff |
| `taskDelta` | obsolete / rerun / needs-new |
| `changedSectionHeadings` | 变更章节标题列表 |
| `previousSnapshot` | 下游 Agent 的旧文档上下文 |

---

## 7. 产物与可观测性

| 文件 | 位置 | 内容 |
|------|------|------|
| `PRD.md` | `generated-code/` | 当前 PRD 正文 |
| `CHANGES.md` | `generated-code/` | 本次增量：New tasks / Rerun tasks / Dropped / 触及文件列表 |
| `last-kickoff-snapshot.json` | `generated-code/.blueprint/` | Kickoff 基线（diff 锚点） |
| `last-coding-session.json` | `.blueprint/`（项目根） | Coding Task 完成状态 |
| `PRD_SPEC.json` | `generated-code/.blueprint/` | 结构化页面/组件/Domain 规格 |
| `pipeline-snapshot.json` | `.blueprint/` | 调试用 Pipeline 步骤快照 |

### CHANGES.md 示例结构

```markdown
# Incremental Changes

_Updated 2026-05-28T05:43:27.592Z from a PRD edit…_

## New tasks (2)
- **T-021** Add CSV export for audit log
  - creates: `backend/src/api/modules/admin/audit.export.ts`
  - modifies: `frontend/src/views/AdminAudit.tsx`

## Tasks to re-run (1)
- **T-005** Core API routes

## Obsolete tasks dropped (0)
_none_

## Files this increment touches (3)
- `backend/src/api/modules/admin/audit.export.ts`
- ...
```

当 PRD 改动未触发任何 Task 变化时，各节显示 `_none_`（如 2026-05-28 某次编辑记录）。

---

## 8. 实践案例：Stablecoin Scoring Platform（2026-05-27 ~ 2026-05-28）

### 8.1 项目基线

- **Tier M** 全栈应用（Koa + React + PostgreSQL + Redis）
- Kickoff 产出 **T-001 ~ T-020** 共 20 个 Task
- Snapshot 保存于 `generated-code/.blueprint/last-kickoff-snapshot.json`（2026-05-28 05:49 UTC 更新）
- Coding Session 全部 20 Task 标记 completed（session `39418935-…`）

### 8.2 5/27 工作：PRD 编辑体验

| Commit | 内容 |
|--------|------|
| `a982e3a` | PRD 版本化 Snapshot：save/load 到 `project-step-snapshot` |
| `5ad65fe` | Pipeline payload 携带 `editInstruction`；UI 版本计数展示优化 |

用户可在 PRD 页：

1. 对话修改 → 看 Diff → Confirm
2. 或手工 Edit → Save → 到 Task Breakdown 点 Regenerate

### 8.3 5/28 工作：PRD Knowledge + 增量验证

| Commit | 内容 |
|--------|------|
| `b86fa8a` ~ `ea8c9e1` | PRD Knowledge Base：LLM 抽取、approve/reject、Recall 注入 PRD Agent |
| `11d0518` | Page Coverage：PRD 有页面但无 Frontend Task 时自动补 Task |
| `2798b48` | Task Breakdown 强制 CRUD 完整性 + Demo Seed |
| `e1b0b5d` | Task Breakdown maxTokens 32768 → 64000（大 PRD 增量拆解） |

同日下午 PRD 编辑触发 `CHANGES.md` 更新，当次 diff 结果为 **0 新 Task / 0 Rerun**（改动未触及 Requirement ID 或章节 body，或改动已在当前 Task 覆盖范围内）。

---

## 9. 推荐操作手册（Step-by-Step）

### 场景 A：小功能追加（新增 FR）

1. 打开 PRD 页，输入：“Add FR-XX …（描述）”
2. 检查 Diff 面板确认变更章节
3. 依次 **Regenerate**（或一次性 propagate）：
   - TRD（若影响技术栈/API）
   - Design（若影响 UI）
   - **Task Breakdown**（必须）→ 查看 NEW 标记
4. 进入 Coding，选 **Retry Failed Tasks** 或正常启动（只会跑 NEW/RERUN）
5. 检查 `generated-code/CHANGES.md` 确认触及文件
6. 跑 TDD / Integration Gate

### 场景 B：修改验收标准 / 文案（ID 不变）

1. 手工 Edit PRD 或对话 “Update AC-03 to require …”
2. Task Breakdown → Regenerate（章节 diff 会标记 modified）
3. 关注 RERUN 标记的 Task
4. 增量 Coding

### 场景 C：删除功能（removed FR）

1. 对话或手工删除对应 FR / AC 段落
2. Regenerate Task Breakdown → 确认 obsolete Task 被 dropped
3. Coding 不会回滚已生成文件（ obsolete 仅不再调度）；如需物理删除需人工清理

---

## 10. 与 Memory / Knowledge 的联动

| 环节 | Memory 行为 |
|------|-------------|
| Confirm PRD | `/api/memory/prd/capture`：对比 original vs final，写入 `prd-pattern` |
| PRD Agent 生成 | Recall 活跃 `prd-knowledge` cases 注入 Prompt（5/28 上线） |
| Design 阶段 | Design Knowledge Base 提供行业参考 |
| Coding 结束 | `coding-session-report` 持久化到 Postgres（5/14+） |

二次开发时，PRD 越改越准：Knowledge 会积累 “这类 FinTech 项目的 PRD 通常需要哪些章节、用户常改什么”。

---

## 11. 限制与注意事项

1. **必须先有 Kickoff Snapshot**  
   否则增量拆解退化为全量 `executeKickoffOnly`。

2. **propagateAfterEdit 目前主要通过 Pipeline API 参数触发**  
   Project 页 PRD 对话编辑默认 **edit-only**（`pauseAfterPrd: true`），下游需用户分步 Regenerate；手工编辑后亦同。

3. **Obsolete Task 不自动删代码**  
   只从 Task 列表移除，磁盘上旧文件仍可能存在。

4. **Cross-cutting Task 不会因 PRD diff 自动 rerun**  
   如 Docker / 脚手架类 Task；若 PRD 改了部署架构，需手动 Regenerate 或全量 Kickoff。

5. **Checkpoint 写在项目根 `.blueprint/`**  
   与 `generated-code/.blueprint/` 的 Kickoff Snapshot 路径不同，排查时注意区分。

6. **大 PRD 增量拆解 Token 压力**  
   5/28 已将 Task Breakdown maxTokens 提至 64000；极端大 PRD 仍可能截断。

---

## 12. 关键源码索引

| 主题 | 路径 |
|------|------|
| Pipeline 主编排 | `src/lib/pipeline/engine.ts` |
| 增量 Diff 纯逻辑 | `src/lib/pipeline/incremental-rerun.ts` |
| 章节 Diff | `src/lib/pipeline/prd-section-diff.ts` |
| 增量 Kickoff | `src/lib/pipeline/kickoff-incremental.ts` |
| Kickoff Snapshot | `src/lib/pipeline/kickoff-snapshot.ts` |
| Session Checkpoint | `src/lib/pipeline/session-checkpoint.ts` |
| Kickoff API（增量检测） | `src/app/api/agents/kickoff/route.ts` |
| PRD Patch | `src/lib/agents/pm/prd-patch.ts` |
| PRD UI | `src/app/(dashboard)/project/[projectId]/_steps/preparation/core-docs/prd/ui.tsx` |
| Task Breakdown UI（NEW/RERUN） | `src/app/(dashboard)/project/[projectId]/_steps/kickoff/planning/task-breakdown/ui.tsx` |
| Step 执行入口 | `src/store/step-store.ts` |

---

## 13. 总结

PRD 二次开发的本质是 **三层增量**：

```
PRD 层   → Section Patch / 版本 Diff（改文档）
Task 层  → Requirement + Section Diff → Task Delta（改计划）
Code 层  → Session Checkpoint → 只跑 failed Task（改代码）
```

5/27–5/28 的工作重点在 **PRD 编辑体验**（版本化、Diff、Snapshot 持久化）和 **Knowledge 反哺 PRD 质量**；底层增量传播链路在此前的 Pipeline Engine 中已打通，并通过 Stablecoin 项目的 Snapshot / CHANGES.md / Coding Checkpoint 完成端到端验证。

后续可增强方向：

- PRD UI 一键 **「Save & Propagate Downstream」** 减少手动 Regenerate 步骤
- Obsolete Task 关联文件的自动清理建议
- B-phase 下游文档也改为 Section Patch，而非全量重生成
