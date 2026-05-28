# L-Tier Scaffold

## 1. 项目概览

这是 L-tier（大规模 / 生产级）项目的脚手架。技术栈与 M-tier 完全一致，差异化在**规模和生产化能力**：

- `frontend`：基于 `React + TypeScript + Vite + Tailwind` 的前端应用
- `backend`：基于 `Koa + TypeScript + Sequelize + PostgreSQL` 的后端 API 服务
- `frontend`、`backend` 包管理器均使用 `pnpm`
- 已内置后台任务（worker / queue）、结构化日志（pino）、请求日志、限流、Redis 接入、双栈 docker-compose
- `PRD.md`：产品需求文档示例

L-tier 与 M-tier 的核心差异：

| 维度 | M-tier | L-tier |
|------|--------|--------|
| Worker / Queue | 无 | 内置 `src/workers/` + `src/queue/`，默认 in-process，`USE_REDIS_QUEUE=1` 切到 BullMQ |
| 日志 | `console.log` | pino 结构化日志 + 请求级 `requestId` 关联 |
| 限流 | 无 | `createRateLimit()` 中间件，按窗口 / Key 配置 |
| Docker | backend + frontend | postgres + redis（默认）+ backend + frontend（`--profile full`）|
| 测试 | Playwright e2e | Playwright e2e + 后端 vitest（按需扩展）|
| 前端工具 | `apiClient` | `apiClient` + `safeArray` / `mapSafe` 工具，强制 null-safe |

> ⚠️ 适用边界：单 backend 进程承载的复杂业务、需要后台 pipeline / SSE 推送 / 多源聚合 / 限流的项目，选 L-tier。如果只是 CRUD demo，请选 M-tier 以避免不必要的复杂度。

---

## 2. 整体架构

### 2.1 架构分层

项目采用典型的前后端分离 + 后台任务模式：

1. 前端：页面渲染、路由、登录态、调用后端 API、SSE 订阅长任务进度。
2. 后端 HTTP 层：认证鉴权、请求日志、限流、业务编排、API 暴露。
3. 后端 Worker 层：BullMQ / in-process 队列消费，承载耗时 pipeline（聚合 / 扫描 / 拉取 / LLM 调用）。
4. 数据层：PostgreSQL（主库），Redis（队列 + 缓存可选）。

### 2.2 前后端通信方式

- 前端统一通过 `frontend/src/api/client.ts` 调用后端
- 请求前缀 `/api`（Vite dev server 代理转发到 `http://localhost:4000`）
- 长任务通过 `enqueueJob()` 返回 `run_id`，前端走 SSE / 轮询订阅状态
- `inproc:` 开头的 `run_id` 走内存订阅；UUID 形式走 BullMQ + DB

---

## 3. 根目录结构

```text
project/
├── backend/                # 后端服务
├── frontend/               # 前端应用
├── _optional/              # 可选 scaffold（auth-privy 等），按需复制
├── docker-compose.yml      # 本地一站式开发栈
├── PRD.md
└── README.md
```

---

## 4. 前端架构说明

### 4.1 技术栈

- React 19 + TypeScript + Vite + React Router
- Tailwind CSS
- 测试：Playwright（e2e）

### 4.2 前端目录结构

```text
frontend/
├── public/                 # 静态资源
├── e2e/                    # Playwright 测试
├── src/
│   ├── api/                # API 客户端 + null-safe 工具
│   │   ├── client.ts       # 统一 fetch 封装、鉴权头、错误处理
│   │   └── safeArray.ts    # null-safe 数组工具（强制使用，见 §4.4）
│   ├── components/         # 通用 UI 组件
│   ├── context/            # 全局上下文（AuthContext 等）
│   ├── providers/          # AppProviders
│   ├── views/              # 页面级视图组件
│   ├── App.css / index.css
│   ├── main.tsx            # 应用入口
│   └── router.tsx          # 路由配置
├── vite.config.ts
└── package.json
```

### 4.3 前端目录职责

- `src/api`：API 请求封装。按业务继续拆分（`projects.ts`、`tasks.ts`、`comments.ts`）。
- `src/api/client.ts`：通用 `fetch`、鉴权头注入、错误处理。
- `src/api/safeArray.ts`：null-safe 数组工具（见 §4.4）。
- `src/context`：全局共享状态（认证等）。
- `src/views`：页面级组件。复杂页面可按页面建子目录。
- `src/router.tsx`：路由统一管理。
- `src/main.tsx`：挂载 React、注入全局样式和顶层 Provider。

### 4.4 前端编码硬规则

- **null-safe array iteration**：任何来自 API 的数组渲染前都必须经过 `safeArray()` 或 `mapSafe()`：
  ```tsx
  import { mapSafe } from "@/api/safeArray";
  {mapSafe(data?.cards, (card) => <Card key={card.id} card={card} />)}
  ```
  禁止直接 `data.cards.map(...)`，即使 TS 类型声明为 `Foo[]`，运行时仍可能 `undefined`。
