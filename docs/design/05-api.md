# 05 API

REST + JSON，前缀 `/api/v1`。**契约先行**（ADR 0003）：第 1 阶段接口写在 `frontend/openapi/openapi.json`，后端实现后
`pnpm openapi` 必须生成同样的文件（契约测试），前端据此生成类型安全的客户端。改接口先改契约。

## 约定

- 认证：`Authorization: Bearer <Supabase access token>`。公开接口（线索记录；报价预估待 DECISION(A4)）允许匿名，但限流。
- 错误：RFC 7807 `application/problem+json`，含 `type`、`title`、`detail`、`code`（业务错误码）。
- 写接口支持 `Idempotency-Key`（UUID）；仓库、运营、账务、webhook 写接口**必须**带。
- 乐观锁：会改状态的请求带 `expectedVersion`，冲突返回 409。
- 分页：游标 `?cursor=&limit=`。金额以字符串传输（`"26.00"`），避免浮点。
- 角色守卫 `@Roles(...)`；员工接口要求 JWT 中 `aal = aal2`（已完成 MFA）。
- 字段白名单：同一资源按角色返回不同 DTO；`warehouse` DTO 不含电话、完整地址、邮箱。

## 接口清单（第 1–2 阶段）

| 方法 路径 | 角色 | 阶段 | 说明 |
| --- | --- | --- | --- |
| `GET /me` | customer | 1 | 资料、会员号、唛头写法 |
| `POST /me/identities/link` | customer | 1 | 已登录状态下绑定新登录方式 |
| `POST /auth/whatsapp/start` · `/auth/whatsapp/confirm` | public | 1 | 仅在 WhatsApp 反向验证 spike 通过后实现（见 06） |
| `POST /quotes/estimate` | customer（DECISION(A4) 签“匿名可报价”后改为 public） | 1 | 三种产品一次返回；登录后保存快照 |
| `POST /quotes/fcl` | customer（同 A4） | 1 | FCL 预估；运价表过期返回 `REQUIRES_REVIEW` + `FCL_RATE_EXPIRED` |
| `GET /fcl/ports` | customer | 1 | 起运港（常用 / 其他）、目的港、运价表版本和有效期 |
| `GET /destinations/cities?region=` · `GET /destinations/postcodes/{postcode}` | customer | 1 | 先选大区再选城市；城镇不在列表时按邮编查区域 |
| `GET /quotes/:id` | owner / staff | 1 | 返回快照及其 `input`（预报取目的地） |
| `POST /leads/touch` | public | 1 | 记录来源参数和漏斗阶段 |
| `POST /pre-notices` · `GET /pre-notices` · `PATCH /pre-notices/:id/trackings` | customer | 1 | 预报、补快递单号 |
| `GET /warehouse-address` | customer | 1 | 含会员号的中文地址文本 |
| `GET /admin/rate-cards` · `POST /admin/rate-cards/:id/drafts` · `POST /admin/rate-versions/:id/simulate` · `POST /admin/rate-versions/:id/publish` | admin | 1 | 发布需 MFA，写审计 |
| `POST /wh/parcels/scan` | warehouse | 2 | 扫码查匹配，不写入 |
| `POST /wh/parcels` | warehouse | 2 | 入库（幂等）；返回内部包裹号、标签 |
| `POST /files/upload-url` | warehouse / customer | 2 | 签发 Storage 上传地址 |
| `POST /wh/parcels/:id/photos` · `PATCH /wh/parcels/:id/measurements` · `POST /wh/parcels/:id/hold` | warehouse | 2 | |
| `GET /wh/unclaimed` · `POST /ops/parcels/:id/assign` | warehouse / nz_ops | 2 | 无主包裹 |
| `GET /shipments` · `GET /shipments/:id` | customer | 2 | 客户面板 |
| `POST /pre-notices/:id/handling-choice` | customer | 2 | 单独 / 合并 / 合并拆包 |
| `POST /wh/consolidations/:id/start` · `/complete` | warehouse | 2 | 完成时生成最终价快照 |
| `POST /shipments/:id/confirm-final` | customer | 2 | 生成应收单 |
| `POST /ops/shipments/:id/transition` | nz_ops / warehouse | 2 | 状态机迁移，回退需 reason |
| `POST /ops/price-adjustments` · `/:id/approve` | nz_ops / admin | 2 | |
| `POST /finance/payments` · `/:id/reverse` · `/allocations` · `/refunds` | finance | 2 | 人工收款闭环 |
| `POST /finance/receivables/:id/invoice` · `/invoices/:id/void-and-reissue` | finance | 2 | 税务发票 PDF |
| `POST /finance/shipments/:id/release-override` | finance + admin 审批 | 2 | 未足额放货 |
| `GET /events/stream` | 已登录 | 2 | SSE |
| `GET /me/notifications` · `PUT /me/notification-prefs` | customer | 2 | |
| `GET /ops/dashboard` · `GET /ops/search?q=` · `GET /ops/leads/funnel` | nz_ops | 2 | |
| `POST /auth-hooks/send-sms` | Supabase Auth Hook（签名校验） | 1 | 把手机验证码改由 WhatsApp 认证模板发送 |
| `POST /webhooks/whatsapp` | WhatsApp（签名校验） | 1–2 | |

契约已补全（2026-10-27，前端先行）：除上表外还定义了 `GET /staff/me`（员工角色）、`GET /pre-notices/:id/handling`、
`POST /shipments/:id/payments` 与 `GET /payments/:id`（第 3 阶段在线支付）、`/me/billing-entities`、`/me/addresses`、
`POST /me/notifications/read`、`GET /wh/parcels/:id`、`GET /wh/consolidations`、`GET /wh/dispatch`、`PUT /ops/shipments/:id/tracking`、
`POST /ops/shipments/:id/notes`、`/ops/notification-deliveries`、`/ops/customers/:id`（含合并）、`/finance/release-overrides`、
`/finance/reconciliation`、`/admin/staff`、`/admin/audit-logs`、`/admin/fcl-rate-sheets`、`/admin/reports/summary`。
状态迁移接口返回精简的 `TransitionResult`，因为仓库角色也调用它（发运），不能拿到客户联系方式。

第 3 阶段新增：`POST /shipments/:id/payments`（网关会话）、`POST /webhooks/:provider`、Xero 同步任务、
`/admin/fcl-rates`、Facebook / 短信登录。
