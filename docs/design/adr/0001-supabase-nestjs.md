# ADR 0001：Supabase（悉尼）+ NestJS 后端 + Next.js 前端

- 状态：已接受（2026-10-26）
- 取代：早期设计中的 AWS 新西兰区域 + RDS + 自建认证 + Redis/BullMQ

## 背景

业主已有 Supabase 悉尼部署，广州仓库经 AWS 专线访问。交接说明要求浏览器里不得有价格逻辑，员工需要角色权限和审计。

## 决定

- Supabase 提供 Postgres、Auth、Storage；不使用 Supabase Realtime 和 Edge Functions；WhatsApp 验证码用 Auth 的 Send SMS Hook（HTTP 类型）指向后端端点 `POST /api/v1/auth-hooks/send-sms`。
- 所有业务数据经 NestJS；前端只用 supabase-js 做登录。
- Prisma migrate 是唯一的表结构所有者；RLS deny-all 作为纵深防御。
- 队列用 pg-boss，实时用 SSE + LISTEN/NOTIFY，不引入 Redis。

## 后果

- 权限、字段脱敏、价格逻辑都在后端，便于测试；代价是不能用 Supabase 的自动 REST 和 RLS 省掉后端代码。
- 连接要区分池连接（应用查询）和直连（迁移、LISTEN、pg-boss）。
- 若以后需要 Redis（高并发 SSE 广播），只替换 realtime 和 queue 两个 infra 模块。
