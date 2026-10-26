# ADR 0003：先定 API 契约（contract-first OpenAPI），前端先行

- 状态：已接受（2026-10-26）
- 关联：`05-api.md`、`07-frontend.md`、`frontend/openapi/openapi.json`
- 编号说明：0002 留给第 0 周的广州仓库网络实测（T0.1）

## 背景

业主要求先做前端、后端稍后。原设计是后端生成 OpenAPI、前端据此生成客户端；后端不存在时前端没有数据来源。
同时硬规则不变：浏览器里不能有价格逻辑，生产代码里不能有 mock。

## 决定

- 第 1 阶段的接口先手写成 `frontend/openapi/openapi.json`（OpenAPI 3.1），作为前后端的契约。后端实现后，
  `pnpm openapi` 必须生成同样的文件；后端 CI 加契约测试，生成结果与此文件不一致即失败。之后改接口先改契约。
- 前端用 `openapi-typescript` 生成类型，`openapi-fetch` + `openapi-react-query` 调用。生成文件提交到仓库，
  CI 检查生成结果与契约一致。
- 开发和测试用 MSW 返回契约里的 `examples`（逐字照搬，不计算，不随输入变化）。金额示例取自 `04-pricing-engine.md`
  的算例（如奥克兰 7 kg 海运小包 26.00），由后端引擎负责产生。
- MSW 只在 `NEXT_PUBLIC_API_MOCKING=enabled` 时存在：`next.config.ts` 把 `ce-mock-worker` 别名到真实 worker
  （仅浏览器环境），否则指向空实现；`pnpm check:bundle` 在生产构建里搜索 MSW 特征字符串，找到即失败。
- 登录不 mock：本地用 Supabase CLI（Docker）跑 Auth，邮箱验证码由 Mailpit 接收，员工 TOTP 是真实流程。
- 契约里补了设计 05 缺的接口：`GET /destinations/cities`、`GET /destinations/postcodes/{postcode}`、
  `GET /fcl/ports`；`Estimate` 返回其 `input`（预报需要目的地）；报价项状态增加 `UNAVAILABLE`。

## 后果

- 前端可以独立完成并测试第 1 阶段的所有页面；接后端时只需关闭 mock。
- 契约成为单一来源，后端实现必须遵守它，而不是反过来生成它；改接口的成本前移到契约评审。
- mock 只展示文档化的示例，不能验证"服务端独立计算"和实时推送；这两项验收（篡改测试、5 秒可见）要等后端。
