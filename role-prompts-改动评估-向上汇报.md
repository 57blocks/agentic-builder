# role-prompts.ts 改动测试评估报告

> 单次 A/B 测试对比,样本量 N=1。两次会话使用同一前端 ToDo 项目作为输入。

| 项 | 内容 |
|---|---|
| 改动文件 | `src/lib/langgraph/role-prompts.ts` |
| 改动内容 | Compass Engineering skill 库回填:**9 条 always-on 规则**(安全/API 契约/DB/可观测性/日期处理 等)+ **3 条 conditional 规则**(认证加固/支付/限流幂等)+ frontend 内联补充 + `hasPayment` 谓词 |
| 改动量 | +196 / -3 行,文件由 717 → 909 行 |
| Before(基线) | git `bc4542f`,Session `40edeed5-5dec-42b8-8be9-0883d1c5fe52`,2026-06-11 00:44:48Z |
| After(改后) | git `284101e` + 未提交改动,Session `ede29290-f4dc-4ac5-8210-351f30d59ed7`,2026-06-11 02:39:43Z |
| 测试项目 | 同一份前端 ToDo PRD(F-01~F-05 五个硬需求,**无后端、无 auth、无 payment、无 background-jobs**) |

---

## 一、TL;DR

**总分边际正向 +2(71→73,大概率噪声范围)**,**初稿质量提升 +4(32→36)**,**最终可用性提升 +6(49→55)**;**但代价显著**:运行时间 +31%、tokens +20%、整合修复迭代 +67%、代码量 3.4×。

**两次会话仍然 FAIL**,而且失败的根因(integration 卡死、E2E 缺 Playwright 配置)**与本次改动不在同一条因果链上** —— 那是 orchestrator 层面的问题,不在 role-prompts.ts 的射程内。

本次改动里 **9 条 always-on 规则中有 5 条对本项目空跑**(后端规则但项目无后端),是上下文预算的纯成本。后续若改成条件化触发,净效果会显著改善。

---

## 二、核心指标对比

### 1. 综合评分(权重最高)

| 指标 | Before (bc4542f) | After (with edits) | Δ | 解读 |
|---|---:|---:|---:|---|
| **Overall score** | 71/100 (C) | 73/100 (C) | **+2** | 边际正向,**单次 A/B 下大概率在噪声范围内** |
| Status | FAIL | FAIL | 同 | 两次都未通过整合 / E2E 关口 |
| **Final usability**(权重 35%) | 49/100 (F) | 55/100 (F) | **+6** | 改动方向上最强的正向信号 |
| **Generated baseline**(初稿) | 32/100 (F) | 36/100 (F) | **+4** | 最直接反映生成 prompt 质量的指标,与改动方向吻合 |
| Code Quality(权重 20%) | 93/100 (A) | 92/100 (A) | -1 | 噪声 |
| Requirement coverage(权重 15%) | 100/100 (A) | 100/100 (A) | 同 | 两次都覆盖了所有硬需求 |
| First-Pass Success(权重 10%) | 100/100 (A) | 100/100 (A) | 同 | 两次首过率均 100% |
| Evidence completeness | 85/100 (B) | 85/100 (B) | 同 | — |
| Repair burden | 0/100 (F) | 0/100 (F) | 同 | 整合修复负担两次都打满,与改动无关 |
| Session health | 42/100 (F) | 42/100 (F) | 同 | 健康度未变 |
| Cost/speed | 75/100 (C) | 75/100 (C) | 同 | 评分相同,但绝对值变差(见下) |

### 2. 代码质量子项(LLM judge + 静态检查)

| 指标 | Before | After | Δ | 解读 |
|---|---:|---:|---:|---|
| Static checks (tsc + ESLint) | 100/100 (A) | 100/100 (A) | 同 | 两次都干净 |
| Complexity | 80/100 (B) | 80/100 (B) | 同 | 都有 5–7 个超长函数 |
| Duplication (jscpd) | 99/100 (A) | 96/100 (A) | -3 | 代码量翻倍后重复率从 0.4% 上升到 1.2% |
| Type safety | 100/100 (A) | 100/100 (A) | 同 | TS 严格度一致 |
| Modularity (madge) | 100/100 (A) | 100/100 (A) | 同 | — |
| Readability (LLM 判定) | 85/100 (B) | 85/100 (B) | 同 | — |
| Idiomaticity (LLM 判定) | 90/100 (A) | 90/100 (A) | 同 | — |
| Architecture (LLM 判定) | 88/100 (B) | 88/100 (B) | 同 | — |

