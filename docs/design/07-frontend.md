# 07 前端（Next.js）

一个 Next.js 应用，两块界面：客户网站（英文、手机优先）和员工控制台（`/staff`，仓库中文、运营和管理中英）。
页面流程和文案以原型为参考：https://gleeful-eclair-72d527.netlify.app/test.html （客户界面英文文案原样沿用，
不复制原型代码）。

## 路由

```
src/app/
  (customer)/
    page.tsx                    落地 + 登录入口（记录 src / utm_* / c / ref）
    login/                      邮箱验证码、Google、WhatsApp
    quote/                      三种方式并排报价（不预选）
    quote/fcl/                  FCL 预估
    pre-notice/[id]/            预报成功：仓库地址复制、补快递单号
    shipments/  shipments/[id]/ 客户面板：多票货、7 步进度、照片、处理方式选择、最终价确认（第 2 阶段）
    account/                    资料、登录方式绑定、开票主体（第 2 阶段）、通知偏好
  staff/
    login/                      邮箱 + 密码 + TOTP
    admin/rates/                价格管理：草稿、试算、发布（第 1 阶段）
    warehouse/                  扫码入库、无主包裹、合并作业、出库（第 2 阶段，中文）
    ops/                        看板、搜索、货件推进/回退、备注、线索漏斗、追踪链接（第 2 阶段）
    finance/                    收款、分配、退款、发票（第 2 阶段）
  api/                          仅放 Next 自身需要的路由（如 auth callback），不放业务逻辑
```

## 数据访问

- 所有业务数据走后端 API：`src/lib/api/` 下由 OpenAPI 生成的客户端 + TanStack Query hooks。
- `@supabase/ssr` 只用于登录、会话刷新、拿 access token；不要用 supabase-js 查表。
- 服务端组件调用后端时从 cookie 取 token；客户端组件用 hook。
- 实时：`EventSource('/api/v1/events/stream')`，事件到达时让对应 query 失效重取；断线自动重连。

## 硬规则

- **不在前端算价**：不 import 任何费率常量，不做金额运算；只显示 API 返回的 `lines`/`totals`。
- 金额作为字符串展示，格式化用 `Intl.NumberFormat`，不转 `number` 再计算。
- 所有文案走 `next-intl` 字典：`messages/en.json`、`messages/zh-CN.json`；客户页只用 `en`，员工页默认 `zh-CN`。
- 识别内置浏览器（Facebook、Messenger、WhatsApp、Instagram UA），在登录前显示“在浏览器中打开”提示和复制链接按钮。

## 仓库端交互（平板）

- 扫码枪按键盘输入处理：焦点常驻扫码框，回车提交；同一件重复扫码只提示。
- 拍照：`<input type="file" accept="image/*" capture="environment">`，前端压缩（长边 1600px、WebP、≈300 KB），
  向后端要签名上传地址后直传 Storage。
- 弱网：入库请求带 `Idempotency-Key`；上传失败进 IndexedDB 队列，联网后自动重传，界面显示待上传数量。
- 标签打印：浏览器打印 4×6 模板（条码 = 内部包裹号）。
- 大按钮、单手操作；首屏 JS 尽量小；不加载任何 Google 资源（字体自托管）。

## 客户端

- 手机优先；报价页三种方式并排、无默认选中；“+GST”文字；四级价格措辞（自动报价 / 需人工复核 / 已确认应付 / 可能附加费）。
- 预报提交前必须勾选禁运品告知。
- 仓库中文地址（含会员号）一键复制；唛头写法说明 + 可打印标签。

## 测试

- Vitest + Testing Library：组件和 hooks。
- Playwright：主流程 e2e，含 iPhone 和 Pixel 视口；第 2 阶段跑“客户 + 仓库”双浏览器联动。
- 断言“前端无价格逻辑”的方式：e2e 中拦截并篡改请求参数，确认服务端结果不变（不是扫描产物里的数字）。