- **hook 必须导出明确返回类型**：
  ```ts
  export interface UseDashboardDataReturn { data: DashboardData; loading: boolean; }
  export function useDashboardData(): UseDashboardDataReturn { ... }
  ```
  避免 View 层猜测字段名导致的 `data.cards` vs `data.stablecoins` 漂移。
- 导入类型必须 `import type`。
- 样式优先 Tailwind。

---

## 5. 鉴权系统

默认基线为邮箱 + 密码登录（JWT）。如需 OAuth（Privy / Clerk / Auth0），从 `_optional/auth-privy` 应用脚手架后会覆盖 `app.ts`、注入 `privyAuthMiddleware`、并交付前端 `PrivyProvider` + `usePrivyAuthBridge`。

OAuth 项目的硬规则：`ctx.state.user.id` 是**外部 provider ID（如 Privy DID）**，不是数据库主键。每个 handler 必须先 `User.findOne({ where: { privy_id: ctx.state.user.id } })` 解析到 DB row，再用 `user.id` 做 FK 查询，否则 Postgres 会抛 `invalid input syntax for type uuid: "did:privy:..."`。

---

## 6. 后端架构说明

### 6.1 技术栈

- Node.js + TypeScript + Koa + Sequelize + PostgreSQL
- 队列：BullMQ（Redis 后端）/ in-process EventEmitter（默认）
- 日志：pino + pino-pretty
- 测试：Vitest（按需扩展）

### 6.2 后端目录结构

```text
backend/
├── src/
│   ├── api/
│   │   └── modules/                # 按业务资源划分的 API 模块
│   │       ├── health/
│   │       ├── auth/
│   │       └── index.ts            # 路由统一注册入口
│   ├── config/
│   │   ├── env.ts                  # 环境变量
│   │   └── logger.ts               # pino 日志器
│   ├── database/
│   │   ├── migrations/             # SQL / umzug migration 文件
│   │   └── runMigrations.ts
│   ├── middlewares/
│   │   ├── cors.ts
│   │   ├── errorHandler.ts
│   │   ├── requestLogger.ts        # 请求级结构化日志 + requestId
│   │   └── rateLimit.ts            # 窗口限流（默认内存，可换 Redis）
│   ├── models/                     # Sequelize 模型 + syncModels()
│   ├── queue/
│   │   ├── index.ts                # selector：按 USE_REDIS_QUEUE 切换实现
│   │   ├── inProcessQueue.ts       # in-process 实现（单 replica 默认）
│   │   └── redisQueue.ts           # BullMQ + Redis 实现（多 replica）
│   ├── workers/
│   │   ├── index.ts                # startAllWorkers() 启动入口
│   │   └── exampleWorker.ts        # 参考实现（按业务替换）
│   ├── types/                      # Koa 类型扩展
│   ├── utils/                      # 通用工具
│   ├── app.ts                      # Koa 装配
│   ├── db.ts                       # 数据库连接
│   └── server.ts                   # 启动入口
├── .env.example
├── Dockerfile
└── package.json
```

### 6.3 后端分层职责

#### `src/server.ts`
轻量启动入口：`initDb()` → `syncModels()` → `startAllWorkers()` → `app.listen()`。每一步出错直接 `process.exit(1)`。
**重要**：`startAllWorkers()` 必须在 `app.listen()` 之前调用。否则 HTTP handler 在窗口期内调用 `enqueueJob()` 会抛 `No worker registered for queue X`。

#### `src/app.ts`
应用级装配：注册中间件（`requestLogger` 必须**最先**挂载，让 `ctx.state.log` 在错误处理之前已就绪）、注册业务路由。

#### `src/config/logger.ts`
pino 实例。常用模式：
```ts
import { logger, childLogger } from "@/config/logger";
const log = childLogger({ feature: "feed-aggregator", runId });
log.info({ topic, source }, "ingest started");
log.error({ err }, "external API failed");
```
- 第一个参数是结构化对象，最后才是人类可读的消息。
- 敏感字段（password / authorization / cookie）已在 redact 列表里自动脱敏。

#### `src/middlewares/requestLogger.ts`
为每个请求生成 / 解析 `X-Request-Id`，挂到 `ctx.state.log`，请求结束时按状态码自动选择日志级别输出。**所有 handler 内部应优先用 `ctx.state.log` 而非全局 logger**，确保同一请求的日志关联。

#### `src/middlewares/rateLimit.ts`
窗口限流中间件。基于 IP（默认）或自定义 keyFn：
```ts
const expensiveLimiter = createRateLimit({ windowMs: 60_000, max: 10 });
apiRouter.post("/refresh-feed", expensiveLimiter, refreshHandler);
```
默认内存存储，单进程够用；多 replica 部署请换 Redis 后端（接口保持一致）。

#### `src/queue/`
统一的队列抽象，selector 在 `queue/index.ts` 按 `USE_REDIS_QUEUE` 切换实现：

