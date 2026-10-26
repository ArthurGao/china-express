# 02 数据模型（PostgreSQL / Prisma）

以附件二的实体关系为准。主键 UUID（v7）；对外编号（会员号、货件号、发票号）用序列生成。金额 `numeric(12,2)`，
重量 `numeric(9,3)` kg，尺寸 `numeric(7,1)` cm，体积 `numeric(9,4)` m³。所有表带 `created_at`、`updated_at`；
需要乐观锁的表带 `version int`。Prisma 模型名用 PascalCase，表名 snake_case（`@@map`）。

## 身份

| 表 | 关键字段 | 约束 / 备注 |
| --- | --- | --- |
| `customers` | `id`, `auth_user_id`（Supabase `auth.users.id`，唯一）, `member_no`（唯一）, `display_name`, `email`, `phone_e164`, `locale`, `status` | `member_no` = `CE-` + 6 位序列 + 1 位校验位（Luhn mod 10），由 `member_no_seq` 生成，永不重用 |
| `customer_identities` | `customer_id`, `provider`（`email`/`google`/`whatsapp`/`phone`/`facebook`）, `subject`, `verified_at` | 唯一 `(provider, subject)`；一个客户多个身份 |
| `billing_entities` | `customer_id`, `type`（`individual`/`company`）, `legal_name`, `gst_number`, `address jsonb`, `is_default` | 第 2 阶段起使用 |
| `addresses` | `customer_id`, `label`, `line1..`, `city`, `postcode`, `region`（`AKL`/`NI_OTHER`/`SI`）, `zone_id` | 收货地址 |
| `staff_users` | `auth_user_id`（唯一）, `name`, `role`（`admin`/`warehouse`/`nz_ops`/`finance`）, `active` | 员工必须开启 TOTP（见 06-auth） |

## 报价与费率

| 表 | 关键字段 | 约束 / 备注 |
| --- | --- | --- |
| `rate_cards` | `product`, `name` | 每个产品一张 |
| `rate_card_versions` | `rate_card_id`, `version`, `status`（`draft`/`published`/`retired`）, `effective_from`, `effective_to`, `payload jsonb`, `published_by`, `published_at` | 发布后不可改（触发器拒绝 UPDATE payload）；`payload` 结构见 04 |
| `zones` / `postcodes` / `cities` | 邮编 → 区域（1,305 个邮编、81 个区域）、NAL 分类、附加费、`quote_on_request bool` | 由 seed 从原始 Fliway 表导入 |
| `fcl_rate_sheets` / `fcl_rates` | 航线、起运港、目的港、20/40 尺、USD 运价、`valid_from`, `valid_to`, `version` | 第 1 阶段由开发导入并记录版本 |
| `quotes` | `customer_id?`, `lead_id?`, `kind`（`estimate`/`final`/`fcl_estimate`）, `input jsonb`, `rate_version_ids uuid[]`, `engine_version`, `result jsonb`, `status`（`ok`/`requires_review`）, `expires_at` | **插入后不可修改**（触发器）；`result.lines[]` 每行带 `taxCode` |

## 预报、包裹、合并、货件

