# ADR 0004：演示构建（不依赖后端和 Supabase 单独部署前端）

- 状态：已接受（2026-10-27）
- 关联：ADR 0003、`07-frontend.md`、`frontend/src/lib/demo.ts`、`frontend/src/lib/auth/demo-auth.ts`
- 修订：ADR 0003 中"mock 只用于开发和测试"放宽为：也可用于单独标记的**演示构建**，仍然不进入正式构建

## 背景

业主希望后端开发之前，先把前端单独部署出来，用于看流程和演示。正式构建会请求后端 API，登录依赖 Supabase；
这两样都还没有时，正式构建无法单独运行。

## 决定

- 新增演示构建：`pnpm build:demo` 会设置 `NEXT_PUBLIC_DEMO=enabled`、`NEXT_PUBLIC_API_MOCKING=enabled`、
  `NEXT_PUBLIC_API_BASE_URL=/api/v1`。
  - 接口：用 MSW 返回契约示例。示例照搬契约，不做计算，不随输入变化。
  - 登录：在浏览器内完成。别名 `ce-auth-client` 在演示构建中指向 `demo-auth.ts`，在其他构建中指向真实的 Supabase 客户端。任意邮箱、密码和 6 位数字验证码都能登录；登录状态存在 cookie
    `ce-demo-session` 里，`proxy.ts` 照常执行相同的路由规则：报价前必须登录（A4 ★），员工必须完成 TOTP，达到 aal2。
  - 不连接 Supabase，不连接后端，不收集任何真实数据。
- 每页顶部常驻"演示 / 示例数据"横幅，说明价格是固定算例；页面 metadata 设为 `noindex, nofollow`。
- 正式构建不受影响：非演示构建中，`ce-auth-client` 指向真实的 Supabase 客户端，`ce-mock-worker` 指向会抛错的空实现。
  `pnpm check:bundle` 在正式构建中搜索 `[MSW]`、`mockServiceWorker` 和 `[CE-DEMO]`，找到即失败。
- 演示部署放在 Vercel，开启访问保护。staging 和 production 永远不设置 `NEXT_PUBLIC_DEMO`。

## 后果

- 业主和客户不需要后端，也能走完第 1 阶段的完整流程。
- 演示价格是固定算例（如奥克兰 7 kg 海运小包 26.00），**不是报价**。横幅写明了这一点。
  不能为了"更像真的"在前端算价（硬规则 1）。
- 多了一种构建形态需要维护：CI 每次都会构建演示版；`pnpm e2e:demo` 在没有 Supabase 的条件下跑通客户和员工的主流程。
