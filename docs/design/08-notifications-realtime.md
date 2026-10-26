# 08 通知与实时

业务事务里写 `outbox` → worker 读出后：(1) `NOTIFY ce_events` 推给 SSE；(2) 按订阅和偏好生成 `notification_deliveries`，
交给 pg-boss 发送。失败指数退避重试 5 次，最终失败在运营台“发送记录”标红，可手动重发。同一事件幂等，不重复发送。

## 事件类型（枚举，不按文字判断）

| 事件 | 收件方 | 默认渠道 | 阶段 |
| --- | --- | --- | --- |
| `pre_notice.created` | 仓库、运营 | 站内 | 1 |
| `parcel.received` | 客户 | 站内 + WhatsApp（30 分钟内同一预报合并为一条） | 2 |
| `parcel.held` / `parcel.unclaimed_assigned` | 客户、运营 | 站内 + WhatsApp + 邮件 | 2 |
| `pre_notice.ready_for_choice` | 客户 | 站内 + WhatsApp | 2 |
| `consolidation.requested` | 仓库 | 站内 | 2 |
| `shipment.final_price_ready` | 客户 | 站内 + WhatsApp + 邮件 | 2 |
| `receivable.issued` / `payment.recorded` / `payment.reversed` / `refund.recorded` | 客户、财务 | 站内 + 邮件（附收据或发票） | 2 |
| `shipment.dispatched` / `arrived_nz` / `customs_held` / `delivery_failed` / `delivered` | 客户 | 站内 + WhatsApp | 2 |
| `shipment.status_corrected`（回退） | 客户 | 站内 + 说明 | 2 |
| `marketing.*` | 客户（需单独同意） | 按偏好 | 2 |

## 渠道

- 站内：`notifications` 表 + 未读计数；SSE 推送。
- 邮件：交易邮件服务商（SPF/DKIM），模板按语言。
- WhatsApp：Cloud API 的 utility 模板（需审核）；客户 24 小时内发过消息时可发自由文本。同意时间、来源页、文案版本要记录。
- 员工：站内 + 邮件。

## SSE

`GET /api/v1/events/stream`，按身份订阅：客户 → 自己的货件和包裹；仓库 → 仓库频道；运营 → 运营频道。
每 25 秒心跳；客户端 `Last-Event-ID` 断线续传（从 `shipment_events` 补发）。验收：入库提交后 5 秒内客户端可见。