| 表 | 关键字段 | 约束 / 备注 |
| --- | --- | --- |
| `pre_notices` | `customer_id`, `product`, `destination jsonb`, `expected_parcels int?`, `estimate_quote_id`, `prohibited_goods_ack_at`, `status` | 提交前必须确认禁运品告知 |
| `pre_notice_trackings` | `pre_notice_id`, `carrier?`, `tracking_no` | 客户可后补 |
| `parcels` | `parcel_no`（内部唯一，如 `P2610-000123`）, `pre_notice_id?`（空 = 无主）, `customer_id?`, `carrier?`, `tracking_no?`, `piece_no?`, `received_at`, `weight_kg`, `length_cm`, `width_cm`, `height_cm`, `condition`, `damage_note`, `flags text[]`（`consolidatable`/`over_25kg`/`oversize`）, `status`, `version` | 唯一 `(carrier, tracking_no, piece_no)`（DECISION(D6)）；**快递单号不是主键** |
| `parcel_photos` | `parcel_id`, `storage_path`, `kind`（`label`/`overview`/`damage`）, `taken_by` | |
| `consolidations` | `customer_id`, `product`, `mode`（`consolidate`/`consolidate_unpack`）, `status`, `requested_at`, `completed_by`, `version` | |
| `consolidation_inputs` | `consolidation_id`, `parcel_id` | 唯一 `parcel_id`（一个包裹只进一个有效作业） |
| `consolidation_charges` | `consolidation_id`, `code`（`handling`/`carton`/`unpack`）, `qty`, `unit_amount`, `amount`, `tax_code` | DECISION(C4) |
| `outbound_packages` | `package_no`, `shipment_id?`, `consolidation_id?`, `weight_kg`, `l/w/h`, `status` | |
| `outbound_package_sources` | `outbound_package_id`, `parcel_id` | 原包裹到新包装的对应关系；单独发货时 1:1 |
| `shipments` | `shipment_no`, `customer_id`, `product`, `destination jsonb`, `status`, `final_quote_id?`, `final_confirmed_at?`, `released_at?`, `version` | 一票一种运输方式（DECISION(D4)） |
| `shipment_events` | `shipment_id?`, `parcel_id?`, `type`（枚举）, `from_status`, `to_status`, `actor_type`, `actor_id`, `reason`, `occurred_at` | 只追加；也是客户时间线数据源 |

## 账务（第 2 阶段起）

| 表 | 关键字段 | 约束 / 备注 |
| --- | --- | --- |
| `receivables` | `receivable_no`, `shipment_id`, `customer_id`, `billing_entity_snapshot jsonb`, `currency`, `total`, `status`, `issued_at` | 作废需原因和审批，不删除 |
| `receivable_lines` | `receivable_id`, `code`, `description`, `amount_ex_tax`, `tax_code`, `tax_rate`, `tax_amount` | 来源于最终价快照 + 附加费 |
| `payments` | `payment_no`, `customer_id`, `method`（`bank_transfer`/…）, `amount`, `currency`, `reference`, `received_at`, `recorded_by`, `evidence_path`, `status`（`recorded`/`reversed`） | 撤销 = 新的冲销记录，不改原行 |
| `payment_allocations` | `payment_id`, `receivable_id`, `amount` | 一笔款对多张应收 |
| `refunds` | `payment_id`, `amount`, `reason`, `paid_at`, `evidence_path`, `recorded_by` | 实际退钱的记录，和“撤销”分开 |
| `invoices` | `invoice_no`（序列，按编号规则）, `receivable_id`, `kind`（`tax_invoice`/`credit_note`）, `issued_at`, `pdf_path`, `data_snapshot jsonb`, `replaces_invoice_id?` | 发出后不可改；更正 = 作废重开或贷项 |
| `release_overrides` | `shipment_id`, `approved_by`, `reason` | 未足额放货的例外审批 |

## 平台

| 表 | 用途 |
| --- | --- |
| `price_adjustments` | 调价申请：申请人、原因、前后金额、审批人、状态 |
| `notifications` / `notification_deliveries` / `notification_prefs` / `message_templates` | 见 08 |
| `leads` / `lead_touches` | 来源参数（`src`/`utm_*`/`c`/`ref`）、漏斗阶段 |
| `idempotency_keys` | `key`, `scope`, `request_hash`, `response jsonb`, `created_at`（保留 24 小时） |
| `outbox` | 业务事务内写入的领域事件，由 worker 投递到 pg-boss / NOTIFY |
| `audit_logs` | `actor`, `action`, `entity`, `entity_id`, `before jsonb`, `after jsonb`, `reason`, `ip`；数据库角色只允许 INSERT |
| `webhook_events` | 外部回调原文、签名校验结果、处理状态，可重放 |

## 数据库层强制

- `quotes`、`invoices`、`audit_logs`、`shipment_events`、已发布的 `rate_card_versions.payload`：触发器拒绝 UPDATE/DELETE。
- 所有 `public` 表 `enable row level security`，不建 `anon`/`authenticated` 策略。
- 字段脱敏不靠 RLS：仓库角色的接口 DTO 不包含 `phone_e164`、完整地址（见 05 的字段白名单）。
- 搜索：`pg_trgm` 索引于 `member_no`、`tracking_no`、`parcel_no`、`shipment_no`、`display_name`。
- 保留期：照片和个人信息按业主确认的保留期由定时任务删除（第 1 阶段确定字段和期限）。
