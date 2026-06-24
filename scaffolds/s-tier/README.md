# S-Tier Scaffold

小型纯前端单页应用脚手架：`React + TypeScript + Vite + Tailwind v4 + React Router`。

- 包管理器：`pnpm`
- UI 组件：内置 shadcn-ui（`src/components/ui/`），图标用 `lucide-react`
- 设计 token：`src/styles/tokens.css`（Tailwind v4 `@theme`，由 design 阶段生成并复制到位）
- 测试：Vitest（单测）+ Playwright（e2e）
- 路径别名：`@` → `src`

## UI 与样式约定（建议）

> 这些是建议，不是构建门禁，不影响编译与评分。

- **优先用语义 token**：颜色/间距/圆角/字号优先用 `tokens.css` 暴露的语义工具类（`bg-primary`、`text-muted`、`rounded-md`、`p-4`、`text-lg`）。仅在确无对应 token 时才回退任意值（`bg-[#...]`）。
- **优先复用 shadcn 组件**：界面用 `@/components/ui` 下的 shadcn 组件构建；交互元素（按钮/输入/选择/弹窗）优先用 shadcn，而非裸 `<button>/<input>`。
- **缺组件就自造**：脚手架预装了常用组件（Button / Input / Label / Textarea / Card / Badge / Dialog）。需要更多组件时，用 `npx shadcn@latest add <name>` 添加，或在 `components/ui/` 手写（可用 Radix 原语）；同样优先 `cn()` + 语义 token，尽量避免行内 `style={{}}`。