### 3. 资源消耗(改动的代价)

| 指标 | Before | After | Δ | 解读 |
|---|---:|---:|---:|---|
| **Total duration** | 90m 22s | **118m 12s** | **+28m (+31%)** | 显著变慢 |
| **Total LLM calls** | 203 | **270** | **+67 (+33%)** | 调用数大幅上升 |
| **Total LLM tokens** | 5,615,952 | **6,710,205** | **+1,094,253 (+19.5%)** | 单次 prompt 变大 + 修复迭代增加共同推高 |
| **Integration fix iterations** | 85 | **142** | **+57 (+67%)** | 接近翻倍,是耗时上升的主因 |
| **Scaffold fix attempts** | 10 | 12 | +2 | 噪声 |
| Repair events 总数 | 331 | 393 | +62 | 自愈尝试更多 |

### 4. 流水线异常信号(改动是否引入新副作用)

| 指标 | Before | After | Δ | 解读 |
|---|---:|---:|---:|---|
| **stagnation_warning**(worker 反复读不写) | 19 | **46** | **+27 (+142%)** | 翻三倍,与上下文变大紧密相关 |
| stagnation_fallback_injected | 1 | 4 | +3 | 兜底机制更频繁触发 |
| **doc_truncated**(关键文档被裁剪) | 4 | 5 | +1 | 上下文预算占用上升,**改动前已预警** |
| contract_usage_coverage_audit | 1 | 2 | +1 | 噪声 |
| runtime_integration_audit | 2 | 4 | +2 | 内部审计执行更多次 |

### 5. 输出规模

| 指标 | Before | After | Δ | 解读 |
|---|---:|---:|---:|---|
| **Total LoC** | 9,590 | **32,807** | **3.4×** | 同一个 ToDo 应用,代码量翻 3 倍 |
| Files generated | 71 | 86 | +15 | 文件数也变多 |
| 前端 LoC | 940 | 823 | -117 | 前端有效产出反而略少 |
| 后端 LoC | 0 | 0 | 同 | 项目本就无后端 |
| Test files | 9 | 8 | -1 | 噪声 |
| Backend endpoints | 0 | 0 | 同 | — |

### 6. TDD 与质量门

| 指标 | Before | After | Δ | 解读 |
|---|---:|---:|---:|---|
| Integration verify | FAIL | FAIL | 同 | 两次都未过(但失败模式不同) |
| Runtime verify | SKIPPED | SKIPPED | 同 | 都被整合失败级联跳过 |
| E2E verify | FAIL | FAIL | 同 | 两次都缺 Playwright 配置 |
| Feature audit | PASS | PASS | 同 | 硬需求全覆盖 |
| TDD Manifest 存在 | 是 | 是 | 同 | — |
| TDD RED evidence | **0/4** | **4/4** | **+4** | **大幅改善,但几乎确定与本次改动无关**(改动不涉及 TDD 证据采集) |
| TDD GREEN passed | 4/4 | 4/4 | 同 | — |
| Blocking P0 TDD gaps | 2 | 0 | -2 | 由 RED evidence 修复带来,见上 |

---

## 三、Δ 归因汇总

| 类别 | 信号 | 是否归因于本次改动 |
|---|---|---|
| 综合分提升 +2 | Overall 71→73 | ⚠️ 边际,大概率噪声 |
| 初稿质量 +4 | Baseline 32→36 | ✅ **大概率有关** — 直接反映 worker prompt 改进 |
| 可用性 +6 | Usability 49→55 | ✅ **大概率有关** — baseline 上升的传导 |
| 时长 +31% | 90m→118m | ✅ 有关 — 上下文变大、修复迭代更多 |
| Tokens +20% | 5.6M→6.7M | ✅ 有关 — 同上 |
| 修复迭代 +67% | 85→142 | ✅ 有关 — 上下文紧张 → stagnation → 修复链路 |
| 代码量 3.4× | 9,590→32,807 LoC | ✅ 有关 — 新规则鼓励防御性代码(AbortController、Zod、四态分支) |
| TDD RED 0→4 | 重大正向 | ❌ **几乎确定无关** — 改动不涉及 TDD 证据采集层 |
| 两次 FAIL 同样原因 | integration 卡 + E2E 缺配置 | ❌ **不在改动射程内** — 属 orchestrator / architect 层问题 |

