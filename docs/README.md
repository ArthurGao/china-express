# ChinaExpress docs

| Folder / file | What it is | Who edits |
| --- | --- | --- |
| `requirements/handover-zh.pdf` | 原始需求：开发交接说明（中文版），2026-10-24 | 不改 |
| `decisions/pricing-decisions-and-entities.md` | 附件一计价决策表 + 附件二实体关系与状态转换表（待业主签字） | 业主 + 开发负责人 |
| `decisions/open-items.md` | 尚未签字、代码里用默认值实现的决定清单 | 开发 |
| `design/01-architecture.md` | 总体架构、部署、环境 | 开发 |
| `design/02-data-model.md` | 数据表、字段、约束 | 开发 |
| `design/03-state-machines.md` | 包裹、合并作业、货件、付款四条状态线 | 开发 |
| `design/04-pricing-engine.md` | 报价引擎、舍入、快照、测试算例 | 开发 |
| `design/05-api.md` | API 约定和接口清单 | 开发 |
| `design/06-auth.md` | 客户和员工登录、角色、WhatsApp 登录 | 开发 |
| `design/07-frontend.md` | 页面、路由、仓库端交互、i18n | 开发 |
| `design/08-notifications-realtime.md` | 事件、通知渠道、实时推送 | 开发 |
| `design/09-billing.md` | 应收、人工收款、发票、第 3 阶段在线支付 | 开发 |
| `design/10-testing-acceptance.md` | 测试分层和各阶段验收场景 | 开发 |
| `design/11-stage-plan.md` | 三个阶段的任务清单（Claude Code 按这个做） | 开发 |
| `design/adr/` | 架构决策记录 | 开发 |
| `planning/plan.html` | 分阶段开发计划（给人看，含工时） | 人 |
| `planning/risks.html` | 18 个难点和解决办法（给人看） | 人 |

## 优先级

签字后的决策表 > design 文档 > stage plan > planning 页面 > 原始 PDF。冲突时按这个顺序，并在 design 里留记录。

## 在线版本

- 计价决策表与实体关系表（可在线填写）：https://claude.ai/artifact/4ZWS7mxi3DJzvpTA9h6ggu
- 早期详细技术设计（2026-10-25，部分已被本目录取代，见下）：https://claude.ai/artifact/A1MwpR5ej3aniwK4zsvDjW
- 难点：https://claude.ai/artifact/6N91yZCRBck2SFAEq126Fg · 计划：https://claude.ai/artifact/6WhEpoorgUtJk5788mbbHi

早期设计文档里 AWS 新西兰区域 + RDS、自建登录、Redis/BullMQ 的部分，已被本目录的 Supabase 悉尼方案取代；
难点分析、报价算例和支付方案比较仍然有效。
