# L-Tier Scaffold

## 1. 项目概览

这是 L-tier（大规模 / 生产级）项目的脚手架。技术栈与 M-tier 完全一致，差异化在**规模和生产化能力**：

- `frontend`：基于 `React + TypeScript + Vite + Tailwind` 的前端应用
- `backend`：基于 `Koa + TypeScript + Sequelize + PostgreSQL` 的后端 API 服务
- `frontend`、`backend` 包管理器均使用 `pnpm`
- 已内置后台任务（worker / queue）、结构化日志（pino）、请求日志、限流、Redis 接入、双栈 docker-compose
- 内置可选 Stripe 支付 overlay（`_optional/payment-stripe`，按需复制，见 §6）
- `PRD.md`：产品需求文档示例

L-tier 与 M-tier 的核心差异：

| 维度           | M-tier             | L-tier                                                                               |
| -------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Worker / Queue | 无                 | 内置 `src/workers/` + `src/queue/`，默认 in-process，`USE_REDIS_QUEUE=1` 切到 BullMQ |
| 日志           | `console.log`      | pino 结构化日志 + 请求级 `requestId` 关联                                            |
| 限流           | 无                 | `createRateLimit()` 中间件，按窗口 / Key 配置                                        |
| Docker         | backend + frontend | postgres + redis（默认）+ backend + frontend（`--profile full`）                     |
| 测试           | Playwright e2e     | Playwright e2e + 后端 vitest（按需扩展）                                             |
| 前端工具       | `apiClient`        | `apiClient` + `safeArray` / `mapSafe` 工具，强制 null-safe                           |

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
  {
    mapSafe(data?.cards, (card) => <Card key={card.id} card={card} />);
  }
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

## 6. 支付系统（可选 Stripe overlay）

支付能力以**可选 overlay** `_optional/payment-stripe/` 提供，命中触发条件时才复制进生成项目，不会污染不需要支付的项目。详细说明见 [`_optional/payment-stripe/README.md`](./_optional/payment-stripe/README.md)，本节是面向代码生成阶段的上下文摘要。

### 6.1 定位与触发

- 形态：**Stripe Hosted Checkout**——后端创建 Checkout Session 返回 `url`，前端整页重定向到 Stripe 托管的支付页。**不引入前端 Stripe.js SDK**。
- 同时支持一次性付款（`mode=payment`）与订阅（`mode=subscription`）。
- 触发键（`_optional/manifest.json` 的 `payment-stripe.triggerEnvKeys`）：`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `VITE_STRIPE_PUBLISHABLE_KEY`。任一出现在 `.blueprint/resource-requirements.json` 即激活。
- 依赖：后端 `stripe ^17.0.0`（manifest 自动合并）；前端无新增依赖。

### 6.2 复制进项目的文件

| 路径                                                      | 职责                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `backend/src/config/stripe-env.ts`                        | 读取并校验 Stripe 密钥与回调 URL，`assertStripeEnv()` dev 警告 / prod 退出。  |
| `backend/src/stripe/client.ts`                            | 懒初始化单例 `Stripe` 客户端（`getStripe()`）。                               |
| `backend/src/models/Payment.ts`                           | 支付记录模型。金额为最小货币单位整数；`userId` 可空、无强关联。               |
| `backend/src/models/PaymentEvent.ts`                      | webhook 事件表，`stripeEventId` 唯一约束做幂等键。                            |
| `backend/src/api/modules/payments/payments.controller.ts` | `createCheckoutSession` / `getCheckoutSession` / `handleStripeWebhook`。      |
| `backend/src/api/modules/payments/payments.routes.ts`     | `registerPaymentRoutes(apiRouter)`，相对路径注册。                            |
| `backend/src/workers/paymentReconcileWorker.ts`           | 可选对账 worker，演示把重业务移出 webhook 同步路径，默认不注册。              |
| `frontend/src/api/payments-client.ts`                     | 封装 `apiClient` 的支付 API，导出明确类型。                                   |
| `frontend/src/hooks/usePayments.ts`                       | `usePayments()`（导出 `UsePaymentsReturn`），`startCheckout()` 发起并重定向。 |

### 6.3 Worker 必须手动接线的 3 处

该 overlay **不覆盖**任何共享文件（`app.ts` / `api/modules/index.ts` / `models/index.ts` / `workers/index.ts`），因为它们可能同时被 auth overlay 拥有。所以文件落地后需手动接线：

1. **注册路由**——在 `backend/src/api/modules/index.ts` 的 `createApiRouter()` 内：
   ```ts
   import { registerPaymentRoutes } from "./payments/payments.routes";
   registerPaymentRoutes(apiRouter);
   ```
2. **导出模型**——在 `backend/src/models/index.ts` 中 `export { Payment } from "./Payment";` 与 `export { PaymentEvent } from "./PaymentEvent";`，确保 `syncModels()` 建表。
3. **填 `backend/.env`**——`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`（前端 `VITE_STRIPE_PUBLISHABLE_KEY` 在 Hosted Checkout 下非必需）。

### 6.4 支付硬规则（codegen 必须遵守）

- **webhook 用 `ctx.request.rawBody` 做签名校验**，禁止用已解析的 `ctx.request.body`。base 的 `koa-bodyparser` 已保留 `rawBody`（见 `backend/src/types/koa.d.ts`），因此**无需覆盖 `app.ts`、无需路由级 raw parser**。
- webhook handler 必须 `ctx.state.skipEnvelope = true`，对 Stripe 返回裸 `200`（ack）/ `400`（验签失败）；不要为"已处理但无关"的事件 `throw`（会变 500，Stripe 无限重投）。
- 用 `PaymentEvent.stripeEventId` 唯一约束做幂等：handler 先插事件行，唯一冲突即"已处理 → ack 返回"。Stripe 会重投同一事件。
- 金额一律用最小货币单位（cents）整数存储，对齐 Stripe `amount_total`，禁止浮点。
- `Payment.userId` 可空且无 Sequelize 关联，保证无鉴权项目可用；有鉴权项目先把 `ctx.state.user.id` 解析成 DB user row 再关联（OAuth 的 `ctx.state.user.id` 是外部 ID，非主键）。
- 重业务（发货、发票、积分、对账）下沉到 `paymentReconcileWorker.ts`，不要在 webhook 同步路径里 `await` 长流程。
- 路由用相对路径注册，最终 URL 在 base 是 `/api/payments/...`，应用 auth overlay 后是 `/api/v1/payments/...`；用 v1 前缀时同步把 `frontend/src/api/payments-client.ts` 的 `PAYMENTS_BASE` 改为 `"/v1/payments"`。

---

## 7. 后端架构说明

### 7.1 技术栈

- Node.js + TypeScript + Koa + Sequelize + PostgreSQL
- 队列：BullMQ（Redis 后端）/ in-process EventEmitter（默认）
- 日志：pino + pino-pretty
- 测试：Vitest（按需扩展）

### 7.2 后端目录结构

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

### 7.3 后端分层职责

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

#### Schema = models（无迁移）

Sequelize models 是 schema 的唯一真理源——**没有 migrations，也没有 migration runner**。`syncModels()` 在启动时跑 `sequelize.sync()`，直接按 model 定义建表。次级索引（`init()` 选项里的 `indexes: [{ fields: [...] }]`）和外键（列上的 `references` + `onDelete`）必须声明在 model 上，否则 `sync()` 不会创建。本地迭代可用 `DB_SYNC_FORCE=true`（drop 重建）或 `DB_SYNC_ALTER=true`（改表）；CI / preview 留空即可——每次用全新库。

JSONB 列的默认值**禁止**写成 `defaultValue: {}` 或 `defaultValue: []`：

- Model.init：`defaultValue: () => ({})`（`sync()` 会下发同样的 DDL）

---

## 8. 编码规范

- 导入类型必须 `import type`。
- 前端样式优先 Tailwind，禁止新增独立 CSS 文件。
- 注释一律英文。
- 任何来自 API 的数组在前端使用前必须 `safeArray()`。
- 任何自定义 hook 必须导出 `UseXxxReturn` 显式接口。
- 后端 `console.log` 仅限调试期，提交前替换为 `ctx.state.log` 或模块级 `logger`。

---

## 9. 开发与运行

### 9.1 一站式开发栈

```bash
# 启动 postgres + redis
docker compose up -d