---

## 四、关键判断

1. **改动方向上的信号是正向的**(baseline +4, usability +6, 数值统一指向同方向),但**幅度太小**,单次 A/B 不足以排除噪声 —— 严肃结论需要 N=3~5 次对比。

2. **代价显著且可解释**:本次新增 12 条规则中,**5 条后端规则在无后端项目里属于纯空跑**,白白占用 worker 30K 字符的上下文预算,挤压了 PRD / 实现上下文,触发 doc_truncated +1 → stagnation +27 → integration 迭代 +57 → 时长 +28m。

3. **本次失败与本次改动无关**:报告里给出的两条 HIGH 修复建议(`verify-fix-stagnation`、`gate-cascade-skip`)都指向 [supervisor.ts](src/lib/langgraph/supervisor.ts) 的整合修复策略;另一条是 architect 阶段未生成 Playwright 配置。**这些都是不同模块的工作**。

4. **TDD 大幅修复(0→4 → 0)是误读的伪信号**:改动并未触及 TDD 证据采集代码路径,该提升应归功于在两次会话间合入的另一次提交(`284101e` "fix: wrong worker agent indicator"),或单纯是 LLM 的随机性。**不可将其计入本次改动的功劳**。

---

## 五、结论与下一步

### 本次改动评级

| 维度 | 评级 |
|---|---|
| 改动方向(rule 内容质量) | ✅ 合理,与行业最佳实践对齐 |
| 改动落地(代码工程) | ✅ TS 通过、测试通过、零回归 |
| **当前项目(纯前端)的净 ROI** | ⚠️ **轻度负** — 边际收益被上下文成本抵消 |
| 后端 / 全栈项目的预期 ROI | ✅ 预计正 — 真正受益于安全 / API / DB / 可观测性规则 |

### 建议

| 优先级 | 行动 | 预期收益 |
|---|---|---|
| **P0** | 把 5 条后端 always-on 规则改成 **`hasBackend()` 条件触发**(检测 `outputDir/backend` 目录是否存在)。改动约 30 行,纯优化、零风险。 | 在纯前端项目上恢复原版的上下文体量,doc_truncated / stagnation / 修复迭代 应回落 |
| **P1** | 跑 **N=5** 次 A/B 对比(同一 PRD、连续运行),取 baseline / usability / duration 的均值 | 确认 +2 / +4 / +6 是稳定信号还是单次噪声 |
| **P2** | **修复本次的实际瓶颈**(与 role-prompts.ts 无关): supervisor.ts 的整合修复 prompt + stagnation 策略(报告 Recommended #1)、跨 gate 失败级联策略(#2)、architect 必须为含 E2E 需求的 PRD 生成 Playwright 配置(#4) | 真正能把 FAIL 推向 PASS |

---

## 附:为什么 +2 可能是噪声

每次 LLM 流水线运行都有内在随机性(不同的工具调用顺序、不同的修复路径、不同的截断决策)。在没有种子固定的情况下,两次完全相同输入的运行也常常出现 ±2~3 分的总分差。**单次 A/B 无法将真实信号从噪声中分离**;这是行业惯例,与本次评估的客观性无关。建议在 N=5 之后再下严肃结论。

---

**改动归档:**

- 改动详情见 git diff `HEAD -- src/lib/langgraph/role-prompts.ts`(+196 / -3 行)
- 完整 A/B 报告原文与逐节剖析:[role-prompts-ab-report-2026-06-11.md](role-prompts-ab-report-2026-06-11.md)
- 改动 ROI 预估与 Compass skill 库对照详情:对话历史
