# 09 账务：应收、人工收款、发票、在线支付

第 2 阶段用银行转账 + 人工确认收款在奥克兰试运行，账务闭环必须完整；第 3 阶段接在线支付和 Xero，复用同一套模型。

## 第 2 阶段流程

1. 客户确认最终价 → 生成 `receivable`（行项目来自最终价快照 + 合并费用行，每行税码；开票主体快照）。
2. 客户银行转账，参考号 = 应收单号。
3. 财务录入 `payment`（金额、日期、参考号、凭据截图）→ 分配到一张或多张应收 → 应收状态自动更新。
4. 足额 → 货件 `released`；未足额需要 `release_overrides`（财务申请 + 管理员审批）。
5. 财务开具税务发票 PDF（人工触发，固定模板，按行税码计算 GST），发给客户。

## 纠错

| 情况 | 处理 |
| --- | --- |
| 收款录错 | 冲销（新建 reversal 记录，原行状态 `reversed`），重新录入；写审计 |
| 多付 | 退款或留作下一票抵扣（客户余额） |
| 实际退钱 | `refunds` 记录金额、关联款项、操作人、凭据；和“冲销”分开 |
| 发票开错 | 作废重开（新发票 `replaces_invoice_id`）或开贷项通知单；原发票不改 |
| 最终价确认后需加收 | 按 DECISION(E4) 需客户再次同意 → 新的补充应收单 |

## 发票

- 编号规则：`INV-YYYY-NNNNNN`（序列，不重用）；贷项 `CN-YYYY-NNNNNN`。
- 必备信息：供应方名称和 GST 号、日期、编号、买方信息、每行描述、不含税金额、税码、GST 金额、合计。
- 资料来源：业主提供 GST 号、模板、会计师确认的逐项税务表（DECISION(F1)），第 2 阶段开工前到位。
- FCL：USD 运费和 NZD 本地费用开两张（DECISION(F3)）。

## 第 3 阶段：在线支付

- `PaymentProvider` 接口：`createCheckout(receivable) → redirectUrl`、`parseWebhook(req) → PaymentEvent`、`refund(payment, amount)`。
- 候选：Windcave（单网关覆盖卡、Apple/Google Pay、支付宝、微信、银联、网银）或 Stripe（卡、钱包、支付宝）+ Latipay（微信、网银）。
- 回调：校验签名 → 写 `webhook_events` → 按网关事件 ID 去重 → 在事务里记 `payment` + 分配 → 发通知。结果页只显示“处理中”，以回调为准；定时任务补偿丢失的回调。
- Xero：发票、付款、贷项通知单经 outbox 异步同步；每日三方对账（网关结算、平台、Xero）。