# 启动 backend（hot reload）
cd backend && pnpm install && pnpm dev
# → http://localhost:4000

# 启动 frontend（hot reload）
cd frontend && pnpm install && pnpm dev
# → http://localhost:5173
```

### 9.2 全栈 docker（生产镜像 sanity check）

```bash
docker compose --profile full up --build
# backend → :4000, frontend → :8080
```

### 9.3 单元测试

```bash
cd backend && pnpm test     # vitest
cd frontend && pnpm test:e2e  # Playwright（在 frontend/e2e/）
```

### 9.4 Stripe 本地联调（仅当应用了 payment-stripe overlay）

```bash
# 转发 Stripe 事件到本地 webhook，并打印签名密钥（填入 STRIPE_WEBHOOK_SECRET）
stripe listen --forward-to localhost:4000/api/payments/webhook
# 应用 auth overlay 后路径为 /api/v1/payments/webhook

# 另开一个终端，模拟一次完成的结账
stripe trigger checkout.session.completed
```

断言：验签通过、`PaymentEvent` 仅插入一次（重投不产生重复副作用）、对应 `Payment.status` 翻为 `paid`。

---

## 10. 当前前后端职责边界

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

## 11. 目录规范总结

1. 启动入口与业务实现分离（`server.ts` 不写业务）。
2. 路由定义与业务处理分离（`*.routes.ts` 不直接写业务逻辑）。
3. 后台任务一定经 `queue/` + `workers/`，不要在 HTTP handler 里 `await` 长流程。
4. 通用能力集中放 `config/`、`middlewares/`、`utils/`。
5. 优先按业务资源拆目录，避免技术类型无序堆叠。
6. 新增功能时，优先在现有 module 内扩展，再决定是否抽通用层。

## UI 与样式约定（建议）

> 这些是建议，不是构建门禁，不影响编译与评分。

- **优先用语义 token**：颜色/间距/圆角/字号优先用 `tokens.css` 暴露的语义工具类（`bg-primary`、`text-muted`、`rounded-md`、`p-4`、`text-lg`）。仅在确无对应 token 时才回退任意值（`bg-[#...]`）。
- **优先复用 shadcn 组件**：界面用 `@/components/ui` 下的 shadcn 组件构建；交互元素（按钮/输入/选择/弹窗）优先用 shadcn，而非裸 `<button>/<input>`。
- **缺组件就自造**：脚手架预装了常用组件（Button / Input / Label / Textarea / Card / Badge / Dialog）。需要更多组件时，用 `npx shadcn@latest add <name>` 添加，或在 `components/ui/` 手写（可用 Radix 原语）；同样优先 `cn()` + 语义 token，尽量避免行内 `style={{}}`。
