# 03 状态机

后台维护四条状态线，再映射成客户看到的 7 步进度。每个迁移由对应模块的 `*StateMachine` 服务执行：检查前置条件和
角色 → 在一个事务里更新状态、`version + 1`、写 `shipment_events`、写 `outbox` → 返回新状态。
“回退”列中标 **待确认** 的需业主签字（附件二）；未签字前按表中默认实现并在 open-items 记录。

## 包裹 Parcel

| 从 → 到 | 触发 | 角色 | 前置条件 |
| --- | --- | --- | --- |
| （新建）→ `expected` | 客户提交预报并登记快递单号 | customer | — |
| `expected` / 无 → `received` | 扫码、拍照、称重完成 | warehouse | 至少 1 张照片；重量、三边齐全 |
| 无 → `unclaimed` | 扫码后匹配不到预报和会员号 | warehouse | — |
| `unclaimed` → `received` | 客户认领或运营指派 | nz_ops | 指定 customer + pre_notice |
| `received` → `held` | 发现破损、违禁品 | warehouse | 原因必填 |
| `held` → `received` / `returned` | 运营处理 | nz_ops | 原因必填 |
| `received` → `awaiting_choice` | 预报下包裹到齐，或客户标记“已全部发出” | system | — |
| `awaiting_choice` → `packed` | 合并作业完成，或客户选单独发货且已生成出库包装 | system | — |
| `packed` → `awaiting_choice` | 合并作业取消 | nz_ops | 回退，**待确认** |
| `packed` → `dispatched` | 所属货件已发运 | system | 不可回退 |
| 测量数据更正 | 改重量/尺寸 | warehouse | 留前后值；不能删除包裹 |

## 合并作业 Consolidation

| 从 → 到 | 触发 | 角色 | 前置条件 |
| --- | --- | --- | --- |
| （新建）→ `requested` | 客户选择合并或合并拆包 | customer | 资格校验：同客户、同产品、非超大件、单包 ≤ 25 kg（A2）；跨预报按 D2 |
| `requested` → （删除请求） | 客户改选 | customer | 作业未开始 |
| `requested` → `in_progress` | 仓库开始 | warehouse | — |
| `in_progress` → `completed` | 输出包装重测完成、费用行录入 | warehouse | 每个输出包装 ≤ 25 kg；生成最终价快照 |
| `completed` → `cancelled` | 客户拒绝最终价 | nz_ops | 费用归属按 D5；**待确认** |
| 修正 | 发现录错 | warehouse | 只能新建修正作业，不改原记录 |

## 运输货件 Shipment

| 从 → 到 | 触发 | 角色 | 前置条件 |
| --- | --- | --- | --- |
| （新建）→ `awaiting_final_confirmation` | 出库包装确定 | system | 生成 `final` 报价快照 |
| → `awaiting_payment` | 客户确认最终价 | customer | 快照未过期；生成应收单 |
| `awaiting_payment` → `awaiting_final_confirmation` | 重算 | nz_ops | 作废应收单 + 原因；**待确认** |
| `awaiting_payment` → `released` | 足额到账或例外审批 | finance / system | `release_overrides` 需审批人 |
| `released` → `dispatched` | 装柜或交航空 | warehouse | 不可回退 |
| `dispatched` → `arrived_nz` | 到港/到机场 | nz_ops | — |
| `arrived_nz` → `customs_clearing` → `customs_held`? → `out_for_delivery` | 清关、扣留、派送 | nz_ops | 扣留需原因 |
| `out_for_delivery` → `delivery_failed` → `out_for_delivery` | 派送失败重派 | nz_ops | — |
| `out_for_delivery` → `delivered` | 签收 | nz_ops | — |
| 任意发运前状态 → `cancelled` | 取消 | nz_ops | 原因必填；有收款需处理退款 |

## 付款 Receivable（第 2 阶段）

| 状态 | 进入条件 | 角色 | 回退 |
| --- | --- | --- | --- |
| `issued` | 客户确认最终价 | system | 作废需原因和审批 |
| `partially_paid` | 分配金额 < 应收 | finance | 可冲销错误分配，留记录 |
| `paid` | 分配金额 = 应收 | finance / 支付回调 | 冲销需审批 |
| `overpaid` | 分配金额 > 应收 | finance | 退款或留作下一票抵扣 |
| `refunded` | 退款记录完成 | finance | 不可回退 |
| `void` | 作废 | finance | 不可回退 |

## 客户 7 步进度映射

| 客户进度 | 内部状态 |
| --- | --- |
| 1 Pre-notice sent | 预报已提交 |
| 2 At warehouse | 包裹 `received` / `awaiting_choice` / `packed`；合并作业任意 |
| 3 Final price | 货件 `awaiting_final_confirmation` |
| 4 Paid | 应收 `paid`，或货件 `released` |
| 5 In transit | 货件 `dispatched` |
| 6 Arrived in NZ | `arrived_nz` / `customs_clearing` / `customs_held` / `out_for_delivery` / `delivery_failed` |
| 7 Delivered | `delivered` |

`unclaimed`、`held`、`customs_held`、`delivery_failed`、`partially_paid` 不占步骤，在当前步骤上显示异常提示。
每次回退都要：写 `audit_logs`（原因必填）、写时间线事件、按 08 的规则决定是否通知客户（默认：通知并说明更正）。