- `USE_REDIS_QUEUE=0`（默认）→ `inProcessQueue.ts`，Promise + EventEmitter，无 Redis 依赖，单 replica 跑路径最短。
- `USE_REDIS_QUEUE=1` → `redisQueue.ts`，BullMQ + Redis，多 replica 安全，跨进程 / 跨节点共享队列。

两个实现暴露**相同**的 API（`enqueueJob` / `registerWorker` / `getJob` / `subscribeJob` / `inFlightCount` / `drainInFlight`），所有 caller 只需 `import` selector：

```ts
import { enqueueJob, registerWorker } from "@/queue";

// 注册（在 src/workers/<name>Worker.ts）
registerWorker("feed-ingest", async (job, emit) => {
  emit("progress", { step: 1, total: 3 });
  return { story_count: 42 };
});

// 入队（在 controller / service）
const runId = await enqueueJob("feed-ingest", { userId, topic });
// in-process: runId = "inproc:abc-def-..."
// redis     : runId = "12" (BullMQ numeric id)
```

切换策略由部署决定，不要在 worker / controller 里判断 `process.env.USE_REDIS_QUEUE` —— selector 已经处理。
`drainInFlight(timeoutMs)` 在 `server.ts` 的 SIGTERM handler 中调用，保证优雅关停时不会丢正在跑的任务。

#### `src/workers/`
每个后台任务对应一个文件，所有 worker 在 `src/workers/index.ts` 的 `startAllWorkers()` 中统一注册。Worker 硬规则：

1. 同一个 `run_id` 端到端使用，**不允许**在 worker 里 `randomUUID()` 覆盖。
2. 总是返回结构化结果（不要 `void`），状态接口才能落库 payload。
3. 真失败才 `throw`；**空结果（zero rows from all sources）必须正常完成**，由前端渲染 "empty" 占位，不要抛 `NO_SOURCES` / `AGGREGATION_FAILED`。
4. 用 `childLogger({ queueName, jobId, userId })` 让每行日志都带相同的关联键。

#### `src/api/modules`
按业务资源拆分：
- `*.routes.ts`：URL → 处理函数映射（`registerXxxRoutes(apiRouter)`）
- `*.controller.ts`：参数解析、调用 service、组装响应
- `*.service.ts`：业务逻辑、数据库 / 外部依赖访问

每个 domain 一个 registrar，禁止跨文件注册同一 path。

#### `src/database/migrations/`
schema 的唯一真理源。文件命名 `NNNN_snake_case.sql` 或 `.ts`，单调递增。`syncModels()` 默认 `alter: false`；只有 `DB_SYNC_ALTER=true` 才会启用 `alter`（仅本地快速同步用，**不要**在生产打开）。

JSONB 列的默认值**禁止**写成 `defaultValue: {}` 或 `defaultValue: []`：
- Model.init：`defaultValue: () => ({})`
- queryInterface.createTable：`defaultValue: qi.sequelize.literal("'{}'::jsonb")`

---

## 7. 编码规范

- 导入类型必须 `import type`。
- 前端样式优先 Tailwind，禁止新增独立 CSS 文件。
- 注释一律英文。
- 任何来自 API 的数组在前端使用前必须 `safeArray()`。
- 任何自定义 hook 必须导出 `UseXxxReturn` 显式接口。
- 后端 `console.log` 仅限调试期，提交前替换为 `ctx.state.log` 或模块级 `logger`。

---

## 8. 开发与运行

### 8.1 一站式开发栈

```bash
# 启动 postgres + redis
docker compose up -d

# 启动 backend（hot reload）
cd backend && pnpm install && pnpm migrate && pnpm dev
# → http://localhost:4000

# 启动 frontend（hot reload）
cd frontend && pnpm install && pnpm dev
# → http://localhost:5173
```

### 8.2 全栈 docker（生产镜像 sanity check）

```bash
docker compose --profile full up --build
# backend → :4000, frontend → :8080
```

### 8.3 单元测试

```bash
cd backend && pnpm test     # vitest
cd frontend && pnpm test:e2e  # Playwright（在 frontend/e2e/）
```

---

## 9. 当前前后端职责边界

### 前端负责
- 页面展示与交互
- 路由控制
- 登录态存储
- 调用 API（包括 SSE 订阅长任务）
- 基础错误提示与空态渲染

### 后端负责
- 认证鉴权
- 请求日志 / 限流
- 业务规则处理
- 数据库操作
- 后台任务编排
- 接口权限控制

---

## 10. 目录规范总结

1. 启动入口与业务实现分离（`server.ts` 不写业务）。
2. 路由定义与业务处理分离（`*.routes.ts` 不直接写业务逻辑）。
3. 后台任务一定经 `queue/` + `workers/`，不要在 HTTP handler 里 `await` 长流程。
4. 通用能力集中放 `config/`、`middlewares/`、`utils/`。
5. 优先按业务资源拆目录，避免技术类型无序堆叠。
6. 新增功能时，优先在现有 module 内扩展，再决定是否抽通用层。
